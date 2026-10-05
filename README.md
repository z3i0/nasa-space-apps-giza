# 🚀 NASA Space Apps Giza Platform

[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.6-black?logo=next.js)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.2.8-blue?logo=react)](https://react.dev/)
[![NestJS 12](https://img.shields.io/badge/NestJS-12.0.1-ea2845?logo=nestjs)](https://nestjs.com/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-6.19.3-2d3748?logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![RTL Supported](https://img.shields.io/badge/RTL-Arabic_%26_English-success)](#-internationalization-i18n--rtl)

Official management and participation platform for **NASA Space Apps Challenge — Giza / Cairo Local Event**. Built as a high-performance **pnpm monorepo** featuring role-based portals for Organizers, Judges, Mentors, and Participants, native Arabic RTL support, a modern dark/light space-grade design system, and full-stack authentication.

---

## 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗 Architecture & Tech Stack](#-architecture--tech-stack)
- [📁 Monorepo Directory Structure](#-monorepo-directory-structure)
- [⚡ Quick Start & Installation](#-quick-start--installation)
- [🔑 Demo & Testing Accounts](#-demo--testing-accounts)
- [👥 Role-Based Dashboards](#-role-based-dashboards)
- [🌐 Internationalization (i18n) & RTL](#-internationalization-i18n--rtl)
- [🛡️ Authentication & Authorization (RBAC)](#️-authentication--authorization-rbac)
- [🗄️ Database & Prisma ORM](#️-database--prisma-orm)
- [📡 API Endpoints Reference](#-api-endpoints-reference)
- [🛠️ Available Scripts Reference](#️-available-scripts-reference)
- [📖 دليل التشغيل السريع بالعربية (Quick Arabic Guide)](#-دليل-التشغيل-السريع-بالعربية-quick-arabic-guide)

---

## ✨ Key Features

- **4 Dedicated Role Dashboards**: Custom interfaces, metrics, and workflows tailored for **Organizers**, **Judges**, **Mentors**, and **Participants**.
- **Bilingual & Native RTL Support**: Seamless switching between **Arabic (`ar`)** (RTL default) and **English (`en`)** (LTR) powered by `next-intl` and Base UI direction provider.
- **Glassmorphic Space Aesthetics**: Space-themed dark and light modes with Tailwind CSS v4, CSS variables, and shadcn/ui primitives.
- **Interactive Management Consoles**:
  - **Teams Management**: Search, category filters, live status badges, member expansion, and action modals.
  - **Users Management**: User directory with role assignments, active/inactive status toggling, and audit timestamps.
- **Command Palette (`cmdk`)**: Quick navigation menu (`Ctrl+K` or `Cmd+K`) with role switcher, fast links, and keyboard accessibility.
- **Robust Full-Stack Authentication**: Better-Auth integration with NestJS backend, bcryptjs password hashing, JWT sessions, HTTP cookies, and rate-limiting throttler.
- **Route Protection & RBAC**: Next.js proxy middleware intercepting unauthenticated visits and enforcing role boundaries via `<RoleGuard />` and NestJS `AuthGuard` / `RolesGuard`.
- **Dockerized PostgreSQL**: Instant local database setup using Docker Compose.

---

## 🏗 Architecture & Tech Stack

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        NASA Space Apps Giza Monorepo                   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
   apps/web (Next.js 16)                             apps/api (NestJS 12)
   ├── React 19 + App Router                         ├── TypeScript ESM + Express
   ├── Tailwind CSS v4 + shadcn/ui                   ├── Prisma ORM 6 (PostgreSQL)
   ├── next-intl (Bilingual: AR/EN)                  ├── Better-Auth + JWT Auth Guard
   ├── cmdk (Command Palette)                        ├── NestJS Throttler Rate Limiter
   └── RoleGuard + Proxy Middleware                  └── Vitest Unit & E2E Testing
```

### Frontend (`apps/web`)

- **Framework**: Next.js 16 (React 19, Turbopack, App Router)
- **Styling**: Tailwind CSS v4, PostCSS, Lucide Icons, `tw-animate-css`
- **UI Components**: shadcn/ui preset `b1Z5dIIxk` with `--rtl` and `--pointer` flags
- **Localization**: `next-intl` with language dictionaries in `messages/`
- **Direction Handling**: `@base-ui/react/direction-provider`
- **Client Auth**: `better-auth/react` with session cookie synchronizer

### Backend (`apps/api`)

- **Framework**: NestJS 12 (TypeScript, ESM, Express engine)
- **ORM**: Prisma Client & CLI v6.19
- **Security**: `@nestjs/jwt`, `@nestjs/throttler`, `bcryptjs`
- **Validation**: `class-validator`, `class-transformer`
- **Testing**: Vitest v4 (`vitest`, `vitest.config.e2e.ts`)

### Infrastructure & Database

- **Database**: PostgreSQL 16 Alpine containerized with Docker Compose
- **Package Manager**: `pnpm` (Workspace Monorepo)

---

## 📁 Monorepo Directory Structure

```text
nasa-space-apps-giza/
├── apps/
│   ├── web/                                 # Next.js 16 Frontend
│   │   ├── app/
│   │   │   ├── [locale]/                    # Localized routing root (/ar, /en)
│   │   │   │   ├── dashboard/               # Dashboards module
│   │   │   │   │   ├── organizer/           # Organizer Portal
│   │   │   │   │   │   ├── teams/           # Teams Management Table
│   │   │   │   │   │   ├── participants/    # Users Management Table
│   │   │   │   │   │   └── page.tsx         # Organizer Overview & Analytics
│   │   │   │   │   ├── judge/               # Judge Evaluation Portal
│   │   │   │   │   ├── mentor/              # Mentor Requests & Sessions Portal
│   │   │   │   │   ├── participant/         # Participant Workspace & Submissions
│   │   │   │   │   ├── [role]/              # Dynamic role dashboard fallback
│   │   │   │   │   └── layout.tsx           # Shared Dashboard Shell & Sidebar
│   │   │   │   ├── login/                   # Login Page with Demo Credential Switcher
│   │   │   │   ├── layout.tsx               # Root localized layout with DirectionProvider
│   │   │   │   └── page.tsx                 # Landing / Index Page
│   │   │   └── globals.css                  # Tailwind v4 theme variables
│   │   ├── components/
│   │   │   ├── dashboard/                   # Dashboard components
│   │   │   │   ├── app-sidebar.tsx          # Responsive navigation sidebar
│   │   │   │   ├── dashboard-navbar.tsx     # Top navbar (cmd menu, theme, lang, user)
│   │   │   │   ├── dashboard-config.ts      # Menu items & permissions configuration
│   │   │   │   ├── teams-management-table.tsx # Filterable teams table
│   │   │   │   └── users-management-table.tsx # Interactive user management table
│   │   │   ├── ui/                          # shadcn/ui primitives (button, badge, dialog, etc.)
│   │   │   ├── role-guard.tsx               # RBAC wrapper component
│   │   │   ├── language-switcher.tsx        # Toggle between AR and EN
│   │   │   ├── theme-toggle.tsx             # Toggle Light / Dark / System mode
│   │   │   └── logo.tsx                     # Space Apps Giza logo component
│   │   ├── i18n/                            # next-intl configuration & routing
│   │   ├── messages/
│   │   │   ├── ar/                          # Arabic translation JSONs
│   │   │   └── en/                          # English translation JSONs
│   │   ├── lib/
│   │   │   ├── auth-client.ts               # Better-Auth client configuration
│   │   │   ├── auth.ts                      # Client-side session & cookie helpers
│   │   │   └── utils.ts                     # cn styling utility
│   │   └── proxy.ts                         # Edge route & role protection proxy
│   │
│   └── api/                                 # NestJS 12 Backend
│       ├── src/
│       │   ├── auth/                        # Authentication & RBAC module
│       │   │   ├── dto/                     # Register, Login, Reset, Admin DTOs
│       │   │   ├── guards/                  # AuthGuard & RolesGuard
│       │   │   ├── decorators/              # @CurrentUser, @Public, @RequireRole
│       │   │   ├── auth.controller.ts       # Auth endpoints (/api/auth/*)
│       │   │   ├── admin-users.controller.ts# Admin user actions (/api/admin/users/*)
│       │   │   └── auth.service.ts          # Core authentication business logic
│       │   ├── prisma/                      # PrismaService module
│       │   ├── app.controller.ts            # Root API health controller
│       │   └── main.ts                      # Global prefix (/api), CORS, Port 4000
│       └── prisma/
│           ├── schema.prisma                # PostgreSQL data schema
│           └── seed.ts                      # Database seed script for roles & demo users
│
├── docker-compose.yml                       # PostgreSQL 16 Alpine container
├── package.json                             # Monorepo root scripts & dev dependencies
├── pnpm-workspace.yaml                      # pnpm packages definition
└── .env.example                             # Environment variable template
```

---

## ⚡ Quick Start & Installation

### 1. Prerequisites

- **Node.js**: `v20+` or `v24+` installed ([Download Node.js](https://nodejs.org/))
- **pnpm**: `v9+` or `v10+` (`corepack enable && corepack prepare pnpm@latest --activate`)
- **Docker**: For running the PostgreSQL database ([Download Docker Desktop](https://www.docker.com/))

### 2. Clone & Install Dependencies

```bash
git clone https://github.com/your-org/nasa-space-apps-giza.git
cd nasa-space-apps-giza
pnpm install
```

### 3. Environment Variables

Create the environment files from their examples:

**For the root:**

```bash
cp .env.example .env
```

**For the Web App (`apps/web`):**

```bash
cp apps/web/.env.example apps/web/.env.local
```

_(Default: `NEXT_PUBLIC_API_URL=http://localhost:4000/api`)_

**For the API Backend (`apps/api`):**

```bash
cp apps/api/.env.example apps/api/.env
```

_(Contains default database credentials, JWT secrets, and default organizer account configuration)._

### 4. Start PostgreSQL with Docker

Start the database service in the background:

```bash
pnpm docker:up
```

> **Note**: This starts container `spaceapps-postgres` on port `5432` with database `spaceapps_db`.

### 5. Run Prisma Migrations & Seed Demo Data

Push schema definitions to your PostgreSQL instance and seed the demo accounts and roles:

```bash
pnpm db:push
pnpm db:seed
```

### 6. Launch the Development Environment

Run both frontend and backend concurrently:

```bash
pnpm dev
```

The services will be available at:

- 🌐 **Web Frontend**: [http://localhost:3000](http://localhost:3000)
- ⚙️ **NestJS API**: [http://localhost:4000/api](http://localhost:4000/api)
- 🗃️ **Prisma Studio (Optional)**: Run `pnpm db:studio` and open [http://localhost:5555](http://localhost:5555)

---

## 🔑 Demo & Testing Accounts

The database seed script (`apps/api/prisma/seed.ts`) populates complete demo accounts for each role so you can test all portals immediately:

| Role                  | Email                         | Password                 | Direct Dashboard Link                                                         |
| :-------------------- | :---------------------------- | :----------------------- | :---------------------------------------------------------------------------- |
| **Organizer** (Admin) | `organizer@hackathon.local`   | `OrganizerSecure2026!`   | [`/ar/dashboard/organizer`](http://localhost:3000/ar/dashboard/organizer)     |
| **Judge**             | `judge@hackathon.local`       | `JudgeSecure2026!`       | [`/ar/dashboard/judge`](http://localhost:3000/ar/dashboard/judge)             |
| **Mentor**            | `mentor@hackathon.local`      | `MentorSecure2026!`      | [`/ar/dashboard/mentor`](http://localhost:3000/ar/dashboard/mentor)           |
| **Participant**       | `participant@hackathon.local` | `ParticipantSecure2026!` | [`/ar/dashboard/participant`](http://localhost:3000/ar/dashboard/participant) |

> 💡 **Login Helper**: The login page at [`/login`](http://localhost:3000/ar/login) includes one-click demo credentials buttons to populate credentials automatically.

---

## 👥 Role-Based Dashboards

Each role in the platform has a custom navigation structure, permission scope, and interactive toolkit:

### 1. 🛡️ Organizer Portal (`/dashboard/organizer`)

- **Key Metrics Overview**: Total registered teams, active participants, submitted projects, and scheduled mentorship hours.
- **Teams Management Table (`/dashboard/organizer/teams`)**:
  - Full-text search by team name or project title.
  - Multi-criteria filtering by challenge category and submission status (_Approved_, _Pending_, _Rejected_).
  - Member breakdown with avatar badges and captain badges.
  - Interactive status toggles and team details drawer.
- **Users Management Table (`/dashboard/organizer/participants`)**:
  - Filter participants, mentors, judges, and admins.
  - Toggle user activation (_Active_ / _Inactive_).
  - Dynamic role reassignment and audit timestamps.
- **Quick Action Bar**: Fast actions to broadcast announcements, export reports, and adjust challenge parameters.

### 2. ⚖️ Judge Portal (`/dashboard/judge`)

- **Evaluation Queue**: List of assigned hackathon submissions requiring evaluation.
- **Scoring Metrics**: Summary cards showing total assigned, projects evaluated, pending reviews, and average score given.
- **Judging Rubric**: Breakdown of scoring criteria across 4 pillars:
  - _Impact & Planetary Value_
  - _Technical Feasibility & Innovation_
  - _Use of NASA Open Data_
  - _Presentation & Storytelling_
- **Live Leaderboard**: Real-time ranking of evaluated teams with score aggregation.

### 3. 💡 Mentor Portal (`/dashboard/mentor`)

- **Assigned Teams**: Direct cards for teams under the mentor's technical guidance.
- **Help Requests Queue**: Incoming participant requests with urgency levels, topic tags, and meeting links.
- **Office Hours Schedule**: Calendar tracking upcoming booked sessions.
- **Feedback Submission**: Direct evaluation and milestone note-taking per team.

### 4. 🚀 Participant Portal (`/dashboard/participant`)

- **Team Workspace**: Real-time team roster, project title, repository link, and challenge category.
- **Challenge Progress Timeline**: Milestone tracker from ideation to final submission deadline.
- **Submission Portal Checklist**: Progress indicators for project summary, demo video, GitHub repository, and NASA datasets used.
- **Mentor Request Button**: Instant modal to request specialized help from available mentors.

---

## 🌐 Internationalization (i18n) & RTL

The platform provides full **Right-to-Left (RTL)** and **Left-to-Right (LTR)** support:

- **Library**: `next-intl` with App Router integration.
- **Supported Locales**:
  - `ar`: Arabic (**Default**, Right-to-Left direction).
  - `en`: English (Left-to-Right direction).
- **Direction Handling**: Wrapped with `@base-ui/react/direction-provider` in `apps/web/app/[locale]/layout.tsx`.
- **Typography**: Native Arabic typography utilizing `Noto_Sans_Arabic` alongside `Geist Sans`.
- **Localization Files**:
  ```text
  apps/web/messages/
  ├── ar/
  │   ├── dashboard.json       # All dashboard labels, metrics, and menus
  │   ├── auth.json            # Login, registration, and password forms
  │   ├── role_guard.json      # Access denied messages
  │   ├── home.json            # Landing page translations
  │   └── metadata.json        # SEO and page titles
  └── en/                      # English counterparts
  ```
- **Language Switcher**: Built into the dashboard header for instantaneous switching without state loss.

---

## 🛡️ Authentication & Authorization (RBAC)

The authentication system combines client convenience with backend enterprise security:

1. **Client Layer (`apps/web/lib/auth.ts` & `auth-client.ts`)**:
   - Manages user sessions, auth cookies (`auth_token`, `auth_user`, `auth_roles`, `auth_role`), and localStorage.
   - Synchronizes token cookies across browser tabs via custom window events.

2. **Edge Proxy Middleware (`apps/web/proxy.ts`)**:
   - Detects user session tokens before page rendering.
   - Redirects authenticated users from `/login` directly to their respective role dashboard.
   - Intercepts unauthorized dashboard visits and redirects to `/login`.

3. **Component-Level Guard (`<RoleGuard />`)**:
   - Ensures that even within the dashboard, users cannot access unauthorized pages (e.g. participant attempting to view `/dashboard/organizer`).
   - Displays a bilingual "Access Restricted" alert with a return button.

4. **NestJS Backend Security (`apps/api/src/auth`)**:
   - **`AuthGuard`**: Validates JWT bearer tokens or session tokens.
   - **`RolesGuard` & `@RequireRole(...)`**: Validates role memberships before executing controller handlers.
   - **Rate Limiting**: Configured via `@nestjs/throttler` to prevent brute force attacks on authentication routes.

---

## 🗄️ Database & Prisma ORM

The application uses PostgreSQL with Prisma ORM.

### Data Models (`schema.prisma`):

- **`User`**: Account identity, email, username, password hash, phone, avatar, and active status.
- **`Session`**: Session tokens, expiration, user agent, and IP address logging.
- **`Account`**: OAuth and credential provider linkages.
- **`Role`**: Role definitions (`organizer`, `judge`, `mentor`, `participant`).
- **`UserRole`**: Many-to-many relationship mapping users to system roles.
- **`PasswordResetToken`**: Secure hashed tokens for password recovery.
- **`Verification`**: Email verification tokens.

### Database Management Commands:

| Command            | Description                                                                     |
| :----------------- | :------------------------------------------------------------------------------ |
| `pnpm docker:up`   | Starts the PostgreSQL 16 container                                              |
| `pnpm docker:down` | Stops the PostgreSQL container                                                  |
| `pnpm db:generate` | Generates the Prisma client                                                     |
| `pnpm db:push`     | Pushes the Prisma schema state directly to the database                         |
| `pnpm db:migrate`  | Runs Prisma development migrations                                              |
| `pnpm db:seed`     | Populates default roles, organizer account, and demo users                      |
| `pnpm db:studio`   | Launches visual Prisma Studio at [http://localhost:5555](http://localhost:5555) |

---

## 📡 API Endpoints Reference

Base URL: `http://localhost:4000/api`

### Authentication (`/api/auth`)

| Method | Endpoint                    | Description                          | Access        | Rate Limit   |
| :----- | :-------------------------- | :----------------------------------- | :------------ | :----------- |
| `POST` | `/api/auth/register`        | Register a new user                  | Public        | 10 req / min |
| `POST` | `/api/auth/login`           | Authenticate with email/password     | Public        | 10 req / min |
| `POST` | `/api/auth/refresh`         | Refresh expired access token         | Public        | Standard     |
| `POST` | `/api/auth/logout`          | Invalidate current session           | Authenticated | Standard     |
| `GET`  | `/api/auth/me`              | Get current user profile and roles   | Authenticated | Standard     |
| `POST` | `/api/auth/forgot-password` | Request password reset email         | Public        | 5 req / min  |
| `POST` | `/api/auth/reset-password`  | Submit new password with reset token | Public        | 5 req / min  |

### Administration (`/api/admin/users`)

| Method | Endpoint                     | Description                       | Access           |
| :----- | :--------------------------- | :-------------------------------- | :--------------- |
| `POST` | `/api/admin/users`           | Create user with specific roles   | `organizer` only |
| `POST` | `/api/admin/users/:id/roles` | Assign or update roles for a user | `organizer` only |

---

## 🛠️ Available Scripts Reference

Run these commands from the root directory:

```bash
# Development
pnpm dev                 # Starts Next.js (port 3000) & NestJS (port 4000) concurrently
pnpm dev:web             # Starts Next.js web application only
pnpm dev:api             # Starts NestJS backend API with hot reload only

# Build
pnpm build               # Builds both frontend and backend for production
pnpm build:web           # Builds Next.js frontend only
pnpm build:api           # Compiles NestJS backend only

# Quality & Formatting
pnpm lint                # Runs ESLint (web) and Oxlint (api)
pnpm format              # Formats all code using Prettier across the workspace

# Database & Infrastructure
pnpm docker:up           # Starts PostgreSQL Docker container
pnpm docker:down         # Shuts down PostgreSQL Docker container
pnpm db:push             # Syncs schema to PostgreSQL without creating migration files
pnpm db:migrate          # Applies migrations via Prisma
pnpm db:seed             # Seeds roles, admin, and demo accounts
pnpm db:studio           # Opens visual database explorer (Prisma Studio)

# Testing (apps/api)
pnpm --filter api test       # Runs unit tests with Vitest
pnpm --filter api test:e2e   # Runs end-to-end tests with Vitest
```

---

## 📖 دليل التشغيل السريع بالعربية (Quick Arabic Guide)

منصة **NASA Space Apps Giza** هي منصة متكاملة لإدارة فعاليات الهاكاثون المحلي بمحافظة الجيزة والقاهرة، مبنية بأحدث تقنيات الويب مع دعم كامل للغة العربية والاتجاه من اليمين لليسار (RTL).

### 🚀 خطوات التشغيل في دقائق:

1. **تثبيت الحزم البرمجية:**
   ```bash
   pnpm install
   ```
2. **إعداد ملفات البيئة:**
   - انسخ ملف `.env.example` إلى `.env`
   - انسخ `apps/web/.env.example` إلى `apps/web/.env.local`
   - انسخ `apps/api/.env.example` إلى `apps/api/.env`
3. **تشغيل قاعدة بيانات PostgreSQL عبر Docker:**
   ```bash
   pnpm docker:up
   ```
4. **تحديث قاعدة البيانات وزرع الحسابات التجريبية:**
   ```bash
   pnpm db:push
   pnpm db:seed
   ```
5. **تشغيل بيئة التطوير بالكامل:**
   ```bash
   pnpm dev
   ```

### 👤 الحسابات التجريبية الجاهزة لتسجيل الدخول:

| الدور                     | البريد الإلكتروني             | كلمة المرور              | الرابط المباشر                                                                |
| :------------------------ | :---------------------------- | :----------------------- | :---------------------------------------------------------------------------- |
| **المنظم (Organizer)**    | `organizer@hackathon.local`   | `OrganizerSecure2026!`   | [`/ar/dashboard/organizer`](http://localhost:3000/ar/dashboard/organizer)     |
| **المحكّم (Judge)**       | `judge@hackathon.local`       | `JudgeSecure2026!`       | [`/ar/dashboard/judge`](http://localhost:3000/ar/dashboard/judge)             |
| **المرشد (Mentor)**       | `mentor@hackathon.local`      | `MentorSecure2026!`      | [`/ar/dashboard/mentor`](http://localhost:3000/ar/dashboard/mentor)           |
| **المشارك (Participant)** | `participant@hackathon.local` | `ParticipantSecure2026!` | [`/ar/dashboard/participant`](http://localhost:3000/ar/dashboard/participant) |

---

## 📄 License

This project is licensed under the MIT License. Developed for **NASA Space Apps Challenge — Giza Local Event**.
