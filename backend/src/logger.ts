import pino from "pino";

/**
 * Structured logger for request/response, QBO calls, and errors.
 * Set LOG_LEVEL=debug for verbose output. In production, use JSON for log aggregation.
 */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "production" ? "info" : "debug"),
  formatters: {
    level: (label) => ({ level: label }),
  },
});
