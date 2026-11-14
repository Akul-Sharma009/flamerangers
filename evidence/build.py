"""Evidence build (Story 5.2): writes evidence.json from the files in evidence/scoring/.

Every number the evidence view shows is a figure read from a field in a scoring file,
named by its file and an RFC 6901 JSON pointer. Nothing is typed in and nothing is
recomputed: the build copies each value as it stands and formats it for display. The web
prints `display` and does no rounding.

    uv run python evidence/build.py           write web/src/evidence/evidence.json
    uv run python evidence/build.py --check   fail if the written file is stale, breaks
                                              the schema, or any figure differs from
                                              its source

The shape is contract/evidence.schema.json."""
import argparse
import hashlib
import json
import math
import sys
from pathlib import Path

import yaml

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
SCORING = HERE / "scoring"
CLAIMS_FILE = HERE / "claims.yaml"
SCHEMA_FILE = ROOT / "contract" / "evidence.schema.json"
OUT = ROOT / "web" / "src" / "evidence" / "evidence.json"
SCHEMA_VERSION = "1"

# The final run names the selection run it followed (`/meta/selection_result`); the
# build reads that file as the selection set. The reported-only file is the one
# claims.yaml names.
FINAL = "final_20261113T172020Z.json"

# What the evidence view shows (Story 5.4): the three candidates, baselines (a) and (b),
# and the comparator. (c) appears only against the Terra referee (Story 5.5).
APPROACHES = ["a", "b", "cmp", "4A", "1A", "C1"]
APPROACH_LABELS = {
    "a": "(a) raw splice",
    "b": "(b) one global factor",
    "cmp": "comparator, never picked",
    "4A": "4A",
    "1A": "1A",
    "C1": "C1",
    "c": "(c) Aqua only",
}
REGION_LABELS = {
    "sumatra": "Sumatra",
    "australia_grassland": "Australian grassland",
    "amazon_forest": "Amazon forest",
    "southern_africa": "Southern Africa",
    "siberia": "Siberia",
    "punjab": "Punjab",
}
SCALE_LABELS = {"0.25": "0.25°", "1": "1°", "region": "whole region"}

# Display formats. claims.yaml uses the first six; the tables use all of them.
FORMATS = {
    "pct1": lambda v: f"{v * 100:.1f}%",
    "pct1_abs": lambda v: f"{abs(v) * 100:.1f}%",
    "pct1_signed": lambda v: f"{v * 100:+.1f}%",
    "fix3": lambda v: f"{v:.3f}",
    "fix3_abs": lambda v: f"{abs(v):.3f}",
    "fix3_signed": lambda v: f"{v:+.3f}",
    "fix2": lambda v: f"{v:.2f}",
    "int": lambda v: f"{v:,}",
    "yesno": lambda v: "yes" if v else "no",
    "bool": lambda v: str(v).lower(),
    "string": lambda v: v,
}

# Columns of an approach table: (key, pointer below the region or pooled object, label,
# unit, format). A field missing at that level gives a null cell.
METRICS = [
    ("mae", "mae", "count error (MAE)", "hotspots per cell-month", "fix2"),
    ("bias", "bias", "bias", None, "pct1_signed"),
    ("abs_bias_median", "abs_bias_median", "median absolute bias across regions", None, "pct1"),
    ("cell_months", "cell_months", "cell-months", None, "int"),
    ("flags_raised", "flags/raised", "flags raised", None, "int"),
    ("flags_true", "flags/true", "flags right", None, "int"),
    ("flags_truth", "flags/truth", "true anomalies", None, "int"),
    ("precision", "flags/precision", "flag precision", None, "fix3"),
    ("recall", "flags/recall", "flag recall", None, "fix3"),
    ("spearman", "spearman", "month-rank correlation", None, "fix3"),
    ("topk_overlap", "topk_overlap", "top months overlap", None, "fix3"),
    ("topk_k", "topk_k", "top months counted", None, "int"),
    ("ranking_units", "ranking_units", "ranking units", None, "int"),
    ("year_pair_share", "year_pair_share", "year pairs in the right order", None, "fix3"),
    ("year_pairs", "year_pairs", "year pairs", None, "int"),
    ("peak_month_error", "peak_month_error", "peak month error", "months", "fix2"),
    ("season_length_diff", "season_length_diff", "season length difference", "months", "fix2"),
    ("season_unit_years", "season_unit_years", "season unit-years", None, "int"),
]

