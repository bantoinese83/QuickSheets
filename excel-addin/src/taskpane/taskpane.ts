/* global Office */

const API_BASE =
  (typeof window !== "undefined" &&
    (window as unknown as { __API_BASE__?: string }).__API_BASE__) ||
  "https://localhost:3000";

interface NormalizedReport {
  headers: string[];
  rows: (string | number)[][];
}

Office.onReady(() => {
  const connectBtn = document.getElementById("connect-qbo") as HTMLButtonElement;
  const tryDemoBtn = document.getElementById("try-demo") as HTMLButtonElement;
  const refreshBtn = document.getElementById("refresh") as HTMLButtonElement;
  const statusEl = document.getElementById("status");

  if (!connectBtn || !refreshBtn || !statusEl) return;

  connectBtn.onclick = connectQBO;
  tryDemoBtn.onclick = tryDemo;
  refreshBtn.onclick = refreshReports;
});

function openAuthDialog(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Office.context.ui.displayDialogAsync(url, { height: 50, width: 30 }, (result) => {
      if (result.status !== Office.AsyncResultStatus.Succeeded) {
        reject(new Error("Failed to open dialog"));
        return;
      }
      const dialog = result.value;
      dialog.addEventHandler(
        Office.EventType.DialogMessageReceived,
        (arg: { message: string; origin?: string } | { error: number }) => {
          if ("message" in arg && arg.message === "connected") {
            dialog.close();
            (document.getElementById("refresh") as HTMLButtonElement).disabled = false;
            (document.getElementById("status") as HTMLElement).textContent = "Connected.";
            (document.getElementById("status") as HTMLElement).className = "connected";
            resolve();
          }
        }
      );
    });
  });
}

async function connectQBO(): Promise<void> {
  await openAuthDialog(`${API_BASE}/auth/qbo?dialog=true`);
}

async function tryDemo(): Promise<void> {
  await openAuthDialog(`${API_BASE}/auth/demo?dialog=true`);
}

async function refreshReports(): Promise<void> {
  const statusEl = document.getElementById("status");
  if (statusEl) statusEl.textContent = "Refreshing...";

  const year = new Date().getFullYear();
  const endDate = new Date().toISOString().slice(0, 10);
  const startDate = `${year}-01-01`;

  const resp = await fetch(`${API_BASE}/api/refresh`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reports: ["pnl", "balance_sheet", "cash_flow"],
      startDate,
      endDate,
      basis: "Accrual",
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ message: resp.statusText }));
    if (statusEl) statusEl.textContent = `Error: ${err.message ?? resp.statusText}`;
    return;
  }

  const data = (await resp.json()) as {
    pnl?: NormalizedReport;
    bs?: NormalizedReport;
    cash?: NormalizedReport;
  };

  await Excel.run(async (context: Excel.RequestContext) => {
    if (data.pnl) await writeSheet(context, "QS_PnL", data.pnl);
    if (data.bs) await writeSheet(context, "QS_BS", data.bs);
    if (data.cash) await writeSheet(context, "QS_CashFlow", data.cash);
    await context.sync();
  });

  if (statusEl) statusEl.textContent = "Done.";
}

async function writeSheet(
  context: Excel.RequestContext,
  name: string,
  report: NormalizedReport
): Promise<void> {
  const sheets = context.workbook.worksheets;
  let sheet = sheets.getItemOrNullObject(name);
  sheet.load("name");

  await context.sync();

  if ((sheet as Excel.Worksheet & { isNullObject?: boolean }).isNullObject) {
    sheet = sheets.add(name);
    await context.sync();
  }

  const rowCount = report.rows.length + 1;
  const colCount = Math.max(report.headers.length, ...report.rows.map((r) => r.length));
  if (rowCount < 1 || colCount < 1) return;

  const range = sheet.getRangeByIndexes(0, 0, rowCount, colCount);
  const values: (string | number)[][] = [report.headers, ...report.rows];
  range.values = values as string[][];
}
