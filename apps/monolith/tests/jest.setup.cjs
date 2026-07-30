// Runs before the test framework loads in each test file, so
// PrismaClient (constructed at import time in src/db.ts) picks up the
// test database instead of your local dev one.
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://taskflow:taskflowtest@localhost:5433/taskflow_test?schema=public";
