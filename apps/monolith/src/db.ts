import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

// Single shared Prisma client for the whole monolith. Every route module
// imports this same instance — in Module 2, this file (and the concept of
// "one shared client") disappears entirely, since each microservice will
// have its own database and its own client.
export const prisma = new PrismaClient({ adapter });
