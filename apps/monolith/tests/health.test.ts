import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { closeDb } from "./helpers.js";

describe("GET /", () => {
  let app: FastifyInstance;

  beforeAll(() => {
    app = buildApp();
  });

  afterAll(async () => {
    await app.close();
    await closeDb();
  });

  it("returns a health check response", async () => {
    const response = await app.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: "ok",
      message: "taskflow monolith",
    });
  });
});
