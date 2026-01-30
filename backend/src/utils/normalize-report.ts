import type { NormalizedReport } from "../types/reports.js";

/**
 * Flatten QBO Reports API response to { headers, rows } for Excel.
 * Handles Columns.Column, Rows.Row, and nested Summary/Group with ColData.
 */
export function normalizeReport(report: unknown): NormalizedReport {
  const r = report as {
    Columns?: { Column?: { ColTitle?: string }[] };
    Rows?: {
      Row?: { ColData?: { value?: string | number }[]; Summary?: unknown; Group?: unknown }[];
    };
  };
  const headers: string[] = [];
  const rows: (string | number)[][] = [];

  if (r?.Columns?.Column) {
    for (const c of r.Columns.Column) {
      headers.push(c.ColTitle ?? "");
    }
  }

  function pushRow(row: { ColData?: { value?: string | number }[] }) {
    if (row?.ColData) {
      rows.push(row.ColData.map((cell) => cell?.value ?? ""));
    }
  }

  const rowList = r?.Rows?.Row;
  if (rowList) {
    const rowsArray = Array.isArray(rowList) ? rowList : [rowList];
    for (const row of rowsArray) {
      pushRow(row);
      const group = (row as { Group?: { Row?: unknown } }).Group;
      if (group?.Row) {
        const subRows = Array.isArray(group.Row) ? group.Row : [group.Row];
        for (const sub of subRows) {
          pushRow(sub as { ColData?: { value?: string | number }[] });
        }
      }
    }
  }

  return { headers, rows };
}