# Columns of a comparison table: each a paired difference with its interval.
COMPARISON_METRICS = [
    ("error", "count error", "pct1_signed"),
    ("abs_bias", "absolute bias", "fix3_signed"),
    ("precision", "flag precision", "fix3_signed"),
    ("spearman", "month-rank correlation", "fix3_signed"),
    ("peak_month", "peak month", "fix3_signed"),
    ("season_length", "season length", "fix3_signed"),
]
COMPARISON_NOTE = (
    "Paired difference with its 95% interval; positive means the first approach did "
    "better. Beyond noise means the interval excludes zero. Count error is the relative "
    "reduction. The number of blocks is in the run table. Intervals may be somewhat "
    "narrow on close calls."
)
TERRA = " (Terra referee)"


class EvidenceError(Exception):
    """A scoring file, claims.yaml or evidence.json does not hold what the build needs."""


# --- reading -------------------------------------------------------------------------

def load_scoring(name):
    return json.loads((SCORING / name).read_text(encoding="utf-8"))


def escape(token):
    return str(token).replace("~", "~0").replace("/", "~1")


def pointer(*tokens):
    return "".join("/" + escape(t) for t in tokens)


def resolve(doc, ptr):
    """The value an RFC 6901 pointer names in a parsed document."""
    if ptr == "":
        return doc
    if not ptr.startswith("/"):
        raise EvidenceError(f"not a JSON pointer: {ptr!r}")
    for token in ptr[1:].split("/"):
        token = token.replace("~1", "/").replace("~0", "~")
        try:
            doc = doc[int(token)] if isinstance(doc, list) else doc[token]
        except (KeyError, IndexError, ValueError, TypeError) as exc:
            raise EvidenceError(f"pointer {ptr!r} names nothing") from exc
    return doc


def sibling(ptr, name):
    return ptr.rsplit("/", 1)[0] + "/" + escape(name)


def is_number(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool)


def is_nan(v):
    return isinstance(v, float) and math.isnan(v)


# --- figures -------------------------------------------------------------------------

def figure(docs, file, ptr, fmt, name=None, interval=False):
    """A figure read from `file` at `ptr`, or None when the file holds no value (NaN)."""
    value = resolve(docs[file], ptr)
    if is_nan(value):
        return None
    check_type(value, fmt, f"{file}{ptr}")
    fig = {}
    if name:
        fig["name"] = name
    fig["value"] = value
    fig["display"] = FORMATS[fmt](value)
    if interval:
        lo = resolve(docs[file], sibling(ptr, "lo"))
        hi = resolve(docs[file], sibling(ptr, "hi"))
        fig["interval"] = {"lo": lo, "hi": hi, "display": f"{FORMATS[fmt](lo)} to {FORMATS[fmt](hi)}"}
        fig["beyond_noise"] = resolve(docs[file], sibling(ptr, "beyond_noise"))
    fig["source"] = {"file": file, "pointer": ptr}
    return fig


def check_type(value, fmt, where):
    if fmt in ("bool", "yesno"):
        ok = isinstance(value, bool)
    elif fmt == "string":
        ok = isinstance(value, str)
    elif fmt == "int":
        ok = isinstance(value, int) and not isinstance(value, bool)
    else:
        ok = is_number(value)
    if not ok:
        raise EvidenceError(f"{where}: {value!r} is not a {fmt} value")


