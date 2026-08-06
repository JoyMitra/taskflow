import Fastify from "fastify";
import { userRoutes } from "./routes.js";

export function buildApp() {
  const app = Fastify({ logger: true });

  app.get("/health", async () => {
    return { status: "ok", service: "users-service" };
  });

  app.register(userRoutes);

  return app;
}
