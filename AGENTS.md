# AGENTS.md

JezArch — full-stack archival management system (documents, units, notes, tags, descriptive signatures) built with Bun, React, TypeScript, and SQLite.

## Setup commands

All commands run from the repo root via Bun through the cross-platform runner `scripts/run.ts` (identical on Windows/macOS/Linux):

- Install deps: `bun run install`
- Start dev:    `bun run start:dev` (builds frontend once, runs backend from source)
- Build:        `bun run build` (prod: minified frontend + backend bundle into `backend/dist`)
- Test:         `bun run test` (typecheck, then code tests)
- Typecheck:    `bun run test:types` (`tsc --noEmit` for frontend and backend)
- Seed data:    `bun run seed:en` / `bun run seed:pl`

Backend CLI args pass after `--`, e.g. `bun run start:dev -- --http-port 9000`.

## Project layout

- `backend/` — Bun + TypeScript API server (SQLite, zod); entry `src/main.ts`
- `frontend/` — React 19 SPA (Tailwind CSS 4, Radix-based UI components)
- `backend-tests/` — backend test suite (`bun test`), with `helpers.ts` / `setup.ts`
- `scripts/` — cross-platform command runner (`run.ts`) and seed scripts
- `doc/` — user-facing docs in English and Polish

## Code style

- TypeScript strict mode in both `frontend/tsconfig.json` and `backend/tsconfig.json` (incl. `noUncheckedIndexedAccess`)
- ESM modules; no ESLint/Prettier config — follow the style of neighboring files
- Frontend: Tailwind CSS 4 + shadcn-style components in `frontend/src/components/ui/`; i18n strings in `frontend/src/translations/data/{en,pl}/`
- Backend: feature modules under `backend/src/functionalities/<feature>/` (routes/controllers/db/models); zod schemas for validation

## Testing instructions

- Code tests: `bun run test:code` (`bun test` — frontend `src/**/*.test.*`, backend `backend-tests/tests/*.test.ts`)
- Typecheck: `bun run test:types`
- Add tests for every new behavior — see existing files in `backend-tests/tests/`
- All tests must pass before opening a PR

## PR & commit conventions

- Branch from `main`; never push to it directly
- No CI is configured — run `bun run test` locally before pushing
- Open the PR via `gh pr create` once tests are green

## Security

- Never commit secrets — `.env` and SQLite databases (`*.db*`) are in `.gitignore`
- Passwords are hashed with bcryptjs; never log credentials or session tokens
