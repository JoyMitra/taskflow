import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";
import {publishEvent} from "@taskflow/shared";

jest.mock("@taskflow/shared", () => ({
  connectMessaging: jest.fn(),
  publishEvent: jest.fn(),
  closeMessaging: jest.fn(),
}));

describe("Users Service", () => {
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

  describe("POST /users", () => {
    it("creates a user and returns 201", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.name).toBe("Ada Lovelace");
      expect(body.email).toBe("ada@example.com");
      expect(body.id).toBeDefined();

      expect(publishEvent).toHaveBeenCalledWith(
        "user-exchange",
        "user.created",
        expect.objectContaining({ email: "ada@example.com" })
      );
    });
  });

  describe("GET /users", () => {
    it("lists users", async () => {
      await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });

      const response = await app.inject({ method: "GET", url: "/users" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(1);
    });
  });

  describe("GET /users/:id", () => {
    it("fetches a single user by id", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });
      const { id } = create.json();

      const response = await app.inject({ method: "GET", url: `/users/${id}` });
      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(id);
    });
  });
});
