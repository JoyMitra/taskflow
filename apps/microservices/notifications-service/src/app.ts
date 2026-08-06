import Fastify from "fastify";
import { notificationRoutes } from "./routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok", service: "notifications-service" };
  });

  app.register(notificationRoutes);

  return app;
}
