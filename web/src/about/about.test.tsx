import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import metaJson from "../../../contract/fixture/meta.json";
import type { Meta } from "../api/client";
import { messages } from "../api/messages";
import { Masthead } from "../components/Masthead";
import evidenceJson from "../evidence/evidence.json";
import type { Evidence } from "../evidence/types";
import { ROUTES, routeFromHash } from "../route";
import { ABOUT_CLAIMS, SATELLITES, aboutClaims, aboutValues, countingLimits, fill } from "./about";
import { AboutView } from "./AboutView";
import { CITATIONS, FIRMS_ACKNOWLEDGEMENT } from "./citations";
import { COPY, TYPED_NUMBERS } from "./copy";

const evidence = evidenceJson as unknown as Evidence;
const meta = metaJson as unknown as Meta;
const claims = aboutClaims(evidence);
const REPO = "https://example.org/owner/repo";

/** Rendered page as plain text: tags dropped, entities decoded. */
function text(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ");
}

const render = (m: Meta = meta, repoUrl: string | null = REPO, limits = countingLimits()) =>
  renderToStaticMarkup(<AboutView meta={m} claims={claims} repoUrl={repoUrl} limits={limits} />);
/** The page's own limits, as shown while the contract has no list. */
const PAGE_LIMITS = countingLimits({});
const html = render();
const page = text(html);

/** The text of one section of the page, by its id. */
function section(id: string): string {
  const m = html.match(new RegExp(`<section id="${id}"[\\s\\S]*?</section>`));
  if (!m) throw new Error(`no section ${id}`);
  return text(m[0]);
}

function claimText(id: string): string {
  const c = evidence.claims.find((x) => x.id === id);
  if (!c) throw new Error(id);
  return c.text;
}

/** Every string in COPY, however deeply nested. */
function allCopy(x: unknown): string[] {
  if (typeof x === "string") return [x];
  if (Array.isArray(x)) return x.flatMap(allCopy);
  if (x && typeof x === "object") return Object.values(x).flatMap(allCopy);
  return [];
}

// A different store, so nothing on the page can be typed in to match the fixture.
const otherMeta: Meta = {
  ...meta,
  record_version: "20990101-feedbeef",
  data_through: "2031-05-17",
  unit_label: "test unit label",
  record_start: "2001-03",
  record_switch: { aqua_through: "2023-06", viirs_from: "2023-07" },
  satellite_switch: { snpp_through: "2030-08-09", noaa20_from: "2030-08-10" },
};

