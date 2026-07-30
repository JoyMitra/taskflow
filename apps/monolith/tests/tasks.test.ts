import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { cleanDb, closeDb } from "./helpers.js";

async function createUser(app: FastifyInstance, email = "ada@example.com") {
  const response = await app.inject({
    method: "POST",
    url: "/users",
    payload: { name: "Ada Lovelace", email },
  });
  return response.json();
}

describe("Tasks API", () => {
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

  describe("POST /tasks", () => {
    it("creates an unassigned task", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests" },
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.title).toBe("Write tests");
      expect(body.assigneeId).toBeNull();
      expect(body.status).toBe("todo");
    });

    it("returns 400 when title is missing", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { description: "no title here" },
      });
      expect(response.statusCode).toBe(400);
    });

    it("returns 400 when assigneeId does not exist", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: {
          title: "Write tests",
          assigneeId: "00000000-0000-0000-0000-000000000000",
        },
      });
      expect(response.statusCode).toBe(400);
    });

    it("creates a task with a valid assignee and writes a notification", async () => {
      const user = await createUser(app);

      const taskResponse = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests", assigneeId: user.id },
      });
      expect(taskResponse.statusCode).toBe(201);
      expect(taskResponse.json().assigneeId).toBe(user.id);

      // This is the naive-on-purpose behavior from Module 1: the
      // notification exists immediately, in the same request.
      const notificationsResponse = await app.inject({
        method: "GET",
        url: `/notifications/${user.id}`,
      });
      const notifications = notificationsResponse.json();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].message).toContain("Write tests");
    });
  });

  describe("GET /tasks", () => {
    it("returns an empty array when there are no tasks", async () => {
      const response = await app.inject({ method: "GET", url: "/tasks" });
      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual([]);
    });

    it("lists tasks with assignee info included", async () => {
      const user = await createUser(app);
      await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests", assigneeId: user.id },
      });

      const response = await app.inject({ method: "GET", url: "/tasks" });
      const tasks = response.json();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].assignee.id).toBe(user.id);
      expect(tasks[0].assignee.email).toBe(user.email);
    });
  });

  describe("GET /tasks/:id", () => {
    it("fetches a single task", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests" },
      });
      const { id } = create.json();

      const response = await app.inject({ method: "GET", url: `/tasks/${id}` });
      expect(response.statusCode).toBe(200);
      expect(response.json().id).toBe(id);
    });

    it("returns 404 for a task that doesn't exist", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/tasks/00000000-0000-0000-0000-000000000000",
      });
      expect(response.statusCode).toBe(404);
    });
  });

  describe("PATCH /tasks/:id/assign", () => {
    it("assigns a task and writes a notification", async () => {
      const user = await createUser(app);
      const create = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests" },
      });
      const { id } = create.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${id}/assign`,
        payload: { assigneeId: user.id },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().assigneeId).toBe(user.id);

      const notificationsResponse = await app.inject({
        method: "GET",
        url: `/notifications/${user.id}`,
      });
      expect(notificationsResponse.json()).toHaveLength(1);
    });

    it("returns 404 when the task doesn't exist", async () => {
      const user = await createUser(app);
      const response = await app.inject({
        method: "PATCH",
        url: "/tasks/00000000-0000-0000-0000-000000000000/assign",
        payload: { assigneeId: user.id },
      });
      expect(response.statusCode).toBe(404);
    });

    it("returns 400 when the assignee doesn't exist", async () => {
      const create = await app.inject({
        method: "POST",
        url: "/tasks",
        payload: { title: "Write tests" },
      });
      const { id } = create.json();

      const response = await app.inject({
        method: "PATCH",
        url: `/tasks/${id}/assign`,
        payload: { assigneeId: "00000000-0000-0000-0000-000000000000" },
      });
      expect(response.statusCode).toBe(400);
    });
  });
});
