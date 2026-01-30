import { logger } from "../logger.js";
import { getConnectionForUser, upsertConnection } from "./tokens.js";

// node-quickbooks is CommonJS; require() used (see eslint override for this file)
const QuickBooksCtor = require("node-quickbooks") as QboConstructor;

interface QboClientInstance {
  refreshAccessToken(cb: (err: Error | null, res?: unknown) => void): void;
  reportProfitAndLoss(
    params: Record<string, string>,
    cb: (err: Error | null, data: unknown) => void
  ): void;
  reportBalanceSheet(
    params: Record<string, string>,
    cb: (err: Error | null, data: unknown) => void
  ): void;
  reportCashFlow(
    params: Record<string, string>,
    cb: (err: Error | null, data: unknown) => void
  ): void;
}

type QboConstructor = new (
  clientId: string,
  clientSecret: string,
  token: string,
  tokenSecret: boolean,
  realmId: string,
  useSandbox: boolean,
  debug: boolean,
  minorversion: number,
  oauthversion: string,
  refreshToken: string | null
) => QboClientInstance;

const useSandbox = process.env.QBO_USE_SANDBOX !== "false";
const clientId = process.env.QBO_CLIENT_ID!;
const clientSecret = process.env.QBO_CLIENT_SECRET!;

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000; // 5 minutes

function isTokenExpiredOrExpiringSoon(expiresAt: Date): boolean {
  return new Date(expiresAt).getTime() - Date.now() < TOKEN_REFRESH_BUFFER_MS;
}

/**
 * Build a node-quickbooks client for the given user. Refreshes token if expired or within 5 min.
 */
export async function makeQboClient(userId: string): Promise<QboClientInstance> {
  const conn = await getConnectionForUser(userId);
  if (!conn) {
    throw new Error("No QuickBooks connection found. Connect QuickBooks first.");
  }

  let accessToken = conn.access_token;
  let refreshToken = conn.refresh_token;
  let expiresAt = conn.token_expires_at;

  if (isTokenExpiredOrExpiringSoon(expiresAt)) {
    const qboTemp = new QuickBooksCtor(
      clientId,
      clientSecret,
      conn.access_token,
      false,
      conn.realm_id,
      useSandbox,
      false,
      75,
      "2.0",
      conn.refresh_token
    );

    const refreshResponse = await new Promise<{
      access_token: string;
      refresh_token: string;
      expires_in?: number;
    }>((resolve, reject) => {
      qboTemp.refreshAccessToken((err: Error | null, res?: unknown) => {
        if (err) return reject(err);
        const body = res as
          | { access_token?: string; refresh_token?: string; expires_in?: number }
          | undefined;
        if (body?.access_token) {
          resolve({
            access_token: body.access_token,
            refresh_token: body.refresh_token ?? refreshToken,
            expires_in: body.expires_in,
          });
        } else {
          reject(new Error("Token refresh did not return access_token"));
        }
      });
    });

    accessToken = refreshResponse.access_token;
    refreshToken = refreshResponse.refresh_token;
    const expiresInSeconds = refreshResponse.expires_in ?? 3600;
    expiresAt = new Date(Date.now() + expiresInSeconds * 1000);

    await upsertConnection(userId, conn.realm_id, accessToken, refreshToken, expiresAt);
  }

  const qbo = new QuickBooksCtor(
    clientId,
    clientSecret,
    accessToken,
    false,
    conn.realm_id,
    useSandbox,
    false,
    75,
    "2.0",
    refreshToken
  );

  return qbo;
}

/**
 * Promisified report calls for P&L, Balance Sheet, Cash Flow.
 * Logs errors with rate-limit awareness (429) for monitoring.
 */
function reportPromise(
  qbo: QboClientInstance,
  method: "reportProfitAndLoss" | "reportBalanceSheet" | "reportCashFlow",
  params: Record<string, string>
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    qbo[method](params, (err: Error | null, data: unknown) => {
      if (err) {
        const statusCode = (err as Error & { statusCode?: number }).statusCode;
        const isRateLimit = statusCode === 429;
        logger[isRateLimit ? "warn" : "error"](
          {
            err,
            method,
            params,
            ...(isRateLimit && { rate_limit: true, message: "QuickBooks API rate limit (429)" }),
          },
          isRateLimit ? "QuickBooks API rate limit" : "QuickBooks report error"
        );
        return reject(err);
      }
      resolve(data);
    });
  });
}

export async function fetchProfitAndLoss(
  qbo: QboClientInstance,
  startDate: string,
  endDate: string,
  accountingMethod: string
): Promise<unknown> {
  return reportPromise(qbo, "reportProfitAndLoss", {
    start_date: startDate,
    end_date: endDate,
    accounting_method: accountingMethod,
  });
}

export async function fetchBalanceSheet(
  qbo: QboClientInstance,
  startDate: string,
  endDate: string,
  accountingMethod: string
): Promise<unknown> {
  return reportPromise(qbo, "reportBalanceSheet", {
    start_date: startDate,
    end_date: endDate,
    accounting_method: accountingMethod,
  });
}

export async function fetchCashFlow(
  qbo: QboClientInstance,
  startDate: string,
  endDate: string,
  accountingMethod: string
): Promise<unknown> {
  return reportPromise(qbo, "reportCashFlow", {
    start_date: startDate,
    end_date: endDate,
    accounting_method: accountingMethod,
  });
}
