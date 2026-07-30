# monolith (Module 1)

The baseline architecture for the TaskFlow lesson plan: **users, tasks,
and notifications all living in one Fastify process, backed by one
Postgres database.** Notifications are written directly to the database
in the same request that assigns a task — naive on purpose. Every later
module (microservices, event-driven, etc.) gets compared back against
this one.

## Stack
- Node.js + TypeScript + Fastify
- Prisma ORM + PostgreSQL
- Deployed via Coolify, self-hosted on a DigitalOcean Droplet

## Prerequisites

### Local machine
- **Node.js** (v20+) and **npm**
- **Docker Desktop** (Mac/Windows) or Docker Engine (Linux) — used two
  ways here: running a local Postgres via `docker-compose.yml`, and
  testing the production container build before pushing
- **Git**, with this repo pushed to GitHub

### Server (already set up once for the whole TaskFlow project)
- A DigitalOcean Droplet running Coolify (see Module 0)
- A **Postgres database resource** created in Coolify for this app (see
  Deployment section below — this is new compared to Module 0, which had
  no database)

## Project structure
```
apps/monolith/
├── src/
│   ├── index.ts              # entrypoint — builds the app and listens
│   ├── app.ts                  # builds the Fastify instance, no listen() (used by index.ts and tests)
│   ├── db.ts                  # shared Prisma client
│   └── routes/
│       ├── users.ts
│       ├── tasks.ts           # includes the naive notification-on-assign logic
│       └── notifications.ts
├── tests/
│   ├── jest.setup.cjs           # points Prisma at the test DB before tests import app code
│   ├── helpers.ts               # cleanDb() / closeDb() shared by all suites
│   ├── health.test.ts
│   ├── users.test.ts
│   ├── tasks.test.ts
│   └── notifications.test.ts
├── prisma/
│   └── schema.prisma           # User, Task, Notification models
├── docker-compose.yml          # LOCAL Postgres (dev + test) only — not deployed
├── Dockerfile
├── jest.config.cjs
├── tsconfig.jest.json           # separate CommonJS config so ts-jest can run NodeNext-style source
├── tsconfig.json                # self-contained, no `extends` (see Module 0)
├── package.json
├── .env.example
└── README.md
```

## Local development

### 1. Install dependencies
```bash
cd apps/monolith
npm install
```

### 2. Start a local Postgres
```bash
docker compose up -d
```
This starts Postgres on `localhost:5432` with the credentials already
matching `.env.example`.

### 3. Configure environment
```bash
cp .env.example .env
```
The defaults in `.env.example` already match the `docker-compose.yml`
credentials, so no edits are needed for local dev.

### 4. Create and apply the initial migration
```bash
npx prisma migrate dev --name init
```
This does two things: generates the SQL migration files under
`prisma/migrations/` (which you should commit to Git), and applies them
to your local Postgres. You only need `--name init` the first time — for
any later schema changes, run the same command with a new descriptive
name.

### 5. Run the app
```bash
npm run dev
```
This uses `tsx watch`, so changes to `src/` restart the server
automatically. Check it's up:
```bash
curl http://localhost:3000
# {"status":"ok","message":"taskflow monolith"}
```

## API reference

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/` | — | health check |
| POST | `/users` | `{ name, email }` | creates a user |
| GET | `/users` | — | lists all users |
| GET | `/users/:id` | — | fetch one user |
| POST | `/tasks` | `{ title, description?, assigneeId? }` | creates a task; if `assigneeId` is set, also writes a notification |
| GET | `/tasks` | — | lists all tasks with assignee info |
| GET | `/tasks/:id` | — | fetch one task |
| PATCH | `/tasks/:id/assign` | `{ assigneeId }` | (re)assigns a task, writes a notification |
| GET | `/notifications/:userId` | — | lists a user's notifications |
| PATCH | `/notifications/:id/read` | — | marks a notification read |

### Try it end to end
```bash
# create a user
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Ada","email":"ada@example.com"}'
# copy the returned "id"

# create a task assigned to that user
curl -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Write module 1 tests","assigneeId":"<paste-id-here>"}'

