import { prisma, pool } from "../src/db.js";

// Order matters: Notification and Task both reference User via foreign
// keys, so children are deleted before the parent.
export async function cleanDb() {
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
}

export async function closeDb() {
  await prisma.$disconnect();
  await pool.end();
}
