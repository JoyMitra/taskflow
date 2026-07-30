import type {FastifyInstance} from "fastify";
import {prisma} from "../db.js";

export async function notificationRoutes(app: FastifyInstance) {
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
            where: {id: request.params.id},
            data: {read: true},
        });
      } catch {
        return reply.code(404).send({ error: "notification not found" });
      }
    }
  );
}