describe("Story 5.7 AC1: the page explains the data from any view", () => {
  it("every view's masthead links to the page", () => {
    const about = ROUTES.find((r) => r.id === "about")!;
    expect(routeFromHash(about.hash)).toBe("about");
    for (const r of ROUTES) {
      const mast = renderToStaticMarkup(<Masthead route={r.id} />);
      expect(mast).toContain(`href="${about.hash}"`);
      expect(text(mast)).toContain(about.label);
    }
  });

  it("explains the sources: FIRMS, MODIS and VIIRS, and each satellite's part by the served dates", () => {
    const s = section("sources");
    expect(s).toContain("FIRMS");
    expect(s).toMatch(/MODIS/);
    expect(s).toMatch(/VIIRS/);
    for (const id of SATELLITES) {
      expect(html).toContain(`data-satellite="${id}"`);
      expect(s).toContain(messages.labels.satellite[id]);
    }
    const v = aboutValues(meta);
    for (const k of ["record_start", "aqua_through", "viirs_from", "snpp_through", "noaa20_from"]) {
      expect(s).toContain(v[k]);
    }
  });

  it("explains the record switch and why it sits at the end of 2021, quoting the fixed claim", () => {
    const s = section("switch");
    expect(s).toContain(messages.notes.record_switch);
    expect(s).toContain(messages.notes.satellite_switch);
    expect(html).toContain(`data-claim="${ABOUT_CLAIMS.switch}"`);
    expect(s).toContain(claimText(ABOUT_CLAIMS.switch));
    expect(s).toContain("December 2021"); // from meta.record_switch.aqua_through
    expect(s).toMatch(/drifting from their orbits/);
  });

  it("explains the count unit and that a hotspot is not a fire", () => {
    const s = section("unit");
    expect(page).toContain(messages.notes.hotspot_definition);
    expect(s).toContain(`one unit: ${meta.unit_label}.`);
    expect(s).toContain("A hotspot is not a fire.");
    expect(s).toContain(messages.labels.source.aqua_real);
    expect(s).toContain(messages.labels.source.viirs_converted);
  });

  it("states the cleaning rules and where they differ from the validation's", () => {
    const s = section("cleaning");
    for (const rule of COPY.cleaning.rules) expect(s).toContain(rule);
    expect(s).toContain(messages.labels.excluded_reason.offshore);
    expect(s).toContain(messages.labels.excluded_reason.static);
    expect(s).toContain(COPY.cleaning.diffHeading);
    expect(html).toContain('data-section="cleaning-differences"');
    expect(s).toMatch(/only inside the regions the conversion was tuned on/);
    expect(s).toMatch(/standard-quality data from Suomi NPP only/);
    // The Sumatra comparison is linked when the repo's address is known, and only named otherwise.
    expect(html).toContain(`${REPO}/blob/master/docs/cleaning-differences.md`);
    expect(render(meta, null)).not.toContain("/blob/master/");
  });

  it("explains standard against near-real-time data with the contract's quality sentences", () => {
    const s = section("quality");
    expect(s).toContain(messages.labels.quality.SP);
    expect(s).toContain(messages.labels.quality.NRT);
    expect(s).toMatch(/two to three months later/);
    expect(s).toMatch(/validation used standard-quality data only/);
  });

  it("says NOAA-20 and NOAA-21 are not covered by the validation", () => {
    const s = section("validation");
    expect(html).toContain(`data-claim="${ABOUT_CLAIMS.validation}"`);
    expect(s).toContain(claimText(ABOUT_CLAIMS.validation));
    expect(s).toContain(`${messages.labels.satellite.NOAA21} is not covered either.`);
    expect(s).toContain(messages.notes.validated_satellite_false);
    expect(s).toContain(messages.notes.monthly_validation_only);
  });

  it("says a NOAA-20 month may read high only when the served comparison reads higher", () => {
    const figures = (bias_pct: number) => ({ mean_abs_difference: 5, bias_pct, cell_months: 10 });
    const withCheck = (bias_pct: number) =>
      ({ ...meta, noaa20_check: { reported_only: true, validated_against_aqua: false, period_start: "2022-01", period_end: "2026-10", pooled: figures(bias_pct), regions: [] } }) as unknown as Meta;
    const note = (h: string) => h.match(/<p data-note="noaa20_high">([\s\S]*?)<\/p>/);

    expect(meta.noaa20_check).toBeNull();
    expect(note(html)).toBeNull();
    expect(note(render(withCheck(-1)))).toBeNull();

    const shown = note(render(withCheck(7.2)))!;
    const words = text(shown[1]!);
    expect(words).toContain(`${messages.labels.satellite.NOAA20}, such as the current month, may read high`);
    expect(words).toContain("are on the evidence page");
    expect(shown[1]).toContain(`<a href="${ROUTES.find((r) => r.id === "evidence")!.hash}">${COPY.validation.noaa20Link}</a>`);
    expect(words).not.toMatch(/7\.2|%/); // no figure typed: they are on the evidence page
  });

  it("explains detection limits under cloud and smoke", () => {
    const s = section("detection");
    expect(s).toMatch(/Thick cloud hides the ground/);
    expect(s).toMatch(/Heavy smoke can also hide burning/);
    expect(s).toMatch(/haze/);
  });
});

