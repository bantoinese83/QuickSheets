import request from "supertest";
import { app } from "../app.js";

jest.mock("../services/tokens.js", () => ({
  getConnectionForUser: jest.fn().mockResolvedValue(null),
}));

describe("POST /api/refresh", () => {
  it("returns 401 without session cookie", async () => {
    const res = await request(app)
      .post("/api/refresh")
      .set("Content-Type", "application/json")
      .send({ demo: false });
    expect(res.status).toBe(401);
  });

  it("returns demo data when demo=true and session present", async () => {
    const res = await request(app)
      .post("/api/refresh")
      .set("Content-Type", "application/json")
      .set("Cookie", "quicksheets_user_id=test-user-123")
      .send({ demo: true });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pnl");
    expect(res.body).toHaveProperty("bs");
    expect(res.body).toHaveProperty("cash");
    expect(res.body.pnl).toHaveProperty("headers");
    expect(res.body.pnl).toHaveProperty("rows");
  });

  it("returns only requested reports when reports array is passed", async () => {
    const res = await request(app)
      .post("/api/refresh")
      .set("Content-Type", "application/json")
      .set("Cookie", "quicksheets_user_id=test-user-123")
      .send({ demo: true, reports: ["pnl"] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("pnl");
    expect(res.body).not.toHaveProperty("bs");
    expect(res.body).not.toHaveProperty("cash");
  });
});

describe("GET /health", () => {
  it("returns 200 and status ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok", service: "quicksheets-api" });
  });
});
