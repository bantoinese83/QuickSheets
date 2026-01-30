import { normalizeReport } from "./normalize-report.js";

describe("normalizeReport", () => {
  it("extracts headers from Columns.Column", () => {
    const report = {
      Columns: { Column: [{ ColTitle: "Name" }, { ColTitle: "Amount" }] },
      Rows: { Row: [] },
    };
    const out = normalizeReport(report);
    expect(out.headers).toEqual(["Name", "Amount"]);
    expect(out.rows).toEqual([]);
  });

  it("extracts rows from Rows.Row ColData", () => {
    const report = {
      Columns: { Column: [{ ColTitle: "A" }, { ColTitle: "B" }] },
      Rows: {
        Row: [
          { ColData: [{ value: "Income" }, { value: 1000 }] },
          { ColData: [{ value: "Expense" }, { value: 200 }] },
        ],
      },
    };
    const out = normalizeReport(report);
    expect(out.headers).toEqual(["A", "B"]);
    expect(out.rows).toEqual([
      ["Income", 1000],
      ["Expense", 200],
    ]);
  });

  it("handles single Row (object not array)", () => {
    const report = {
      Columns: { Column: [{ ColTitle: "X" }] },
      Rows: { Row: { ColData: [{ value: "Only" }] } },
    };
    const out = normalizeReport(report);
    expect(out.rows).toEqual([["Only"]]);
  });

  it("handles Group.Row nested rows", () => {
    const report = {
      Columns: { Column: [{ ColTitle: "Col" }] },
      Rows: {
        Row: [
          { ColData: [{ value: "Header" }], Group: { Row: [{ ColData: [{ value: "Sub1" }] }] } },
        ],
      },
    };
    const out = normalizeReport(report);
    expect(out.rows).toEqual([["Header"], ["Sub1"]]);
  });

  it("returns empty headers and rows for empty input", () => {
    const out = normalizeReport({});
    expect(out.headers).toEqual([]);
    expect(out.rows).toEqual([]);
  });

  it("returns empty for null/undefined report", () => {
    const out = normalizeReport(null as unknown);
    expect(out.headers).toEqual([]);
    expect(out.rows).toEqual([]);
  });
});
