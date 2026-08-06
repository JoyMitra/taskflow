import { prisma, pool } from "../src/db.js";

export async function cleanDb() {
  await prisma.user.deleteMany();
}

export async function closeDb() {
  await prisma.$disconnect();
  await pool.end();
}
