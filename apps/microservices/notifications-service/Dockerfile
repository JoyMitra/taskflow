FROM node:20-slim AS build
WORKDIR /app

# Prisma's query engine needs openssl present on Debian slim images
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy shared library
# Copy and build shared library
COPY shared /app/shared
WORKDIR /app/shared
RUN npm install
RUN npm run build

COPY notifications-service/package.json /app/notifications-service/package.json
WORKDIR /app/notifications-service
RUN npm install
COPY notifications-service /app/notifications-service

# prisma generate loads prisma.config.ts, so DATABASE_URL must exist even
# though generate does not connect to the database.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public"

# Generates the Prisma Client into node_modules based on prisma/schema.prisma.
# Does NOT touch the database — the placeholder URL is only for config loading.
RUN npx prisma generate

RUN npx tsc

FROM node:20-slim
WORKDIR /app/notifications-service

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/shared /app/shared
COPY --from=build /app/notifications-service/dist ./dist
COPY --from=build /app/notifications-service/node_modules ./node_modules
COPY --from=build /app/notifications-service/prisma ./prisma
COPY --from=build /app/notifications-service/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/notifications-service/package.json ./package.json

EXPOSE 3003

# Runs pending migrations against whatever DATABASE_URL Coolify injects at
# runtime, then starts the server. This is why DATABASE_URL only needs to
# exist as a runtime env var, not a build-time one.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
