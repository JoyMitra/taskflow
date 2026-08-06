import { prisma, pool } from "../src/db.js";

export async function cleanDb() {
  await prisma.notification.deleteMany();
}

export async function closeDb() {
  await prisma.$disconnect();
  await pool.end();
}
