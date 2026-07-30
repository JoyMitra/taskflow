# Learning Software Architecture Patterns with TypeScript + Coolify

A hands-on lesson plan based on Martin Fowler's Application Architecture guide
(https://martinfowler.com/architecture/), built around one evolving project
rather than throwaway examples per pattern.

## The Project: "TaskFlow"

A minimal task-management app with three natural domains:
- **Users** — accounts, auth
- **Tasks** — CRUD, assignment, status
- **Notifications** — "task assigned to you", "task due soon"

This is deliberately simple. The point isn't the app — it's watching the same
three features get re-architected across modules. Small enough to rebuild
pieces without burning a weekend; rich enough to have real service boundaries.

### Stack
- **Backend:** Node.js + TypeScript, Fastify (lighter than Express, first-class
  TS support, easy to containerize)
- **ORM/DB access:** Prisma + PostgreSQL (Coolify one-click deploys Postgres)
- **Frontend:** React + TypeScript + Vite
- **Repo structure:** a single monorepo using npm workspaces —
  `apps/backend-monolith`, `apps/users-service`, `apps/tasks-service`,
  `apps/notifications-service`, `apps/web-account`, `apps/web-tasks`, etc.
  Each folder gets its own `Dockerfile` so Coolify can deploy it as an
  independent resource even though the code lives in one repo. This avoids
  repo-sprawl while still giving you real independent-deployment practice.
- **Deployment:** Coolify, one VPS, one resource per service/frontend

### Why a monorepo instead of separate repos per service
Separate repos are "more realistic" for true microservices, but they add
overhead (cross-repo versioning, shared type duplication) that isn't the
point of this exercise. A monorepo with per-folder Dockerfiles gives you
independent Coolify deployments — which is the property you're actually
trying to learn — without the repo-management tax. You can always split
repos later once the pattern itself is second nature.

---

## Module 0 — Setup (½ day)
**Goal:** Coolify running on a real Linux VPS, monorepo scaffolded, one
shared TS config, and a "hello world" service deployed end-to-end — so
every later module starts from working infrastructure, not setup debugging.

Running on a VPS from the start (rather than locally on your Mac) avoids
the Docker Desktop / Linux-VM complications that come with self-hosting
Coolify on macOS — see the note at the end of this module if you want the
local option anyway.

### Step 1 — Provision the VPS
- Provider: **DigitalOcean** — sign up and claim the $200/60-day trial
  credit for new accounts, which comfortably covers this whole lesson
  plan's timeline for free
- Create a **Droplet**: choose a size around 4 vCPU / 8GB RAM (a
  general-purpose or basic Droplet in that range) — enough headroom to
  run Coolify plus several services and databases at once
- OS: **Ubuntu 24.04 LTS** — the most widely tested option for Coolify
- **Set a billing alert** in DigitalOcean's billing settings and note the
  credit's expiration date, so an unattended Droplet doesn't quietly start
  charging you once the trial ends
- During creation, add your Mac's SSH public key so you can log in
  without a password. If you don't have one yet:
  ```bash
  ssh-keygen -t ed25519 -C "your_email@example.com"
  ```
- Note the Droplet's public IP once it's created

### Step 2 — Install Coolify
SSH into the box as root:
```bash
ssh root@<your-server-ip>
```
Run the official one-line installer:
```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```
This installs Docker Engine, Traefik (reverse proxy), and the Coolify
dashboard itself. When it finishes, it prints a dashboard URL — typically:
```
http://<your-server-ip>:8000
```
Open that in your browser, create your admin account, and **immediately
disable public registration** in Settings → Configuration so no one else
can sign up on your instance.

### Step 3 — Confirm the server
Coolify auto-registers the machine it's installed on as `localhost` in
its own dashboard (this is Coolify's internal name for "the server I'm
running on," not your Mac). Go to **Servers**, select it, and click
**Validate Server** — Coolify SSHs into itself and runs a health check.
You should see a green confirmation.

### Step 4 — Connect Git
Go to **Sources** and connect GitHub (OAuth app or personal access token).
This lets Coolify auto-deploy on push later. You can skip this for now and
deploy from a public repo URL manually if you'd rather wire it up once
you have real code.

### Step 5 — Scaffold the monorepo (on your Mac)
```bash
mkdir taskflow && cd taskflow
npm init -y
mkdir -p apps/hello-world packages/shared-types
```
Set up npm workspaces by adding a `"workspaces"` field to the root
`package.json` (created by `npm init -y` above):
```json
{
  "name": "taskflow",
  "private": true,
  "version": "1.0.0",
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```
Create a root `tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  }
}
```
**What this root config is actually for:** local development only — a
consistent editor/type-checking experience across every service in the
repo, and (later) a base for `npm run` scripts across workspaces. It is
**not** visible to any individual service's Docker build (see Step 6's
note on build context), so don't expect services to `extend` it once
they're containerized.

Create a root `.gitignore` before your first commit:
```gitignore
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
.vscode/
.idea/
*.tsbuildinfo
```

`packages/shared-types` will hold cross-service interfaces (`User`,
`Task`, `Notification`) once you get to Module 2 — leave it empty for now
(empty directories aren't tracked by Git, so it simply won't appear in
the repo until it has real files in it — that's expected, not a bug).

### Step 6 — Build the "hello world" service
Inside `apps/hello-world`:
```bash
npm init -y
npm install fastify
npm install -D typescript tsx @types/node
```
`apps/hello-world/src/index.ts`:
```typescript
import Fastify from "fastify";

const app = Fastify();

app.get("/", async () => {
  return { status: "ok", message: "hello from taskflow" };
});

const port = Number(process.env.PORT) || 3000;
app.listen({ port, host: "0.0.0.0" }, (err) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
});
```

`apps/hello-world/tsconfig.json` — **self-contained, do not `extend` the
root config here:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```
**Why not `extend "../../tsconfig.base.json"`:** when you set a service's
base directory in Coolify (Step 7), that subdirectory becomes the Docker
**build context** — Docker literally cannot see anything outside it, so a
relative path reaching up to the repo root will fail during the build with
`Cannot read file '/tsconfig.base.json'`, even though the file exists in
your repo. Each service's `tsconfig.json` needs to be fully self-contained
duplicating the handful of compiler options from the base config. This is
a real tradeoff (a little repetition) for real independent deploys — see
the note at the end of this module for the alternative (Docker Compose)
and why it's not the right choice for the microservices modules ahead.

`apps/hello-world/Dockerfile`:
```dockerfile
FROM node:20-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
RUN npx tsc

FROM node:20-slim
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**Test locally before pushing anything** — this catches config and path
mistakes in seconds instead of a full Coolify deploy-and-read-logs cycle:
```bash
# quick check: does the TypeScript compile at all?
npx tsc
node dist/index.js
# in another terminal:
curl http://localhost:3000

# fuller check: does it work in the actual container Coolify will build?
docker build -t hello-world-test .
docker run -p 3000:3000 hello-world-test
curl http://localhost:3000
```
Both should return `{"status":"ok","message":"hello from taskflow"}`. Only
commit and push once this works locally.

Push to a GitHub repo (create the repo on GitHub first or after — either
order works, just make sure `.gitignore` is in place before your first
`git add .` so `node_modules` never gets committed):
```bash
git init
git add .
git commit -m "initial scaffold with hello-world service"
git remote add origin https://github.com/<your-username>/taskflow.git
git branch -M main
git push -u origin main
```

### Step 7 — Deploy it to Coolify
- **Projects → New Project** (Coolify defaults the name to "My first
  project" — this is fine to click through as-is; rename it to `taskflow`
  afterward in the project's Settings)
- Inside the project, **New Resource → Application**
- Server: **This machine** (Coolify running on the same Droplet you want
  to deploy to — "Remote Server" and "Hetzner Cloud" don't apply here)
- Repository: `https://github.com/<your-username>/taskflow.git` — note
  this only works if the repo is **public**; a private repo needs the
  GitHub connection from Step 4 instead of a bare URL
- Branch: `main`
- **Base directory: `/apps/hello-world`** — this is also what scopes the
  Docker build context to that subfolder (see Step 6's note)
- Build pack: **Dockerfile** (since you wrote one explicitly)
- **Domains:** leave whatever Coolify auto-assigns (an IP:port or a
  generated subdomain) — you only need a real custom domain once you own
  one and want proper HTTPS via Let's Encrypt, not for this checkpoint
- Deploy

### Checkpoint
- Coolify gives you a URL (or you assign one) — hitting it returns your
  `{ status: "ok", ... }` JSON
- Push a small change (e.g., edit the message string), redeploy, and
  confirm it updates within a minute or two
- You now have: a working VPS, a working Coolify instance, a monorepo
  structure ready for more services, and a proven Dockerfile pattern
  you'll reuse for every service from here on

### Why not just use Docker Compose for the whole monorepo?
It's tempting, since a single Compose file with `context: .` (repo root)
would let every service's Dockerfile freely reach shared files like
`tsconfig.base.json` or `packages/shared-types` without duplication.
The catch: a Compose file is **one Coolify resource** — clicking "Deploy"
redeploys everything in it together, which directly defeats the
independent-redeploy property Module 2 is built to demonstrate. Stick
with separate Application resources per service and accept the small
config duplication; revisit Compose later only for things that
genuinely belong together as a unit (e.g., a database plus its
migration container).

### If you want to try it locally instead
Running Coolify on your Mac isn't officially supported directly — you'd
need to spin up a Linux VM first (via UTM, Multipass, or Lima), then
install Coolify inside that VM exactly as in Step 2 above. It works, but
adds a layer of VM networking troubleshooting that has nothing to do with
the architecture patterns you're here to learn. Worth doing only if the
VPS cost is a real blocker, or if you specifically want the local-dev
experience later on.

---

## Module 1 — Monolith (2–3 days)
**Goal:** Baseline. One Fastify app, one Postgres DB, users + tasks +
notifications all in one process.

- Build `POST /users`, `POST /tasks`, `GET /tasks`, a naive notification
  written directly to a `notifications` table on task assignment
- Deploy as a single Coolify resource with an attached Postgres

**Checkpoint:** working end-to-end app, one deployable unit. Note the
deploy time and what "redeploy" means here (whole app redeploys for any
change).

---

## Module 2 — Microservices (3–5 days)
**Goal:** Split the monolith into `users-service`, `tasks-service`,
`notifications-service`, each with its own DB, each its own Coolify resource.

- Each service is a small Fastify app exposing its own REST API
- `tasks-service` calls `users-service` over HTTP to validate assignees
  (deliberately naive — you'll feel *why* this is fragile)
- Add a thin API gateway (Fastify or Traefik) in front, so the frontend
  talks to one URL
- Redeploy just `tasks-service` after a change and confirm the others are
  untouched

**Checkpoint:** compare redeploy time/blast-radius to Module 1. This
contrast is the whole lesson.

---

## Module 3 — Micro Frontends (2–3 days)
**Goal:** Split the UI the same way you split the backend.

- `web-account` (React+TS) — login/profile, talks to `users-service`
- `web-tasks` (React+TS) — task board, talks to `tasks-service`
- Compose them behind one domain via path-based routing (`/account`,
  `/tasks`) at the reverse-proxy layer, OR try Module Federation for
  client-side composition if you want the harder version
- Deploy each as its own Coolify resource

**Checkpoint:** you can redeploy `web-tasks` without touching `web-account`.

---

## Module 4 — GUI Architecture: MVC/MVP/MVVM (1–2 days)
**Goal:** Make an implicit pattern explicit, inside one service.

- Take `web-tasks` and restructure it with an explicit separation: a "view"
  layer (dumb components), a "presenter/view-model" layer (hooks holding
  state + logic), and a "model" layer (API client + types)
- Compare against `web-account`, which you'll leave as a flatter,
  framework-default structure

**Checkpoint:** you can point to which files are "view" vs "logic" in
`web-tasks` and explain why that separation helps testing.

---

## Module 5 — Presentation Domain Data Layering (1–2 days)
**Goal:** Same idea, backend side.

- Refactor `tasks-service` into explicit layers: HTTP handlers (presentation)
  → domain/business logic (validation, assignment rules) → data access
  (Prisma repository functions)
- Leave `users-service` unlayered for comparison

**Checkpoint:** describe what changes if the DB schema shifts — in the
layered service vs. the unlayered one.

---

## Module 6 — Serverless Contrast (1–2 days)
**Goal:** Feel the difference between a long-running service and a
function-style deployment.

- Pull the "send notification" logic out of `notifications-service` into a
  standalone TypeScript function, deployed via Coolify's function/container
  support (or a lightweight OpenFaaS-style setup) rather than an always-on
  process
- Compare cold-start behavior, deploy artifact size, and how it's triggered
  (HTTP call vs. long-running listener)

**Checkpoint:** you can articulate one scenario where this tradeoff wins
and one where it doesn't, for this specific app.

---

## Module 7 — Feature Toggles (½–1 day)
**Goal:** Decouple deploy from release.

- Add a simple flag (config table, or even an env var read at request time)
  gating a new feature — e.g., "task priority levels"
- Deploy the code with the flag off, then flip it on without redeploying

**Checkpoint:** confirm you changed behavior without a Coolify redeploy.

---

## Module 8 — Modularizing React (1–2 days)
**Goal:** Apply the layering idea from Module 4 more deliberately to
`web-tasks`, using established UI patterns (container/presentational split,
custom hooks as view-models) rather than an ad hoc refactor.

**Checkpoint:** a component tree where every file's responsibility is
obvious from its layer.

---

## Capstone — Retrospective (1 day)
Write up, for yourself (or future students, given your teaching background):
- A one-paragraph comparison of each architecture's redeploy blast-radius
- Which pattern you'd pick for TaskFlow if it had to scale to real users
- Which pattern felt like overhead for no benefit at this scale

This module is optional for personal learning but valuable if you want to
turn this into teaching material later — the retrospective is where the
patterns stop being abstract and become judgment calls.

---

## Rough timeline
~3–4 weeks at a relaxed pace (a few hours a few times a week), or roughly
2 weeks if you treat it like a part-time project.

## Suggested first step
Start Module 0 + Module 1 together as one sitting — get Coolify talking to
your monorepo before writing any real business logic.
