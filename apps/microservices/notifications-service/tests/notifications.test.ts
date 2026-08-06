import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";

jest.mock("@taskflow/shared", () => ({
  connectMessaging: jest.fn(),
  subscribeEvent: jest.fn(),
  closeMessaging: jest.fn(),
}));

describe("Notifications Service", () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(async () => {
    await cleanDb();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  describe("POST /notifications", () => {
    it("creates a notification", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/notifications",
        payload: { userId: "user-1", message: "Hello" },
      });
      expect(response.statusCode).toBe(201);
      expect(response.json().message).toBe("Hello");
    });
  });

  describe("GET /notifications/:userId", () => {
    it("lists notifications for a user", async () => {
      await app.inject({
        method: "POST",
        url: "/notifications",
        payload: { userId: "user-1", message: "Hello" },
      });
      const response = await app.inject({ method: "GET", url: "/notifications/user-1" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(1);
    });
  });
});
