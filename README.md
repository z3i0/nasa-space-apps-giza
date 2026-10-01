# NASA Space Apps Giza

Official platform for **NASA Space Apps Giza**, built with **Next.js 16**, **NestJS 12**, **Tailwind CSS v4**, and **shadcn/ui** with native **RTL (Right-to-Left)** support.

---

## 🏗 Project Architecture

This project is organized as a lightweight, clean **pnpm workspace monorepo**:

```text
nasa-space-apps-giza/
├── apps/
│   ├── web/                    # Next.js 16 (React 19, Turbopack, App Router)
│   │   ├── app/                # App Router (layout, globals.css, RTL setup)
│   │   ├── components/         # UI components & ThemeProvider
│   │   │   └── ui/             # shadcn/ui components (button, direction, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── lib/                # Shared utilities (cn helper)
│   │   ├── components.json     # shadcn/ui configuration (preset b1Z5dIIxk, RTL enabled)
│   │   ├── next.config.ts      # Next.js configuration
│   │   └── package.json
│   │
│   └── api/                    # NestJS 12 (TypeScript, ESM, Express, Vitest)
│       ├── src/                # Controllers, services, and modules
│       │   ├── app.controller.ts
│       │   ├── app.module.ts
│       │   ├── app.service.ts
│       │   └── main.ts         # Global prefix `/api`, CORS enabled, Port 4000
│       ├── test/               # E2E & unit tests
│       ├── nest-cli.json       # Nest CLI configuration
│       └── package.json
│
├── package.json                # Root workspace configuration & unified scripts
├── pnpm-workspace.yaml         # Workspace packages definition
├── .env.example                # Workspace environment variable template
└── .gitignore                  # Git ignore rules
```

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `v20+` (Tested on `v24`)
- **pnpm**: `v9+` or `v10+`

### 2. Installation
Install all dependencies across the workspace:
```bash
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to create local environment files:
- For web: `apps/web/.env.example` -> `apps/web/.env.local`
- For api: `apps/api/.env.example` -> `apps/api/.env`

---

## 🛠 Available Scripts

From the repository root:

| Command | Description |
| :--- | :--- |
| `pnpm dev` | Runs both **Next.js** (`localhost:3000`) and **NestJS** (`localhost:4000/api`) concurrently |
| `pnpm dev:web` | Runs the Next.js frontend only |
| `pnpm dev:api` | Runs the NestJS API backend only |
| `pnpm build` | Builds both Next.js and NestJS production bundles |
| `pnpm build:web` | Builds Next.js frontend only |
| `pnpm build:api` | Builds NestJS backend only |
| `pnpm lint` | Runs ESLint on frontend and Oxlint on backend |
| `pnpm format` | Formats code using Prettier across the workspace |

---

## 🎨 Design System & RTL

- **shadcn/ui Preset**: Initialized using preset `b1Z5dIIxk` with `--rtl` and `--pointer`.
- **RTL Support**: Built-in `@base-ui/react/direction-provider` wrapped via `DirectionProvider` in `apps/web/app/layout.tsx`.
- **Typography**: Supports Arabic typography via `Noto_Sans_Arabic` alongside `Geist` fonts.
- **Tailwind CSS v4**: Theme tokens defined via CSS variables with light and dark mode toggles.
