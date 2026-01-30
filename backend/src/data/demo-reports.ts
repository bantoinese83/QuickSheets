import type { NormalizedReport } from "../types/reports.js";

/**
 * Static demo data for /api/refresh when demo=true or when user has no QBO connection.
 * Use to validate the add-in flow before wiring real QuickBooks.
 */
export function getDemoReports(): {
  pnl: NormalizedReport;
  bs: NormalizedReport;
  cash: NormalizedReport;
} {
  const pnl: NormalizedReport = {
    headers: ["", "Jan 1 - Dec 31, 2025"],
    rows: [
      ["Income", ""],
      ["Gross Profit", "$125,000.00"],
      ["Operating Expenses", ""],
      ["Net Operating Income", "$45,000.00"],
      ["Other Income/Expense", ""],
      ["Net Income", "$42,000.00"],
    ],
  };

  const bs: NormalizedReport = {
    headers: ["", "As of Dec 31, 2025"],
    rows: [
      ["ASSETS", ""],
      ["Total Assets", "$285,000.00"],
      ["LIABILITIES AND EQUITY", ""],
      ["Total Liabilities", "$80,000.00"],
      ["Total Equity", "$205,000.00"],
      ["Total Liabilities and Equity", "$285,000.00"],
    ],
  };

  const cash: NormalizedReport = {
    headers: ["", "Jan 1 - Dec 31, 2025"],
    rows: [
      ["Operating Activities", ""],
      ["Net Cash from Operations", "$38,000.00"],
      ["Investing Activities", ""],
      ["Net Cash from Investing", "-$5,000.00"],
      ["Financing Activities", ""],
      ["Net Cash from Financing", "-$10,000.00"],
      ["Net Change in Cash", "$23,000.00"],
    ],
  };

  return { pnl, bs, cash };
}
