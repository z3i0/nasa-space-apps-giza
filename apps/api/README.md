# ⚙️ NASA Space Apps Giza — Backend API

The NestJS 12 backend API service for the **NASA Space Apps Giza** platform.

> 💡 **Full Project Documentation**: For complete monorepo setup, environment variables, demo accounts, and architecture, see the [Root README.md](../../README.md).

---

## 🛠️ Tech Stack & Features

- **NestJS 12** with TypeScript ESM & Express engine.
- **Prisma ORM 6** connected to PostgreSQL 16.
- **Authentication & RBAC**:
  - Better-Auth integration with password hashing via `bcryptjs`.
  - JWT Access & Refresh Token generation (`@nestjs/jwt`).
  - Guards: `AuthGuard`, `RolesGuard`, and `@RequireRole` decorator.
- **Security & Reliability**:
  - Rate limiting via `@nestjs/throttler` on public authentication endpoints.
  - Global `/api` routing prefix with configurable CORS (`CORS_ORIGIN`).
  - DTO input validation with `class-validator` and `class-transformer`.
- **Testing**: Fast testing via Vitest v4 (`vitest`, `vitest.config.e2e.ts`).

---

## 🚀 Running Locally

```bash
# From workspace root:
pnpm dev:api

# Or from apps/api directory:
pnpm dev
```

API will run on [http://localhost:4000/api](http://localhost:4000/api).

---

## 🗄️ Database & Prisma Commands

```bash
# Generate Prisma Client
pnpm prisma:generate

# Push schema directly to database (development)
pnpm prisma:push

# Run database migrations
pnpm prisma:migrate

# Seed roles, default organizer, and demo users
pnpm prisma:seed

# Open Prisma Studio GUI
pnpm prisma:studio
```

---

## 📜 Available Scripts

| Script                        | Description                                   |
| :---------------------------- | :-------------------------------------------- |
| `pnpm dev` / `pnpm start:dev` | Starts NestJS with file watch mode            |
| `pnpm build`                  | Compiles TypeScript into `dist/`              |
| `pnpm start:prod`             | Runs compiled application from `dist/main.js` |
| `pnpm test`                   | Runs unit tests using Vitest                  |
| `pnpm test:e2e`               | Runs end-to-end tests using Vitest            |
| `pnpm test:cov`               | Generates test coverage report                |
| `pnpm lint`                   | Runs Oxlint type-aware linting                |
| `pnpm format`                 | Formats code with Prettier                    |
