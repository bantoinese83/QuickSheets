import { Request, Response, NextFunction } from "express";
import { hasActiveSubscription } from "../services/stripe.js";

/**
 * Requires req.user (use after requireSession). Returns 402 if user has no active Stripe subscription.
 */
export async function requireSubscription(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user?.id) {
    res.status(401).json({ error: "Unauthorized", message: "Session required." });
    return;
  }
  const active = await hasActiveSubscription(req.user.id);
  if (!active) {
    res.status(402).json({
      error: "Payment required",
      message: "An active subscription is required. Subscribe at $49/month to refresh reports.",
      code: "SUBSCRIPTION_REQUIRED",
    });
    return;
  }
  next();
}
