process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://taskflow:taskflowtest@localhost:5433/taskflow_tasks_test?schema=public";

// Mock fetch for cross-service calls during tests
global.fetch = jest.fn();
