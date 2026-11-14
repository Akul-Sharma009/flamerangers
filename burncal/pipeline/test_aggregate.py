"""Story 2.5: the aggregate step on a small synthetic record, and threshold parity on the Sumatra store."""
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from burncal.pipeline import aggregate

ROOT = Path(__file__).resolve().parents[2]
SUMATRA_RECORD = ROOT / "store" / "record" / "sumatra"


def _record(rows):
    df = pd.DataFrame(rows, columns=["satellite", "when", "longitude", "latitude", "excluded_reason", "feeds_record", "weight"])
    df["acq_datetime_utc"] = pd.to_datetime(df.pop("when"), utc=True)
    df["utc_date"] = df["acq_datetime_utc"].dt.date
    return df


ROWS = [
    ("AQUA", "2005-03-01 06:00", 101.1, -1.9, "none", True, 1.0),
    ("AQUA", "2005-03-02 06:00", 101.9, -1.1, "none", True, 1.0),
    ("AQUA", "2005-03-02 06:00", 101.9, -1.1, "static", True, 0.0),
    ("TERRA", "2005-03-02 03:00", 101.9, -1.1, "none", False, 0.0),
    ("SNPP", "2023-03-02 06:00", 101.1, -1.9, "none", True, 0.4),
    ("SNPP", "2023-03-02 06:00", 101.1, -1.9, "offshore", True, 0.0),
]


def test_2_5_ac1_cell_month_sums_for_count_and_raw_satellites():
    g1 = aggregate.cell_months(_record(ROWS), 1.0)
    r = g1[(g1.sw_lon == 101.0) & (g1.sw_lat == -2.0) & (g1.year == 2005) & (g1.month == 3)].iloc[0]
    assert r["count"] == 2.0 and r["raw_aqua"] == 2 and r["raw_terra"] == 1 and r["raw_snpp"] == 0
    r = g1[(g1.year == 2023)].iloc[0]
    assert r["count"] == pytest.approx(0.4) and r["raw_snpp"] == 1  # the offshore row is not in any count
    g025 = aggregate.cell_months(_record(ROWS), 0.25)
    assert set(zip(g025.sw_lon, g025.sw_lat)) == {(101.0, -2.0), (101.75, -1.25)}
    assert g025["count"].sum() == pytest.approx(g1["count"].sum())


def test_2_5_ac2_and_ac3_thresholds_and_dense_flags_cover_every_cell():
    cells = pd.DataFrame({"sw_lon": [101.0, 102.0], "sw_lat": [-2.0, -2.0]})
    g1 = aggregate.cell_months(_record(ROWS), 1.0)
    thr = aggregate.thresholds_1deg(g1, cells)
    assert len(thr) == 2 * 12 and (thr["threshold"] >= 0).all()
    flags = aggregate.flags_1deg(g1, thr, cells, data_through=date(2023, 3, 2))
    assert len(flags) == 2 * (2023 - 2002 + 1) * 12
    f = flags.set_index(["sw_lon", "sw_lat", "year", "month"])
    assert f.loc[(101.0, -2.0, 2002, 6), "flag_state"] == "outside_record"
    assert f.loc[(101.0, -2.0, 2023, 4), "flag_state"] == "outside_record"
    assert f.loc[(102.0, -2.0, 2010, 1), "flag_state"] == "not_flaggable" and f.loc[(102.0, -2.0, 2010, 1), "count"] == 0
    assert bool(f.loc[(101.0, -2.0, 2002, 7), "provisional"]) and bool(f.loc[(101.0, -2.0, 2023, 3), "provisional"])
    assert bool(f.loc[(101.0, -2.0, 2005, 3), "reference_year"]) and not bool(f.loc[(101.0, -2.0, 2023, 3), "reference_year"])


@pytest.mark.skipif(not SUMATRA_RECORD.exists(), reason="Sumatra record not built (store/ is git-ignored)")
def test_2_5_ac2_sumatra_thresholds_match_the_parity_targets():
    got = aggregate.tuning_thresholds_parity("sumatra", SUMATRA_RECORD)
    assert got["cells"] == 75 and got["cell_months"] == 900
    # KNOWN, open with the lead: September at 105E 6S. FIRMS gives 41 Aqua rows for September 2006
    # where the harness history has 39 (Sumatra September 2003-2011: 36,686 against the stored 36,684).
    # Every other cell-month matches within 1e-6. See DECISIONS.md.
    assert got["misses"] == [(105.0, -6.0, 9, 21.0, 20.6)], got
