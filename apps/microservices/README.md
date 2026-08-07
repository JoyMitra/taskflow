# TaskFlow Microservices

This directory contains the microservices implementation of the TaskFlow application. The monolith has been decomposed into independent services to improve scalability and maintainability.

## Architecture

- **API Gateway**: Routes external requests to the appropriate internal microservices.
- **Users Service**: Manages user accounts and profiles. Publishes `user.created` events to RabbitMQ.
- **Tasks Service**: Handles task lifecycle and assignments. Subscribes to `user.created` to sync local user data. Publishes `notification.send` events to RabbitMQ.
- **Notifications Service**: Manages system notifications. Subscribes to `notification.send` to create notifications.
- **RabbitMQ**: Message broker for asynchronous pub/sub communication between services.
- **Shared Types**: Common TypeScript interfaces shared across all services.

## Prerequisites

- **Node.js** (v20+)
- **Docker** and **Docker Compose**
- **npm** (v10+)

## Local Development

### 1. Initial Setup

Install dependencies from the repository root:

```bash
npm install
```

### 2. Running Services Locally

Navigate to the microservices directory and use Docker Compose to start all services, their databases, and RabbitMQ:

```bash
cd apps/microservices
docker compose up -d
```

This command will:
- Spin up three independent PostgreSQL instances (one for each service).
- Start a RabbitMQ instance for messaging.
- Build and start the `users-service`, `tasks-service`, and `notifications-service`.
- Start the `api-gateway` to orchestrate traffic.

### 3. Service Endpoints

- **API Gateway**: [http://localhost:3000](http://localhost:3000)
- **Users Service**: [http://localhost:3001](http://localhost:3001)
- **Tasks Service**: [http://localhost:3002](http://localhost:3002)
- **Notifications Service**: [http://localhost:3003](http://localhost:3003)

You can verify the API gateway is running by hitting the `/health` endpoint of the API gateway.
The users, tasks, and notifications services cannot be directly accessed. They can only be 
accessed through the proxy routes defined in the API gateway in `api-gateway/src/index.ts`

You can also run `docker ps` to see the running containers and verify if the services are running.
Clean rebuild the services if you made changes and need to restart the services:

```bash
docker compose build --no-cache
```


## Running Tests

Tests run against a dedicated test database container to ensure isolation.

### 1. Start the Test Database

```bash
cd apps/microservices
docker compose up -d postgres-test
```

### 2. Initialize Test Databases

The test suite requires separate databases for each service. Create them using the following command:

```bash
docker exec microservices-postgres-test-1 psql -U taskflow -d postgres -c "CREATE DATABASE taskflow_users_test"
```

```bash
docker exec microservices-postgres-test-1 psql -U taskflow -d postgres -c "CREATE DATABASE taskflow_tasks_test"
```

```bash
docker exec microservices-postgres-test-1 psql -U taskflow -d postgres -c "CREATE DATABASE taskflow_notifications_test;"
```

### 3. Run Migrations & Execute Tests

Generate Prisma clients for a service if you haven't:

```bash
# The command needs a place holder database url
DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder?schema=public" npm run prisma:generate --workspaces --if-present -w users-service
```

To run tests for a specific service:

```bash
npm test -w users-service
```

Relace the service name in -w flag to test every service.

## Deployment in Coolify

The microservices are configured for easy deployment on Coolify using the **Docker Compose** resource type.

1. **New Resource**: In your Coolify project, select **New Resource** -> **Docker Compose**.
2. **Source**: Select your Git repository and the appropriate branch.
3. **Configuration**:
   - **Base Directory**: `/apps/microservices`
   - **Docker Compose File**: `docker-compose.yml` (Coolify should detect this automatically).
4. **Environment Variables**: Ensure all required environment variables (like `DATABASE_URL` and `RABBITMQ_URL`) are correctly set. The `docker-compose.yml` provides sensible defaults for internal networking.
5. **Networking**: 
   - Ensure the `api-gateway` service has a domain assigned in Coolify to allow external access.
   - Internal services communicate using Docker's internal DNS (e.g., `http://users-service:3001`).
6. **Deploy**: Click **Deploy**. Coolify will build the images and start the orchestration.

### Important Note on `tsconfig.json`

Each microservice contains a self-contained `tsconfig.json`. This is critical for Docker builds in Coolify, as it ensures that each service can be built independently within its own context without requiring access to files outside its directory.
