import { Router, Request, Response } from "express";
import { getDemoReports } from "../data/demo-reports.js";
import { requireSession } from "../middleware/session.js";
import { hasActiveSubscription } from "../services/stripe.js";
import { getConnectionForUser } from "../services/tokens.js";
import {
  makeQboClient,
  fetchProfitAndLoss,
  fetchBalanceSheet,
  fetchCashFlow,
} from "../services/quickbooks.js";
import { logger } from "../logger.js";
import type { NormalizedReport } from "../types/reports.js";
import { normalizeReport } from "../utils/normalize-report.js";

const router = Router();

/**
 * POST /api/refresh
 * Body: { reports?: string[], startDate, endDate, basis?: "Accrual" | "Cash", demo?: boolean }
 * Returns: { pnl, bs, cash } normalized for Excel.
 * If demo=true or user has no QBO connection, returns static demo data (validate flow without QBO).
 */
router.post("/refresh", requireSession, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const {
    reports = ["pnl", "balance_sheet", "cash_flow"],
    startDate,
    endDate,
    basis = "Accrual",
    demo = false,
  } = req.body as {
    reports?: string[];
    startDate?: string;
    endDate?: string;
    basis?: "Accrual" | "Cash";
    demo?: boolean;
  };

  const start = startDate ?? new Date().getFullYear() + "-01-01";
  const end = endDate ?? new Date().toISOString().slice(0, 10);

  try {
    const conn = await getConnectionForUser(userId);
    const useDemo = demo || !conn;

    if (useDemo) {
      const demoData = getDemoReports();
      const result: { pnl?: NormalizedReport; bs?: NormalizedReport; cash?: NormalizedReport } = {};
      if (reports.includes("pnl")) result.pnl = demoData.pnl;
      if (reports.includes("balance_sheet")) result.bs = demoData.bs;
      if (reports.includes("cash_flow")) result.cash = demoData.cash;
      res.json(result);
      return;
    }

    const hasSubscription = await hasActiveSubscription(userId);
    if (!hasSubscription) {
      res.status(402).json({
        error: "Payment required",
        message: "An active subscription is required. Subscribe at $49/month to refresh reports.",
        code: "SUBSCRIPTION_REQUIRED",
      });
      return;
    }

    const qbo = await makeQboClient(userId);

    const result: { pnl?: NormalizedReport; bs?: NormalizedReport; cash?: NormalizedReport } = {};

    if (reports.includes("pnl")) {
      const raw = await fetchProfitAndLoss(qbo, start, end, basis);
      result.pnl = normalizeReport(raw);
    }
    if (reports.includes("balance_sheet")) {
      const raw = await fetchBalanceSheet(qbo, start, end, basis);
      result.bs = normalizeReport(raw);
    }
    if (reports.includes("cash_flow")) {
      const raw = await fetchCashFlow(qbo, start, end, basis);
      result.cash = normalizeReport(raw);
    }

    res.json(result);
  } catch (err) {
    logger.error({ err, userId }, "Refresh error");
    res.status(500).json({
      error: "Failed to fetch reports",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export const reportsRouter = router;
