import Fastify from "fastify";
import { userRoutes } from "./routes/users.js";
import { taskRoutes } from "./routes/tasks.js";
import { notificationRoutes } from "./routes/notifications.js";

// Builds the Fastify app without calling listen(). Used by src/index.ts
// to actually run the server, and by tests to exercise routes in-process
// via app.inject() — no real network port needed for either.
export function buildApp() {
  const app = Fastify({ logger: false });

  app.get("/", async () => {
    return { status: "ok", message: "taskflow monolith" };
  });

  app.register(userRoutes);
  app.register(taskRoutes);
  app.register(notificationRoutes);

  return app;
}
