import type { FastifyInstance } from "fastify";
import { prisma } from "./db.js";
import { publishEvent } from "@taskflow/shared";

interface CreateTaskBody {
  title: string;
  description?: string;
  assigneeId?: string;
}

interface AssignTaskBody {
  assigneeId: string;
}

async function validateUser(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return !!user;
  } catch (err) {
    console.error("Error validating user:", err);
    return false;
  }
}

async function sendNotification(userId: string, message: string) {
  await publishEvent("notification-exchange", "notification.send", { userId, message });
}

export async function taskRoutes(app: FastifyInstance) {
  app.post<{ Body: CreateTaskBody }>("/tasks", async (request, reply) => {
    const { title, description, assigneeId } = request.body;

    if (!title) {
      return reply.code(400).send({ error: "title is required" });
    }

    if (assigneeId) {
      const isValid = await validateUser(assigneeId);
      if (!isValid) {
        return reply.code(400).send({ error: "assigneeId does not exist" });
      }
    }

    const task = await prisma.task.create({
      data: { title, description, assigneeId },
    });

    if (assigneeId) {
      await sendNotification(assigneeId, `Task "${title}" was assigned to you`);
    }

    return reply.code(201).send(task);
  });

  app.get("/tasks", async () => {
    const tasks = await prisma.task.findMany({
      orderBy: { createdAt: "asc" },
    });

    // In a real microservice, we might fetch user details for each task or leave it to the gateway/frontend.
    // Module 2 Checkpoint mentions: "tasks-service calls users-service over HTTP to validate assignees".
    // It doesn't explicitly say to join the data here. The monolith did.
    // For now, I'll just return tasks with assigneeId.
    return tasks;
  });

  app.get<{ Params: { id: string } }>("/tasks/:id", async (request, reply) => {
    const task = await prisma.task.findUnique({
      where: { id: request.params.id },
    });
    if (!task) {
      return reply.code(404).send({ error: "task not found" });
    }
    return task;
  });

  app.patch<{ Params: { id: string }; Body: AssignTaskBody }>(
    "/tasks/:id/assign",
    async (request, reply) => {
      const { id } = request.params;
      const { assigneeId } = request.body;

      const [task, userExists] = await Promise.all([
        prisma.task.findUnique({ where: { id } }),
        validateUser(assigneeId),
      ]);

      if (!task) {
        return reply.code(404).send({ error: "task not found" });
      }
      if (!userExists) {
        return reply.code(400).send({ error: "assigneeId does not exist" });
      }

      const updated = await prisma.task.update({
        where: { id },
        data: { assigneeId },
      });

      await sendNotification(assigneeId, `Task "${task.title}" was assigned to you`);

      return updated;
    }
  );
}
