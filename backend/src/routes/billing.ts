import { Router, Request, Response } from "express";
import Stripe from "stripe";
import { getStripe, updateUserSubscription, setUserStripeCustomer } from "../services/stripe.js";
import { requireSession } from "../middleware/session.js";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const stripe = getStripe();
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
const priceId = process.env.STRIPE_PRICE_ID!;
const successUrl = process.env.STRIPE_SUCCESS_URL ?? "https://localhost:3000?subscription=success";
const cancelUrl = process.env.STRIPE_CANCEL_URL ?? "https://localhost:3000?subscription=canceled";

const router = Router();

/**
 * POST /api/create-checkout-session
 * Creates a Stripe Checkout session for $49/mo. Requires session cookie.
 */
router.post("/create-checkout-session", requireSession, async (req: Request, res: Response) => {
  if (!stripe || !priceId) {
    res.status(503).json({
      error: "Billing not configured",
      message: "STRIPE_SECRET_KEY or STRIPE_PRICE_ID not set.",
    });
    return;
  }
  const userId = req.user!.id;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: userId,
      metadata: { user_id: userId },
      subscription_data: { metadata: { user_id: userId } },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("Checkout session error:", err);
    res.status(500).json({
      error: "Failed to create checkout session",
      message: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

/**
 * POST /webhooks/stripe
 * Stripe webhook: subscription created/updated/deleted. Uses raw body for signature verification.
 */
export async function handleStripeWebhook(req: Request, res: Response): Promise<void> {
  if (!stripe || !webhookSecret) {
    res.status(503).send("Webhook not configured");
    return;
  }
  const sig = req.headers["stripe-signature"];
  if (!sig || typeof sig !== "string") {
    res.status(400).send("Missing stripe-signature");
    return;
  }
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
  if (!rawBody) {
    res.status(400).send("Raw body required for webhook");
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    res.status(400).send("Invalid signature");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = (session.metadata?.user_id ?? session.client_reference_id) as string | null;
        if (!userId) break;
        if (session.customer && typeof session.customer === "string") {
          await setUserStripeCustomer(userId, session.customer);
        }
        if (session.subscription && typeof session.subscription === "string") {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          await updateUserSubscription(userId, sub.customer as string, sub.id, sub.status);
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id as string | null;
        if (!userId) {
          const custId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
          if (custId) {
            const byCustomer = await pool.query<{ id: string }>(
              "select id from users where stripe_customer_id = $1",
              [custId]
            );
            const uid = byCustomer.rows[0]?.id;
            if (uid) {
              await updateUserSubscription(
                uid,
                null,
                sub.id,
                event.type === "customer.subscription.deleted" ? "canceled" : sub.status
              );
            }
          }
          break;
        }
        await updateUserSubscription(
          userId,
          null,
          sub.id,
          event.type === "customer.subscription.deleted" ? "canceled" : sub.status
        );
        break;
      }
      default:
        // ignore other events
        break;
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    res.status(500).send("Webhook handler failed");
    return;
  }

  res.sendStatus(200);
}

export const billingRouter = router;
