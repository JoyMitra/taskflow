FROM node:20-slim AS build
WORKDIR /app

# Prisma's query engine needs openssl present on Debian slim images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package.json ./
RUN npm install
COPY . .

# Generates the Prisma Client into node_modules based on prisma/schema.prisma.
# Does NOT touch the database — no DATABASE_URL is needed at build time.
RUN npx prisma generate

RUN npx tsc

FROM node:20-slim
WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/package.json ./package.json

EXPOSE 3000

# Runs pending migrations against whatever DATABASE_URL Coolify injects at
# runtime, then starts the server. This is why DATABASE_URL only needs to
# exist as a runtime env var, not a build-time one.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