def leaf_format(value):
    if isinstance(value, bool):
        return "yesno"
    if isinstance(value, str):
        return "string"
    if isinstance(value, int):
        return "int"
    return "fix3"


# --- claims --------------------------------------------------------------------------

def build_claims(docs, claims):
    files = claims["files"]
    out = []
    for claim in claims["claims"]:
        text = " ".join(claim["text"].split())
        figures = []
        for spec in claim["figures"]:
            where = f"claim {claim['id']}, figure {spec.get('name')!r}"
            src = spec["source"]
            if src["file"] not in files:
                raise EvidenceError(f"{where}: unknown file key {src['file']!r}")
            file = files[src["file"]]
            fmt = spec["format"]
            fig = figure(docs, file, src["pointer"], fmt, name=spec.get("name"))
            if fig is None:
                raise EvidenceError(f"{where}: the source holds no value")
            value = fig["value"]
            if fmt in ("bool", "string"):
                if value != spec["expect"] or type(value) is not type(spec["expect"]):
                    raise EvidenceError(f"{where}: source is {value!r}, the sentence relies on {spec['expect']!r}")
            if fig["display"] != spec["display"]:
                raise EvidenceError(f"{where}: source formats as {fig['display']!r}, claims.yaml says {spec['display']!r}")
            if fmt not in ("bool", "string") and spec["display"] not in text:
                raise EvidenceError(f"{where}: {spec['display']!r} is not in the sentence")
            if fmt.endswith("_abs") and (value < 0) != (spec["sign"] == "negative"):
                raise EvidenceError(f"{where}: sign of {value!r} is not {spec['sign']}")
            if "interval" in spec:
                iv = spec["interval"]
                for end in ("lo", "hi"):
                    if iv[end]["file"] != src["file"] or iv[end]["pointer"] != sibling(src["pointer"], end):
                        raise EvidenceError(f"{where}: interval {end} is not beside the value")
                fig = figure(docs, file, src["pointer"], fmt, name=spec.get("name"), interval=True)
                if fig["interval"]["display"] != iv["display"] or iv["display"] not in text:
                    raise EvidenceError(f"{where}: interval formats as {fig['interval']['display']!r}, claims.yaml says {iv['display']!r}")
            if "beyond_noise" in spec:
                bn = spec["beyond_noise"]
                if bn["file"] != src["file"] or bn["pointer"] != sibling(src["pointer"], "beyond_noise"):
                    raise EvidenceError(f"{where}: beyond_noise is not beside the value")
                if fig.get("beyond_noise") is not True:
                    raise EvidenceError(f"{where}: the sentence says beyond noise, the source does not")
            figures.append(fig)
        out.append({"id": claim["id"], "text": text, "used_for_pick": claim["used_for_pick"], "figures": figures})
    return out


# --- tables --------------------------------------------------------------------------

def metric_columns():
    return [{"key": k, "label": label, "unit": unit} for k, _, label, unit, _ in METRICS]


def approach_table(docs, file, set_key, family, scale, region):
    """One row per approach at one scale, for one region or pooled."""
    doc = docs[file]
    base = "approaches" if family == "approaches" else "terra_referee"
    names = APPROACHES + (["c"] if family == "terra" else [])
    rows = []
    for a in names:
        node = pointer(base, a, scale, "pooled") if region == "pooled" else pointer(base, a, scale, "regions", region)
        try:
            resolve(doc, node)
        except EvidenceError:
            continue
        cells = {}
        for key, sub, _, _, fmt in METRICS:
            ptr = node + "".join("/" + escape(t) for t in sub.split("/"))
            try:
                cells[key] = figure(docs, file, ptr, fmt)
            except EvidenceError:
                cells[key] = None
        rows.append({"key": a, "label": APPROACH_LABELS[a], "cells": cells})
    where = "all regions, pooled" if region == "pooled" else REGION_LABELS[region]
    title = f"{'Scores' if family == 'approaches' else 'Against the Terra referee'}, {where}, {SCALE_LABELS[scale]}"
    note = None
    if family == "terra":
        note = "Truth is Terra with its own 2003–2011 history. (c) is Aqua only; it is not scored on count error."
    return {
        "id": f"{set_key}.{family}.{scale}.{region}",
        "title": title,
        "set": set_key,
        "note": note,
        "columns": metric_columns(),
        "rows": rows,
    }


