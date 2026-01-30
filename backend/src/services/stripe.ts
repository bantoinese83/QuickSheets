import Stripe from "stripe";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export function getStripe(): Stripe | null {
  return stripe;
}

/** Subscription status we consider "active" for gating /api/refresh */
const ACTIVE_STATUSES = ["active", "trialing"];

export async function hasActiveSubscription(userId: string): Promise<boolean> {
  const result = await pool.query<{ subscription_status: string | null }>(
    "select subscription_status from users where id = $1",
    [userId]
  );
  const status = result.rows[0]?.subscription_status ?? null;
  return ACTIVE_STATUSES.includes(status ?? "");
}

export async function updateUserSubscription(
  userId: string,
  stripeCustomerId: string | null,
  stripeSubscriptionId: string | null,
  subscriptionStatus: string | null
): Promise<void> {
  await pool.query(
    `update users set
       stripe_customer_id = coalesce($2, stripe_customer_id),
       stripe_subscription_id = coalesce($3, stripe_subscription_id),
       subscription_status = $4,
       updated_at = now()
     where id = $1`,
    [userId, stripeCustomerId, stripeSubscriptionId, subscriptionStatus]
  );
}

export async function setUserStripeCustomer(
  userId: string,
  stripeCustomerId: string
): Promise<void> {
  await pool.query("update users set stripe_customer_id = $2, updated_at = now() where id = $1", [
    userId,
    stripeCustomerId,
  ]);
}
