import { getDemoReports } from "./demo-reports.js";

describe("getDemoReports", () => {
  it("returns pnl, bs, and cash with headers and rows", () => {
    const { pnl, bs, cash } = getDemoReports();
    expect(pnl.headers).toEqual(["", "Jan 1 - Dec 31, 2025"]);
    expect(pnl.rows.length).toBeGreaterThan(0);
    expect(bs.headers).toEqual(["", "As of Dec 31, 2025"]);
    expect(bs.rows.length).toBeGreaterThan(0);
    expect(cash.headers).toEqual(["", "Jan 1 - Dec 31, 2025"]);
    expect(cash.rows.length).toBeGreaterThan(0);
  });

  it("pnl contains expected demo line items", () => {
    const { pnl } = getDemoReports();
    const flat = pnl.rows.flat().join(" ");
    expect(flat).toContain("Income");
    expect(flat).toContain("Net Income");
  });

  it("bs contains Total Assets and Total Liabilities", () => {
    const { bs } = getDemoReports();
    const flat = bs.rows.flat().join(" ");
    expect(flat).toContain("Total Assets");
    expect(flat).toContain("Total Liabilities");
  });

  it("cash contains Operating and Net Change", () => {
    const { cash } = getDemoReports();
    const flat = cash.rows.flat().join(" ");
    expect(flat).toContain("Operating");
    expect(flat).toContain("Net Change in Cash");
  });
});