def comparison_table(docs, file, set_key, terra):
    doc = docs[file]
    rows = []
    for name in doc["comparisons"]:
        if name.endswith(TERRA) != terra:
            continue
        first, second = name.removesuffix(TERRA).split(" vs ")
        if first not in APPROACHES or second not in APPROACHES + ["c"]:
            continue
        cells = {}
        for key, _, fmt in COMPARISON_METRICS:
            ptr = pointer("comparisons", name, key, "diff")
            try:
                cells[key] = figure(docs, file, ptr, fmt, interval=True)
            except EvidenceError:
                cells[key] = None
        label = f"{APPROACH_LABELS[first]} vs {APPROACH_LABELS[second]}"
        rows.append({"key": name, "label": label + (TERRA if terra else ""), "cells": cells})
    return {
        "id": f"{set_key}.comparisons" + (".terra" if terra else ""),
        "title": "Paired differences against the Terra referee" if terra else "Paired differences",
        "set": set_key,
        "note": COMPARISON_NOTE,
        "columns": [{"key": k, "label": label, "unit": None} for k, label, _ in COMPARISON_METRICS],
        "rows": rows,
    }


def decision_table(docs, file, set_key):
    """Every test result in the file's `decisions`, one row per field."""
    rows = []

    def walk(node, path):
        if isinstance(node, dict):
            for k, v in node.items():
                walk(v, path + [k])
        elif isinstance(node, list):
            if not node:
                rows.append({"key": pointer(*path), "label": " / ".join(map(str, path[1:])) + " (none)", "cells": {"value": None}})
            for i, v in enumerate(node):
                walk(v, path + [i])
        elif node is not None:
            ptr = pointer(*path)
            rows.append({"key": ptr, "label": " / ".join(map(str, path[1:])), "cells": {"value": figure(docs, file, ptr, leaf_format(node))}})

    walk(docs[file]["decisions"], ["decisions"])
    return {
        "id": f"{set_key}.decisions",
        "title": "Test results under the rule fixed beforehand",
        "set": set_key,
        "note": None,
        "columns": [{"key": "value", "label": "result", "unit": None}],
        "rows": rows,
    }


def run_table(docs, file, set_key):
    """Blocks per region and the resampling settings. Row keys are JSON pointers, as in the
    decisions table (a plain `name.year` key reads to secret scanners as an API key)."""
    doc = docs[file]
    rows = [
        {"key": pointer("blocks", r), "label": f"blocks, {REGION_LABELS.get(r, 'all regions')}",
         "cells": {"value": figure(docs, file, pointer("blocks", r), "int")}}
        for r in doc["blocks"]
    ]
    rows.append({"key": "/draws", "label": "resampling draws", "cells": {"value": figure(docs, file, "/draws", "int")}})
    rows.append({"key": "/truth_flags_1deg", "label": "true anomalies at 1°", "cells": {"value": figure(docs, file, "/truth_flags_1deg", "int")}})
    return {
        "id": f"{set_key}.run",
        "title": "The run",
        "set": set_key,
        "note": None,
        "columns": [{"key": "value", "label": "value", "unit": None}],
        "rows": rows,
    }


