/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFiles: ["<rootDir>/tests/jest.setup.cjs"],
  testMatch: ["**/tests/**/*.test.ts"],
  // Source files use NodeNext-style imports like "../db.js" even though
  // the real file is db.ts. Jest/CommonJS resolution doesn't understand
  // that convention on its own, so this strips the .js extension before
  // resolving, letting it find the .ts file normally.
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.jest.json" }],
  },
};
