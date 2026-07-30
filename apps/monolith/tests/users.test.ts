import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";

describe("Users API", () => {
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
    });

    it("returns 400 when name is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: { email: "ada@example.com" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when email is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 409 when the email already exists", async () => {
      await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });

      const response = await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Duplicate", email: "ada@example.com" },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("GET /users", () => {
    it("returns an empty array when there are no users", async () => {
      const response = await app.inject({ method: "GET", url: "/users" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("lists created users", async () => {
      await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });
      await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Grace Hopper", email: "grace@example.com" },
      });

      const response = await app.inject({ method: "GET", url: "/users" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(2);
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

    it("returns 404 for a user that doesn't exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/users/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
