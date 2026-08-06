import type { FastifyInstance } from "fastify";
import { prisma } from "./db.js";
import { publishEvent } from "@taskflow/shared";

interface CreateUserBody {
  name: string;
  email: string;
}

export async function userRoutes(app: FastifyInstance) {
  // POST /users — create a user
  app.post<{ Body: CreateUserBody }>("/users", async (request, reply) => {
    const { name, email } = request.body;

    if (!name || !email) {
      return reply.code(400).send({ error: "name and email are required" });
    }

    try {
      const user = await prisma.user.create({
        data: { name, email },
      });

      // Publish event
      await publishEvent("user-exchange", "user.created", user);

      return reply.code(201).send(user);
    } catch (err) {
      return reply.code(409).send({ error: "email already exists" });
    }
  });

  // GET /users — list all users
  app.get("/users", async () => {
    return prisma.user.findMany({ orderBy: { createdAt: "asc" } });
  });

  // GET /users/:id — fetch a single user
  app.get<{ Params: { id: string } }>("/users/:id", async (request, reply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.params.id },
    });
    if (!user) {
      return reply.code(404).send({ error: "user not found" });
    }
    return user;
  });
}
