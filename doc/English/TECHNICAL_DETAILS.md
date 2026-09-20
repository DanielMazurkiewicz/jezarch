# JezArch Technical Details

This document provides a brief overview of the technical stack and configuration concepts for JezArch.

## Technology Stack

*   **Runtime:** [Bun](https://bun.sh/) (JavaScript/TypeScript runtime, bundler, package manager, test runner)
*   **Backend:**
    *   Language: TypeScript
    *   Framework: Bun's native HTTP server API
    *   Database: SQLite (via `bun:sqlite`)
    *   Validation: Zod
    *   Password Hashing: BcryptJS (via `bcryptjs` compatible with Bun)
*   **Frontend:**
    *   Library: React 19
    *   Language: TypeScript
    *   UI Components: [Shadcn UI](https://ui.shadcn.com/) (built upon Radix UI and Tailwind CSS)
    *   Styling: Tailwind CSS v4 (processed via `bun-plugin-tailwind`)
    *   Routing: React Router DOM
    *   Forms: React Hook Form
    *   Validation: Zod
    *   State Management: React Context API (`AuthContext`)
    *   Build Tool: Custom Bun script (`frontend/build.ts`) using `Bun.build` API
*   **Localization:** Custom translation system using `intl-messageformat`.

---

## Configuration Precedence

Application parameters (ports, database path, language, HTTPS settings) are determined using the following order of precedence (highest priority first):

1.  **Command-Line Arguments:** Flags passed when running the backend server (e.g., `--http-port 9000`). See `bun run src/main.ts --help` in the `backend` directory for options.
2.  **Environment Variables:** System environment variables (e.g., `JEZARCH_HTTP_PORT=9000`).
3.  **Database Configuration:** Values stored in the `config` table in the SQLite database (managed via the Admin Panel -> App Settings).
4.  **Default Values:** Hardcoded defaults defined in `backend/src/initialization/app_params.ts`.

The final, effective parameters used by the running application are logged to the console on server startup.

### Environment Variables

*   `JEZARCH_DB_PATH` — SQLite database path (default `./jezarch.sqlite.db`).
*   `JEZARCH_HTTP_PORT` — HTTP port (default 8080).
*   `JEZARCH_HTTPS_PORT` — HTTPS port (default 8443).
*   `JEZARCH_HTTPS_KEY_PATH` / `JEZARCH_HTTPS_CERT_PATH` / `JEZARCH_HTTPS_CA_PATH` — HTTPS key, certificate, and CA chain paths (PEM). Non-existent paths are ignored.
*   `JEZARCH_DEFAULT_LANGUAGE` — default language (`en`/`pl`).
*   `JEZARCH_INITIAL_ADMIN_PASSWORD` — bootstrap `admin` password; if unset a random one is printed once on first start.
*   `JEZARCH_RATE_LIMIT_DISABLED` — set to remove login/registration rate limiting (testing only).
*   `SEED_ADMIN_PASSWORD` — admin password used by the demo-data seed scripts when no positional argument is given.

---

## Database

*   Uses SQLite for data storage.
*   The database file location defaults to `backend/jezarch.sqlite.db` but is configurable.
*   Employs `PRAGMA foreign_keys = ON` for relational integrity.
*   Defaults to `PRAGMA journal_mode = WAL` (Write-Ahead Logging) for improved concurrency, allowing reads while writes are occurring.

---

## API Overview

The backend exposes a RESTful API under the `/api` prefix. Key resource endpoints include:

*   `/api/user/...` (Authentication, User Management)
*   `/api/session/validate` (Session Validation)
*   `/api/configs/...` (Application Configuration)
*   `/api/logs/...` (System Logs)
*   `/api/tag/...`, `/api/tags` (Global Tags)
*   `/api/note/...` (Notes)
*   `/api/signature/component/...` (Signature Components)
*   `/api/signature/element/...` (Signature Elements)
*   `/api/archive/document/...` (Archive Documents/Units)
*   `/api/admin/db/...` (Database Administration)

Authentication is handled via a session token passed in the `Authorization` header (either bare or as `Bearer <token>`). Tokens are obtained via `POST /api/user/login` and expire after 24 hours; the server stores only the SHA-256 hash of the token. Sessions can be checked with `GET /api/session/validate`. Specific endpoints require different user roles (`admin`, `employee`, or `user`) for access.

On first start the application bootstraps an initial `admin` account: the password comes from `JEZARCH_INITIAL_ADMIN_PASSWORD` if set, otherwise a strong random password is generated and printed once to the console.
