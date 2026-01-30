import { Request, Response, NextFunction } from "express";

/**
 * Placeholder session: in production use cookie-based JWT or server-side session.
 * For MVP, we rely on QBO OAuth callback setting a cookie; this middleware
 * reads a simple session cookie (e.g. user_id) or returns 401.
 */
export interface SessionUser {
  id: string;
  email?: string;
}

export function requireSession(req: Request, res: Response, next: NextFunction): void {
  // MVP: read user_id from cookie set by OAuth callback. Replace with JWT/session store.
  const userId = req.cookies?.quicksheets_user_id;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Connect QuickBooks first." });
    return;
  }
  req.user = { id: userId };
  next();
}
