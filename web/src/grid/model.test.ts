import { describe, expect, it } from "vitest";
import calendarJson from "../../../contract/fixture/calendar.json";
import metaJson from "../../../contract/fixture/meta.json";
import { buildGridModel, type Calendar, type Meta } from "./model";

const calendar = calendarJson as unknown as Calendar;
const meta = metaJson as unknown as Meta;
const model = buildGridModel(calendar, meta);

describe("buildGridModel", () => {
  it("has 25 rows, newest first, 12 cells each", () => {
    expect(model.rows).toHaveLength(25);
    expect(model.rows[0].year).toBe(2026);
    expect(model.rows[24].year).toBe(2002);
    for (const r of model.rows) expect(r.cells).toHaveLength(12);
  });
  it("marks 2002 Jan-Jun outside the record", () => {
    const row = model.rows[24];
    for (const c of row.cells.slice(0, 6)) {
      expect(c.count).toBeNull();
      expect(c.nullReason).toBe("outside_record");
    }
  });
  it("flags month to date", () => {
    const c = model.rows[0].cells.find((x) => x.month === "2026-11");
    expect(c?.monthToDate).toBe(true);
  });
  it("finds the switch year and top ranks", () => {
    expect(model.switchYear).toBe(2022);
    expect(model.rows.find((r) => r.year === 2015)?.total?.topRank).toBe(1);
    expect(model.rows.find((r) => r.year === 2003)?.total?.topRank).toBeNull();
  });
  it("passes counts and flags through unchanged", () => {
    const served = new Map(calendar.months.map((m) => [m.month, m]));
    for (const r of model.rows)
      for (const c of r.cells) {
        const m = served.get(c.month)!;
        expect(c.count).toBe(m.count);
        if ((m.cells_flagged_strong ?? 0) > 0) expect(c.flag).toBe("strong");
      }
  });
  it("builds medians and classes", () => {
    expect(model.medians).toHaveLength(12);
    expect(model.classes).toHaveLength(7);
  });
});
