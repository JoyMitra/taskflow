import { prisma } from "./db.js";
import { registerSubscribers } from "@taskflow/shared";

export async function initSubscribers() {
  await registerSubscribers([
    {
      exchange: "notification-exchange",
      queue: "notifications-queue",
      routingKey: "notification.send",
      handler: async (data) => {
        const { userId, message } = data;
        console.log("Creating notification for user:", userId);
        await prisma.notification.create({
          data: {
            userId,
            message,
          },
        });
      },
    },
  ]);
}
