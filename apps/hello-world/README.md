# hello-world

A minimal Fastify + TypeScript service. Serves as the first proof-of-life
deployment for the TaskFlow monorepo on Coolify (see Module 0 of the
architecture patterns lesson plan).

## Stack
- Node.js + TypeScript
- Fastify
- Deployed via Coolify, self-hosted on a DigitalOcean Droplet, as a
  standalone Dockerfile-based Application

## Prerequisites

### On your local machine
- **Node.js** (v20+) and **npm** — for running/building the service locally
- **Docker Desktop** (Mac/Windows) or Docker Engine (Linux) — for testing
  the container build before pushing. On Mac, install
  [Docker Desktop](https://www.docker.com/products/docker-desktop/); this
  is separate from and unrelated to the Docker Engine that runs on the
  Droplet — Docker Desktop is only needed here for local testing, not for
  running Coolify itself
- **Git**, and a GitHub account with this repo pushed to it

### On the server (already set up once for the whole project, not per-service)
- A **DigitalOcean Droplet** running Ubuntu 24.04 LTS (this project uses
  the $200/60-day free trial credit for new accounts — see Module 0 for
  sizing and billing notes)
- **Coolify** installed on that Droplet via its one-line installer, which
  sets up Docker Engine and Traefik on the server itself

## Project structure
```
apps/hello-world/
├── src/
│   └── index.ts       # Fastify app
├── Dockerfile
├── tsconfig.json       # self-contained — see note below
├── package.json
└── README.md
```

## Local development

Install dependencies:
```bash
npm install
```

Run in dev mode (no build step, uses tsx):
```bash
npx tsx src/index.ts
```

Or compile and run the built output:
```bash
npx tsc
node dist/index.js
```

Server listens on port `3000` by default (override with `PORT` env var).

Check it's working:
```bash
curl http://localhost:3000
# {"status":"ok","message":"hello from taskflow"}
```

## Testing the Docker build locally (before pushing)

Always verify the container builds and runs locally before pushing —
this catches config issues in seconds instead of a full Coolify
deploy-and-read-logs cycle:

```bash
docker build -t hello-world-test .
docker run -p 3000:3000 hello-world-test
curl http://localhost:3000
```

## Important: `tsconfig.json` is self-contained

This service's `tsconfig.json` does **not** `extend` the repo's root
`tsconfig.base.json`. When Coolify deploys this service with the base
directory set to `apps/hello-world`, that subdirectory becomes the
Docker **build context** — Docker cannot see anything outside it. A
relative `extends` path reaching up to the repo root will fail during
the build with an error like:

```
error TS5083: Cannot read file '/tsconfig.base.json'.
```

So all compiler options needed for this service are duplicated directly
in its own `tsconfig.json` rather than inherited. This is intentional —
a small amount of repetition in exchange for each service staying
independently deployable (no shared file dependency between services).

## Deploying to Coolify

These are the exact settings used for this service's Coolify resource:

1. **Projects** → select (or create) the `taskflow` project
2. **New Resource → Application**
3. **Server:** This machine — Coolify is installed directly on the
   DigitalOcean Droplet, so it deploys to itself rather than a separate
   remote server
4. **Repository:** `https://github.com/<your-username>/taskflow.git`
   (must be a **public** repo if using a bare URL rather than a
   connected GitHub source)
5. **Branch:** `main`
6. **Base directory:** `/apps/hello-world`
   — this scopes both the Coolify deployment *and* the Docker build
   context to this folder
7. **Build pack:** Dockerfile
8. **Domains:** leave the auto-assigned URL (IP:port or generated
   subdomain) unless you have a real domain pointed at this server
9. Click **Deploy**

### Checkpoint
After deploy finishes, hit the assigned URL:
```bash
curl http://<assigned-domain-or-ip>:<port>
# {"status":"ok","message":"hello from taskflow"}
```

Push a small change, redeploy, and confirm the response updates within
a minute or two.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `RUN npx tsc` prints TypeScript's help text and exits 1 | No `tsconfig.json` in this folder | Add a `tsconfig.json` here (see this repo's copy) |
| `error TS5083: Cannot read file '/tsconfig.base.json'` | `tsconfig.json` tries to `extend` a file outside the Docker build context | Make `tsconfig.json` self-contained (no `extends`) — see note above |
| Deploy succeeds but hitting the URL fails/404s | `Domains` not yet resolved, or wrong port exposed | Check the `Domains` field and confirm `EXPOSE`/`app.listen` port match |