def by_year_table(docs, file, set_key):
    """Count error and bias per region and year at 1°, labelled with the file's period.
    The scoring files give no period totals, so none is computed here."""
    doc = docs[file]
    columns = [{"key": "period", "label": "period", "unit": None}]
    for a in APPROACHES:
        columns.append({"key": f"{a}.mae", "label": f"{APPROACH_LABELS[a]}, count error (MAE)", "unit": "hotspots per cell-month"})
        columns.append({"key": f"{a}.bias", "label": f"{APPROACH_LABELS[a]}, bias", "unit": None})
    rows = []
    first = doc["approaches"][APPROACHES[0]]["by_year_1deg"]
    # Two shapes occur: region -> year -> {period, mae, bias} (final, reported only),
    # and year -> {period, region -> {mae, bias}} (selection).
    year_first = all(k.isdigit() for k in first)
    pairs = (
        [(r, y) for y, node in first.items() for r in node if r != "period"]
        if year_first else [(r, y) for r, years in first.items() for y in years]
    )
    for region, year in pairs:
        period = pointer(year, "period") if year_first else pointer(region, year, "period")
        cells = {"period": figure(docs, file, pointer("approaches", APPROACHES[0], "by_year_1deg") + period, "string")}
        for a in APPROACHES:
            base = pointer("approaches", a, "by_year_1deg")
            node = base + (pointer(year, region) if year_first else pointer(region, year))
            cells[f"{a}.mae"] = figure(docs, file, node + "/mae", "fix2")
            cells[f"{a}.bias"] = figure(docs, file, node + "/bias", "pct1_signed")
        rows.append({"key": pointer(region, year), "label": f"{REGION_LABELS[region]}, {year}", "cells": cells})
    return {
        "id": f"{set_key}.by_year",
        "title": "Count error and bias by year, 1°",
        "set": set_key,
        "note": "Each year is labelled with its period as the scoring file gives it. The files give no total per period.",
        "columns": columns,
        "rows": rows,
    }


def set_tables(docs, file, set_key):
    doc = docs[file]
    regions = ["pooled"] + [r for r in doc["blocks"] if r != "total"]
    tables = [run_table(docs, file, set_key), decision_table(docs, file, set_key)]
    for family in ("approaches", "terra"):
        for scale in SCALE_LABELS:
            for region in regions:
                tables.append(approach_table(docs, file, set_key, family, scale, region))
    tables.append(comparison_table(docs, file, set_key, terra=False))
    tables.append(comparison_table(docs, file, set_key, terra=True))
    if "by_year_1deg" in doc["approaches"][APPROACHES[0]]:
        tables.append(by_year_table(docs, file, set_key))
    return tables


# --- the document --------------------------------------------------------------------

def manifest_hashes():
    manifest = json.loads((SCORING / "MANIFEST.json").read_text(encoding="utf-8"))
    return {name: entry["sha256"] for name, entry in manifest["files"].items()}


def input_files(claims):
    final = load_scoring(FINAL)
    selection = Path(final["meta"]["selection_result"]).name
    reported_only = claims["files"]["reported_only"]
    if claims["files"]["final"] != FINAL:
        raise EvidenceError("claims.yaml and the build name different final files")
    return {"selection": selection, "final": FINAL, "reported_only": reported_only}


def build():
    """The evidence document, built from the scoring files and claims.yaml."""
    claims = yaml.safe_load(CLAIMS_FILE.read_text(encoding="utf-8"))
    sets = input_files(claims)
    hashes = manifest_hashes()
    docs, sources = {}, []
    for set_key, file in sets.items():
        if file not in hashes:
            raise EvidenceError(f"{file} is not in the manifest")
        digest = hashlib.sha256((SCORING / file).read_bytes()).hexdigest()
        if digest != hashes[file]:
            raise EvidenceError(f"{file} does not match its manifest hash")
        docs[file] = load_scoring(file)
        meta = docs[file].get("meta", {})
        sources.append({"file": file, "sha256": digest, "set": set_key, "label": docs[file]["label"], "run_id": meta.get("run_id")})
    tables = []
    for set_key, file in sets.items():
        tables.extend(set_tables(docs, file, set_key))
    return {
        "schema_version": SCHEMA_VERSION,
        "sources": sources,
        "claims": build_claims(docs, claims),
        "tables": tables,
    }


def dumps(doc):
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n"