# check the notification was created
curl http://localhost:3000/notifications/<paste-id-here>
```

## Testing

Every endpoint in the API reference above has a Jest test in `tests/`,
using Fastify's `app.inject()` to call routes in-process (no real HTTP
port needed) against a **separate test database** — so running tests
never touches your local dev data.

### 1. Install dependencies (if you haven't already)
```bash
npm install
```

### 2. Start the test database
It's the `postgres-test` service in the same `docker-compose.yml`,
already running if you ran `docker compose up -d` earlier — it starts
both the dev and test databases together. If you only started `postgres`
before, run:
```bash
docker compose up -d postgres-test
```

### 3. Run the tests
```bash
npm test
```
This runs `test:migrate` first (via npm's `pretest` hook), which applies
your committed migrations to the test database, then runs Jest. You
should see all suites (health, users, tasks, notifications) pass.

### How this is wired together
- `tests/jest.setup.cjs` sets `DATABASE_URL` to the test database
  *before* any test file imports app code, so Prisma connects to
  `taskflow_test` instead of your dev database
- `src/app.ts` exports `buildApp()` separately from `index.ts`'s
  `listen()` call — this is what lets tests call routes directly via
  `app.inject()` without a real server
- `tests/helpers.ts`'s `cleanDb()` truncates all tables before each test,
  so tests don't leak state into each other
- `tsconfig.jest.json` + `jest.config.cjs`'s `moduleNameMapper` exist
  because the app's source uses NodeNext-style imports (e.g.
  `"../db.js"` pointing at `db.ts`) — Jest needs a CommonJS config and a
  small regex rule to resolve those correctly; this has no effect on how
  the app actually runs in production

## Testing the Docker build locally (before pushing)

The Dockerfile runs `prisma generate` at build time and `prisma migrate
deploy` at container startup, so it needs a real database to fully test
against — point it at your local Postgres from `docker compose`:

```bash
docker build -t monolith-test .
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://taskflow:taskflow@host.docker.internal:5432/taskflow?schema=public" \
  monolith-test
curl http://localhost:3000
```
`host.docker.internal` lets the container reach the Postgres running via
`docker compose` on your Mac (that hostname resolves differently or not
at all on native Linux Docker — use your machine's LAN IP there instead
if needed).

## Deploying to Coolify

This module introduces a database resource, so there's one more step
than Module 0 before deploying the app itself.

### 1. Create the Postgres resource
- In the `taskflow` project → **New Resource → Database → PostgreSQL**
- Coolify provisions it and shows a **connection string** — copy it
- This is a separate, independently managed resource from the app itself

### 2. Create the application resource
- **New Resource → Application**
- **Server:** This machine
- **Repository:** `https://github.com/<your-username>/taskflow.git`
- **Branch:** `main`
- **Base directory:** `/apps/monolith`
- **Build pack:** Dockerfile
- **Domains:** leave the auto-assigned URL

### 3. Set the environment variable
- In the application's **Environment Variables** tab, add:
  ```
  DATABASE_URL=<the connection string from step 1>
  ```
  Use Coolify's internal hostname for the database (not `localhost` —
  that only works for your local `docker compose` setup) — Coolify's
  Postgres resource page shows the correct internal connection string to
  use here.

### 4. Deploy
Click **Deploy**. On startup, the container runs
`npx prisma migrate deploy` against that `DATABASE_URL` before starting
the server — so the very first deploy also creates all your tables.

### Checkpoint
```bash
curl http://<assigned-domain-or-ip>:<port>/users
# []
```
Repeat the "try it end to end" sequence above against the deployed URL
to confirm users, tasks, and notifications all work in production.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Error: P1001: Can't reach database server` on deploy | Wrong `DATABASE_URL`, or using `localhost` instead of Coolify's internal DB hostname | Copy the connection string directly from the Postgres resource page in Coolify |
| `prisma: command not found` in production container | `node_modules` from the build stage wasn't copied into the runtime stage | Confirm the Dockerfile's final stage has `COPY --from=build /app/node_modules ./node_modules` |
| Prisma engine crashes with an OpenSSL error | Debian slim images don't ship `openssl` by default, which Prisma's query engine needs | Already handled in this Dockerfile via `apt-get install -y openssl` in both stages — if you modify the base image, keep this line |
| `relation "User" does not exist` at runtime | Migrations were never applied to this database | Confirm `prisma/migrations/` was committed to Git, and that `migrate deploy` ran without error in the Coolify deploy logs |
| Local `npm run dev` can't connect to Postgres | `docker compose up -d` wasn't run, or `.env` is missing | Run `docker compose up -d` and confirm `.env` exists with the right `DATABASE_URL` |
| `npm test` fails with `Can't reach database server at localhost:5433` | `postgres-test` container isn't running | `docker compose up -d postgres-test` |
| Tests fail with `relation "User" does not exist` | Migrations were never applied to the test DB | Run `npm run test:migrate` manually, or just `npm test` (it runs this automatically via `pretest`) |
| Jest can't resolve an import like `"../db.js"` | Missing/misconfigured `moduleNameMapper` in `jest.config.cjs` | Confirm the `moduleNameMapper` regex from this repo's `jest.config.cjs` is present — it strips `.js` so Jest resolves to the real `.ts` file |
