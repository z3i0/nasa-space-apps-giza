# 🌐 NASA Space Apps Giza — Web Frontend

The Next.js 16 frontend application for the **NASA Space Apps Giza** platform.

> 💡 **Full Project Documentation**: For end-to-end setup, environment variables, demo accounts, and architectural overview, see the [Root README.md](../../README.md).

---

## 🛠️ Tech Stack & Features

- **Next.js 16** with React 19, Turbopack, and App Router.
- **Tailwind CSS v4** + PostCSS.
- **shadcn/ui** with custom preset `b1Z5dIIxk` (`--rtl` & `--pointer` flags enabled).
- **Internationalization (i18n)**:
  - English (`en`) & Arabic (`ar` — default) powered by `next-intl`.
  - Native RTL support handled via `@base-ui/react/direction-provider`.
- **Theme Support**: Seamless Dark Mode / Light Mode with CSS custom properties.
- **Command Palette**: Global `cmdk` dialog for quick navigation (`Ctrl+K` / `Cmd+K`).
- **Role Portals**:
  - Organizer Dashboard (`/[locale]/dashboard/organizer`)
  - Judge Dashboard (`/[locale]/dashboard/judge`)
  - Mentor Dashboard (`/[locale]/dashboard/mentor`)
  - Participant Dashboard (`/[locale]/dashboard/participant`)
- **Route & Role Guarding**:
  - Middleware proxy in `proxy.ts` for session verification and automatic redirects.
  - `<RoleGuard />` client-side component protecting role routes.

---

## 🚀 Running Locally

```bash
# From workspace root:
pnpm dev:web

# Or from apps/web directory:
pnpm dev
```

Frontend will run on [http://localhost:3000](http://localhost:3000).

---

## 📜 Available Scripts

| Script           | Description                                      |
| :--------------- | :----------------------------------------------- |
| `pnpm dev`       | Starts Next.js development server with Turbopack |
| `pnpm build`     | Compiles production bundle                       |
| `pnpm start`     | Runs compiled production server                  |
| `pnpm lint`      | Runs ESLint                                      |
| `pnpm format`    | Formats code with Prettier                       |
| `pnpm typecheck` | Runs TypeScript validation (`tsc --noEmit`)      |
