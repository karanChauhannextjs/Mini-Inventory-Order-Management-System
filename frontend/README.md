# Frontend — Admin panel

React admin UI with **TanStack Query**, **TanStack Table**, and **shadcn/ui** (Tailwind + Radix).

## Stack

- React 18 + Vite 5
- `@tanstack/react-query` — server state, mutations, cache invalidation
- `@tanstack/react-table` — data tables via shared `DataTable` component
- shadcn-style components in `src/components/ui/` (Button, Card, Dialog, Select, Sidebar, etc.)

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Backend should run on port 5000. Vite proxies `/api` in development.

## Structure

```text
src/
├── api/           # fetch client + endpoint helpers
├── components/    # layout, DataTable, shadcn ui/
├── pages/         # route screens
└── lib/           # utils, query keys
```