# --- the check -----------------------------------------------------------------------

def iter_figures(doc):
    for claim in doc["claims"]:
        for fig in claim["figures"]:
            yield f"claim {claim['id']}", fig
    for table in doc["tables"]:
        for row in table["rows"]:
            for key, fig in row["cells"].items():
                if fig is not None:
                    yield f"table {table['id']}, row {row['key']}, {key}", fig


def same(a, b):
    return type(a) is type(b) and a == b


def check_figures(doc):
    """Problems where a figure in `doc` differs from the field it names."""
    files = {s["file"] for s in doc["sources"]}
    docs = {f: load_scoring(f) for f in files}
    problems = []
    for where, fig in iter_figures(doc):
        src = fig["source"]
        if src["file"] not in docs:
            problems.append(f"{where}: {src['file']} is not a listed source")
            continue
        try:
            value = resolve(docs[src["file"]], src["pointer"])
            if not same(fig["value"], value):
                problems.append(f"{where}: {fig['value']!r} but {src['file']}{src['pointer']} holds {value!r}")
            if fig.get("interval") is not None:
                for end in ("lo", "hi"):
                    held = resolve(docs[src["file"]], sibling(src["pointer"], end))
                    if not same(fig["interval"][end], held):
                        problems.append(f"{where}: interval {end} {fig['interval'][end]!r} but the file holds {held!r}")
            if fig.get("beyond_noise") is not None:
                held = resolve(docs[src["file"]], sibling(src["pointer"], "beyond_noise"))
                if not same(fig["beyond_noise"], held):
                    problems.append(f"{where}: beyond_noise {fig['beyond_noise']!r} but the file holds {held!r}")
        except EvidenceError as exc:
            problems.append(f"{where}: {exc}")
    return problems


def shown(path):
    return str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path)


def check(path=None):
    """Problems with the evidence.json at `path` (default: the written one); empty when
    it is current and every figure matches its source."""
    import jsonschema

    path = OUT if path is None else path
    if not path.exists():
        return [f"{shown(path)} does not exist; run the build"]
    text = path.read_text(encoding="utf-8")
    doc = json.loads(text)
    schema = json.loads(SCHEMA_FILE.read_text(encoding="utf-8"))
    problems = [f"schema: {e.message} at {list(e.absolute_path)}" for e in jsonschema.Draft202012Validator(schema).iter_errors(doc)]
    hashes = manifest_hashes()
    for s in doc.get("sources", []):
        if hashes.get(s["file"]) != s["sha256"]:
            problems.append(f"source {s['file']}: hash differs from the manifest")
        elif hashlib.sha256((SCORING / s["file"]).read_bytes()).hexdigest() != s["sha256"]:
            problems.append(f"source {s['file']}: file differs from its hash")
    if not problems:
        problems += check_figures(doc)
    try:
        fresh = dumps(build())
    except EvidenceError as exc:
        problems.append(f"build: {exc}")
    else:
        if fresh != text:
            problems.append(f"{shown(path)} is not what the build writes; run the build")
    return problems


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="check the written file instead of writing it")
    args = parser.parse_args(argv)
    if args.check:
        problems = check()
        if problems:
            print("\n".join(problems), file=sys.stderr)
            print(f"Evidence check FAILED: {len(problems)} problem(s).", file=sys.stderr)
            return 1
        print("Evidence check passed.")
        return 0
    try:
        doc = build()
    except EvidenceError as exc:
        print(f"Evidence build FAILED: {exc}", file=sys.stderr)
        return 1
    problems = check_figures(doc)
    if problems:
        print("\n".join(problems), file=sys.stderr)
        print("Evidence build FAILED; nothing written.", file=sys.stderr)
        return 1
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(dumps(doc), encoding="utf-8")
    n = sum(1 for _ in iter_figures(doc))
    print(f"Wrote {shown(OUT)}: {len(doc['claims'])} claims, {len(doc['tables'])} tables, {n} figures.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
