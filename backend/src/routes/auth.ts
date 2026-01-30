import { Router, Request, Response } from "express";
import OAuthClient from "intuit-oauth";
import { getOrCreateUser, upsertConnection } from "../services/tokens.js";

const router = Router();

const redirectUri = process.env.QBO_REDIRECT_URI ?? "http://localhost:3000/auth/qbo/callback";
const useSandbox = process.env.QBO_USE_SANDBOX !== "false";

const oauthClient = new OAuthClient({
  clientId: process.env.QBO_CLIENT_ID!,
  clientSecret: process.env.QBO_CLIENT_SECRET!,
  environment: useSandbox ? "sandbox" : "production",
  redirectUri,
});

/**
 * GET /auth/demo
 * Creates/gets a demo user and sets session cookie. Use to validate add-in flow without QBO.
 * ?dialog=true returns HTML that posts "connected" to opener (for add-in dialog).
 */
router.get("/demo", async (req: Request, res: Response) => {
  try {
    const user = await getOrCreateUser("demo@quicksheets.local");
    res.cookie("quicksheets_user_id", user.id, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      path: "/",
    });
    const isDialog = req.query.dialog === "true";
    if (isDialog) {
      res.send(`
        <!DOCTYPE html>
        <html><body><script>
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage("connected", "*");
          }
          window.close();
        </script><p>Demo session started. You can close this window.</p></body></html>
      `);
      return;
    }
    res.redirect("/?demo=1");
  } catch (err) {
    console.error("Demo auth error:", err);
    res.status(500).send("Failed to start demo session.");
  }
});

/**
 * GET /auth/qbo
 * Redirects user to Intuit authorization URL (com.intuit.quickbooks.accounting scope).
 */
router.get("/qbo", (_req: Request, res: Response) => {
  const authUri = oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: "quicksheets_state",
  });
  res.redirect(authUri);
});

/**
 * GET /auth/qbo/callback
 * Receives code + realmId from Intuit, exchanges for tokens, stores them, sets session cookie.
 */
router.get("/qbo/callback", async (req: Request, res: Response) => {
  const { code, realmId } = req.query;
  if (!code || typeof code !== "string" || !realmId || typeof realmId !== "string") {
    res.status(400).send("Missing code or realmId");
    return;
  }

  try {
    const tokenResponse = await oauthClient.createToken(code);
    const token = tokenResponse.getJson() as {
      access_token: string;
      refresh_token: string;
      sub?: string;
    };

    // Use email from token if available; otherwise create anonymous user keyed by realmId
    const email = token.sub ?? `realm_${realmId}@quicksheets.local`;
    const user = await getOrCreateUser(email);

    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour; intuit-oauth may expose expiry
    await upsertConnection(user.id, realmId, token.access_token, token.refresh_token, expiresAt);

    // Set session cookie so /api/refresh can identify user. In production use httpOnly, secure, sameSite.
    res.cookie("quicksheets_user_id", user.id, {
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      sameSite: "lax",
      path: "/",
    });

    // For dialog flow: send message to opener so add-in can close dialog and enable Refresh
    const isDialog = req.query.dialog === "true";
    if (isDialog) {
      res.send(`
        <!DOCTYPE html>
        <html><body><script>
          if (window.opener && window.opener.postMessage) {
            window.opener.postMessage("connected", "*");
          }
          window.close();
        </script><p>Connected. You can close this window.</p></body></html>
      `);
      return;
    }

    res.redirect("/?connected=1");
  } catch (err) {
    console.error("QBO callback error:", err);
    res.status(500).send("Failed to connect QuickBooks. Please try again.");
  }
});

export const authRouter = router;
