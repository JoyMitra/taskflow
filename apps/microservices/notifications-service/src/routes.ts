import type { FastifyInstance } from "fastify";
import { prisma } from "./db.js";

interface CreateNotificationBody {
  userId: string;
  message: string;
}

export async function notificationRoutes(app: FastifyInstance) {
  // POST /notifications — create a notification (called by other services)
  app.post<{ Body: CreateNotificationBody }>(
    "/notifications",
    async (request, reply) => {
      const { userId, message } = request.body;

      if (!userId || !message) {
        return reply.code(400).send({ error: "userId and message are required" });
      }

      const notification = await prisma.notification.create({
        data: { userId, message },
      });

      return reply.code(201).send(notification);
    }
  );

  // GET /notifications/:userId — list a user's notifications
  app.get<{ Params: { userId: string } }>(
    "/notifications/:userId",
    async (request) => {
      return prisma.notification.findMany({
        where: { userId: request.params.userId },
        orderBy: { createdAt: "desc" },
      });
    }
  );

  // PATCH /notifications/:id/read — mark a notification as read
  app.patch<{ Params: { id: string } }>(
    "/notifications/:id/read",
    async (request, reply) => {
      try {
        return await prisma.notification.update({
          where: { id: request.params.id },
          data: { read: true },
        });
      } catch {
        return reply.code(404).send({ error: "notification not found" });
      }
    }
  );
}
