import { Request, Response, NextFunction } from "express";

/**
 * In production, require HTTPS. Checks X-Forwarded-Proto when behind a reverse proxy.
 */
export function requireHttps(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  const proto = req.get("X-Forwarded-Proto") ?? (req.secure ? "https" : "http");
  if (proto !== "https") {
    res.status(403).send("HTTPS required");
    return;
  }
  next();
}

/**
 * In production, require CORS_ORIGIN to be set and not wildcard.
 */
export function validateCorsConfig(_req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }
  const origin = process.env.CORS_ORIGIN;
  if (!origin || origin === "*") {
    console.error("In production, CORS_ORIGIN must be set and must not be *");
    res.status(500).json({ error: "Server misconfiguration" });
    return;
  }
  next();
}
