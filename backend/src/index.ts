import "dotenv/config";
import cookieParser from "cookie-parser";
import express from "express";
import { requireHttps, validateCorsConfig } from "./middleware/security.js";
import { authRouter } from "./routes/auth.js";
import { billingRouter, handleStripeWebhook } from "./routes/billing.js";
import { reportsRouter } from "./routes/reports.js";

const app = express();
const PORT = process.env.PORT ?? 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? "https://localhost:3000";

app.use(requireHttps);
app.use(validateCorsConfig);
app.use((req, res, next) => {
  res.set("Access-Control-Allow-Origin", CORS_ORIGIN);
  res.set("Access-Control-Allow-Credentials", "true");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }
  next();
});

app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req: express.Request, res: express.Response) => {
    (req as express.Request & { rawBody?: Buffer }).rawBody = req.body;
    void handleStripeWebhook(req, res);
  }
);

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "quicksheets-api" });
});

app.get("/", (_req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>QuickSheets – QuickBooks to Excel in one click</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;line-height:1.6;}
h1{font-size:1.5rem;} a{color:#0d6efd;}</style>
</head>
<body>
<h1>QuickSheets</h1>
<p>Refresh your QuickBooks P&amp;L, Balance Sheet, and Statement of Cash Flows into Excel with one click.</p>
<p>We do <strong>not</strong> store your report data. Data flows: QuickBooks → our server → your Excel. We only store the connection tokens needed to fetch reports on your behalf.</p>
<p><a href="/privacy">Privacy &amp; data handling</a></p>
</body>
</html>
  `);
});

app.get("/privacy", (_req, res) => {
  res.type("html").send(`
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Privacy &amp; data handling – QuickSheets</title>
<style>body{font-family:system-ui,sans-serif;max-width:640px;margin:2rem auto;padding:0 1rem;line-height:1.6;}
h1{font-size:1.5rem;} h2{font-size:1.1rem;margin-top:1.5rem;}</style>
</head>
<body>
<h1>Privacy &amp; data handling</h1>
<h2>What we store</h2>
<p>We store only what is needed to connect to QuickBooks and to manage your account: user id, email (if provided), QuickBooks connection tokens (encrypted at rest), and subscription status.</p>
<h2>What we do not store</h2>
<p>We do <strong>not</strong> store your financial report content, transactions, or line items. When you click Refresh, we fetch the requested reports from QuickBooks, normalize them, and stream the result to your Excel add-in. We then discard the report data. We never persist P&amp;L, Balance Sheet, or Cash Flow data.</p>
<h2>Security</h2>
<p>Connection tokens are encrypted at rest. We use HTTPS only. Access is limited to your session and your subscription.</p>
<p><a href="/">Back to QuickSheets</a></p>
</body>
</html>
  `);
});

app.use("/auth", authRouter);
app.use("/api", billingRouter);
app.use("/api", reportsRouter);

app.listen(PORT, () => {
  console.log(`QuickSheets API listening on port ${PORT}`);
});
