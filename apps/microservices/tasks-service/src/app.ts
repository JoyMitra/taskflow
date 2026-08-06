import Fastify from "fastify";
import { taskRoutes } from "./routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok", service: "tasks-service" };
  });

  app.register(taskRoutes);

  return app;
}
