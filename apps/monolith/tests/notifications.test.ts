import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";

async function createUserWithAssignedTask(app: FastifyInstance) {
  const userResponse = await app.inject({
    method: "POST",
    url: "/users",
    payload: { name: "Ada Lovelace", email: "ada@example.com" },
  });
  const user = userResponse.json();

  await app.inject({
    method: "POST",
    url: "/tasks",
    payload: { title: "Write tests", assigneeId: user.id },
  });

  return user;
}

describe("Notifications API", () => {
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

  describe("GET /notifications/:userId", () => {
    it("returns an empty array for a user with no notifications", async () => {
      const userResponse = await app.inject({
        method: "POST",
        url: "/users",
        payload: { name: "Ada Lovelace", email: "ada@example.com" },
      });
      const user = userResponse.json();

      const response = await app.inject({
        method: "GET",
        url: `/notifications/${user.id}`,
      });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("lists notifications created by task assignment", async () => {
      const user = await createUserWithAssignedTask(app);

      const response = await app.inject({
        method: "GET",
        url: `/notifications/${user.id}`,
      });
      expect(response.statusCode).toBe(200);
      const notifications = response.json();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].read).toBe(false);
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("marks a notification as read", async () => {
      const user = await createUserWithAssignedTask(app);
      const list = await app.inject({
        method: "GET",
        url: `/notifications/${user.id}`,
      });
      const [notification] = list.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/notifications/${notification.id}/read`,
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().read).toBe(true);
    });

    it("returns 404 for a notification that doesn't exist", async () => {
      const response = await app.inject({
        method: "PATCH",
        url: "/notifications/00000000-0000-0000-0000-000000000000/read",
      });
      expect(response.statusCode).toBe(404);
    });
  });
});
