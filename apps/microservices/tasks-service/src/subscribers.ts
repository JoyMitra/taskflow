import { prisma } from "./db.js";
import { registerSubscribers } from "@taskflow/shared";

export async function initSubscribers() {
  await registerSubscribers([
    {
      exchange: "user-exchange",
      queue: "tasks-user-queue",
      routingKey: "user.created",
      handler: async (user) => {
        console.log("Syncing user:", user.id);
        await prisma.user.upsert({
          where: { id: user.id },
          update: {
            name: user.name,
            email: user.email,
          },
          create: {
            id: user.id,
            name: user.name,
            email: user.email,
            createdAt: new Date(user.createdAt),
          },
        });
      },
    },
  ]);
}
