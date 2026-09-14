# Lead Scout

Русскоязычная CRM для поиска, оценки и распределения потенциальных клиентов на разработку сайтов.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/lead-scout-desktop` — основной интерфейс программы.
- `artifacts/api-server/src/routes/leads.ts` — API авторизации, поиска, лидов и панели владельца.
- `lib/api-spec/openapi.yaml` — контракт API.

## Architecture decisions

- Общий сервер отвечает за атомарное закрепление компании, чтобы один лид не выдавался двум менеджерам.
- Бесплатные источники используются без обхода CAPTCHA, авторизации, robots.txt и блокировок.
- Рейтинг перспективности должен быть объяснимым: интерфейс показывает причины оценки и обнаруженные проблемы сайта.

## Product

Вход владельца и менеджеров, поиск по стране/городу/отрасли, ранжирование компаний, закрепление, контакты, заметки, статусы воронки и административный обзор.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