describe("Story 5.7 AC2: the counting limits, record version, sources and evidence link", () => {
  it("lists all six counting limits from the PRD, numbered", () => {
    const s = section("limits");
    const items = html.match(/<ol class="limits"[^>]*>([\s\S]*?)<\/ol>/)![1].match(/<li>/g) ?? [];
    expect(items).toHaveLength(6);
    for (const phrase of [
      /no cloud or missing-data information, and do not remove detections duplicated by overlapping orbits/,
      /Confidence values are not comparable between sensors/,
      /day\/night flag is set differently in near-real-time data .* and in standard data/,
      /Terra and Aqua are drifting from their orbits, which is one reason the record switch sits after December 2021/,
      /Early VIIRS data, in 2012 and 2013, had bad scans/,
      /No cropland region was used to tune or choose the method/,
    ]) {
      expect(s).toMatch(phrase);
    }
  });

  it("states the record version served by /meta", () => {
    expect(html).toContain(`data-fact="record_version"><code>${meta.record_version}</code>`);
  });

  it("lists every data source with its Story 6.1 citation and links, and the FIRMS acknowledgement", () => {
    const sources = COPY.margin.sources;
    expect(sources.map((s) => s.id)).toEqual(["modis", "viirs", "viirs-swath", "natural-earth"]);
    for (const s of sources) {
      expect(html).toContain(`data-source="${s.id}"`);
      const c = CITATIONS[s.id];
      expect(c.links.length).toBeGreaterThan(0);
      expect(text(html)).toContain(c.text);
      for (const l of c.links) {
        expect(l.href).toMatch(/^https:\/\//);
        expect(html).toContain(`href="${l.href}"`);
      }
    }
    expect(html).not.toContain("[pending");
    expect(text(html)).toContain(FIRMS_ACKNOWLEDGEMENT);
    // Every satellite whose hotspots the site uses belongs to a listed dataset. NOAA-21's are
    // not downloaded (Story 6.1), so it is named on the page but cited nowhere.
    const covered = new Set<string>(sources.flatMap((s) => s.satellites));
    for (const id of SATELLITES) expect(covered.has(id)).toBe(id !== "NOAA21");
  });

  it("links to the evidence view", () => {
    const evidenceHash = ROUTES.find((r) => r.id === "evidence")!.hash;
    expect(html).toContain(`href="${evidenceHash}" data-link="evidence"`);
    expect(routeFromHash(evidenceHash)).toBe("evidence");
  });
});

describe("Story 5.7: numbers, words and claims", () => {
  it("every date, version and unit on the page comes from /meta, not the copy", () => {
    // The page's own limits fill a date from /meta; the contract's list (0.4.0) types its own.
    const other = text(render(otherMeta, REPO, PAGE_LIMITS));
    for (const s of ["20990101-feedbeef", "17 May 2031", "test unit label", "March 2001", "June 2023", "July 2023", "9 August 2030", "10 August 2030"]) {
      expect(other).toContain(s);
    }
    // The contract's two switch sentences carry their own dates; nothing else may.
    // So does the fixed claim on why Aqua is kept through 2021.
    const rest = other
      .replace(messages.notes.record_switch, "")
      .replace(messages.notes.satellite_switch, "")
      .replace(claimText(ABOUT_CLAIMS.switch), "");
    for (const s of ["20261114-1a2b3c4d", "13 November 2026", "July 2002", "December 2021", "January 2022", "2 November 2026", "3 November 2026"]) {
      expect(rest).not.toContain(s);
    }
  });

  it("the copy types no digit beyond the fixed rules it names", () => {
    const allowed = new Set<string>(TYPED_NUMBERS);
    const names = Object.values(messages.labels.satellite).concat(["NOAA-20", "NOAA-21", "C1"], SATELLITES);
    for (const s of allCopy(COPY)) {
      let rest = s.replace(/\{[a-z0-9_]+\}/g, "");
      for (const n of names) rest = rest.split(n).join("");
      for (const d of rest.match(/\d+(?:\.\d+)?/g) ?? []) expect(allowed, `${d} in "${s}"`).toContain(d);
    }
  });

  it("every placeholder in the copy has a value", () => {
    const v = aboutValues(meta);
    for (const s of allCopy(COPY)) expect(() => fill(s, v)).not.toThrow();
    expect(page).not.toMatch(/\{[a-z0-9_]+\}/);
  });

  it('says "hotspots", never "fires"', () => {
    // Official product names and the FIRMS acknowledgement are quoted as published (the lead, 15 Nov):
    // they are removed exactly, so every other sentence still follows the rule.
    let own = page.split(FIRMS_ACKNOWLEDGEMENT).join("");
    for (const c of Object.values(CITATIONS)) own = own.split(c.text).join("");
    for (const c of Object.values(CITATIONS)) for (const l of c.links) own = own.split(l.href).join("");
    expect(own).not.toMatch(/\bfires\b/i);
    // "fire" appears only in "not a fire" and in the names of FIRMS and its products.
    const rest = own
      .replace(/not a fire/g, "")
      .replace(/Fire Information for Resource Management System/g, "")
      .replace(/active-fire/g, "");
    expect(rest).not.toMatch(/\bfire\b/i);
  });

  it("quotes only the two fixed claims about results, word for word", () => {
    const quoted = [...html.matchAll(/data-claim="([^"]+)"/g)].map((m) => m[1]);
    expect(quoted).toEqual([ABOUT_CLAIMS.switch, ABOUT_CLAIMS.validation]);
    expect(claims.switch).toBe(claimText(ABOUT_CLAIMS.switch));
    expect(claims.validation).toBe(claimText(ABOUT_CLAIMS.validation));
  });

  it("a claim missing from evidence.json shows the contract's sentence, not a stand-in", () => {
    const out = text(renderToStaticMarkup(<AboutView meta={meta} claims={{ switch: null, validation: claims.validation }} repoUrl={null} />));
    expect(out).toContain(messages.client.evidence_unavailable);
    expect(out).not.toContain(claimText(ABOUT_CLAIMS.switch));
  });
});

describe("Story 5.7: the counting limits come from the contract once it has them", () => {
  const limitItems = (h: string) =>
    [...h.match(/<ol class="limits"[^>]*>([\s\S]*?)<\/ol>/)![1].matchAll(/<li>([\s\S]*?)<\/li>/g)].map((m) => text(m[1]).trim());

  it("with a list in the contract, the page shows exactly those items, in order", () => {
    const list = ["Second test limit, typed in the contract.", "First test limit.", "A third one."];
    const limits = countingLimits({ counting_limits: list });
    expect(limits.from).toBe("contract");
    const h = render(meta, REPO, limits);
    expect(h).toContain('data-from="contract"');
    expect(limitItems(h)).toEqual(list);
    for (const item of COPY.limits.items) expect(text(h)).not.toContain(fill(item, aboutValues(meta)));
  });

  it("without one, the page shows its own six, filled from /meta", () => {
    for (const source of [{}, { counting_limits: [] }, { counting_limits: ["ok", 3] }, { counting_limits: [" "] }, { counting_limits: "a string" }]) {
      expect(countingLimits(source).from).toBe("page");
    }
    const h = render(meta, REPO, PAGE_LIMITS);
    expect(h).toContain('data-from="page"');
    expect(limitItems(h)).toEqual(COPY.limits.items.map((i) => fill(i, aboutValues(meta))));
    expect(limitItems(h)).toHaveLength(6);
  });

  it("by default the page reads the contract it was built with", () => {
    const fromContract = Array.isArray((messages as unknown as { counting_limits?: unknown }).counting_limits);
    expect(countingLimits().from).toBe(fromContract ? "contract" : "page");
    expect(html).toContain(`data-from="${countingLimits().from}"`);
  });
});
