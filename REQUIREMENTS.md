
## 1. Introduction
This document outlines the requirements for a web application designed to facilitate archival document management, note taking, and document collaboration. The application features role-based access control (RBAC) with admin, employee, and restricted user roles. It is built using a React front-end served by a TypeScript/Bun backend, utilizing SQLite as its primary data store.

## 2. Functional Requirements
*   **User Authentication & Authorization:**
*   **Registration:** The application allows new users to register with a unique login and password. Newly registered users have no role assigned (`null`) and cannot log in until an administrator assigns them a role.
*   **Initial Administrator:** On first start (when no `admin` account exists) the application automatically creates an `admin` account. Its password is taken from the `JEZARCH_INITIAL_ADMIN_PASSWORD` environment variable; if unset, a strong random password is generated and printed to the server console exactly once.
*   **Login:** Registered users can log in using their credentials. A session token (UUID) is returned, valid for 24 hours.
*   **Role-Based Access Control (RBAC):** The system implements three roles:
    *   `admin` — Full access to all features including user management, configuration, and log viewing.
    *   `employee` — Can manage archive documents, signatures, tags, and notes.
    *   `user` — Restricted role; can only view/search archive documents filtered by tags assigned by an administrator.
*   **Admin User Management:** Admin users can:
    *   View a list of all registered users.
    *   Assign and change roles (admin, employee, user, or no role/disabled).
    *   Assign tags to `user`-role accounts to control which documents they can access.
    *   Set passwords for other users.
    *   Set preferred language for other users.
*   **Default Landing Page:** Upon successful login, the application redirects users to the **Dashboard** page by default.
*   **Core Functionalities (Main Screen):** The main screen provides access to the following functionalities via a left-side navigation menu with icons and labels:
    *   **Dashboard:** Overview page with welcome message and quick navigation prompts.
    *   **Archive:** Browse, search, create, edit, and disable archival units and documents. Supports batch tagging, topographic/descriptive signature assignment, and tag-based filtering.
    *   **Signatures:** Define and manage signature components (classification categories like Fonds, Series) and elements (individual items within components). Supports hierarchical parent-child relationships between elements and re-indexing of element indices.
    *   **Tags:** Create and manage global tags used for organizing documents and notes.
    *   **Notes:** Create, read, update, and delete personal notes. Notes can be shared with other users. Supports tag assignment.
    *   **Users Management:** (Admin Only) — Manage user accounts, roles, tags, passwords, and language preferences.
    *   **Database:** (Admin Only) — Download backup of the SQLite database.
    *   **Settings:** (Admin Only) — Configure default language, network ports (HTTP/HTTPS), and HTTPS/SSL paths.
    *   **System Logs:** (Admin Only) — View, search, and purge application logs.
*   **Search Functionality:** Robust search across documents, notes, signature elements, and system logs with various filter conditions (equals, contains, starts with, greater/less than, any-of, contains sequence). Search supports negation (NOT) and multiple criteria combined with AND.
*   **Localization:** The front-end supports both Polish and English languages. Users can select their preferred language through the user menu or admin panel. User-specific language preferences are persisted.

## 3. Non-Functional Requirements
*   **Performance:**
    *   The application responds to user interactions within a reasonable timeframe (e.g., page loads under 3 seconds).
    *   Database queries are optimized for performance using SQLite's WAL mode and foreign keys.
*   **Usability:** The application has an intuitive and user-friendly interface. Navigation is clear and consistent. Built with Shadcn UI components (Radix UI + Tailwind CSS).
*   **Scalability:** While initial scale is not a primary concern, the architecture allows for future scalability to accommodate a growing number of users and data.
*   **Maintainability:** Code is written in TypeScript with static typing, modular structure, and consistent patterns across feature modules (controllers, models, db, routes).
*   **Portability:** The application runs on any platform supported by Bun (Linux, macOS, Windows) without platform-specific dependencies beyond Bun and SQLite. A cross-platform command runner (`scripts/run.ts`, exposed through the root `package.json` scripts) makes setup, build, run, update, test, and seed commands work identically under bash, cmd.exe, and PowerShell.
*   **Deployment:** The backend serves the React front-end files (HTML, CSS, JavaScript) and any static media assets from the `frontend/dist` directory.
*   **HTTPS:** The application supports HTTPS for secure communication over LAN environments via configurable SSL key/certificate file paths.
*   **Localization:** The translation system uses `intl-messageformat` with ICU MessageFormat support for pluralization and gender-aware strings.

## 4. Security Requirements
*   **Password Storage:** User passwords are securely hashed and salted using bcrypt before being stored in the database.
*   **Authentication:** Session-based authentication using opaque UUID tokens stored in the `sessions` table (SHA-256 hash of the token), valid for 24 hours.
*   **Authorization:** Access to functionalities is restricted based on user roles (`admin`, `employee`, `user`) enforced in both backend controllers and frontend routing.
*   **Data Validation:** All user inputs are validated using Zod schemas on both frontend and backend to prevent injection attacks.
*   **Session Management:** Sessions are stored server-side in SQLite as the SHA-256 hash of the session token. The `Authorization` header carries the token (either bare or as `Bearer <token>`), and the session is validated with `GET /api/session/validate`.
*   **SQLite Security:** Foreign keys are enforced via `PRAGMA foreign_keys = ON`. Database uses WAL journal mode for data integrity.
*   **Rate Limiting:** `POST /api/user/login` and `POST /api/user/create` are rate limited to prevent brute-force and spam. The limit can be disabled for testing with the `JEZARCH_RATE_LIMIT_DISABLED` environment variable.

## 5. Database Requirements
*   **Database System:** SQLite is used as the primary data store, accessed via `bun:sqlite`.
*   **Data Persistence:** All application data — including user accounts, sessions, notes, tags, archive documents, signature components/elements, configuration, and logs — is persistently stored in the database.
*   **Database Initialization & Migration:**
    *   If the database file does not exist, the application creates it and performs initial schema setup (table creation).
    *   Tables created include: `users`, `sessions`, `user_allowed_tags`, `notes`, `note_tags`, `tags`, `archive_documents`, `archive_document_tags`, `signature_components`, `signature_elements`, `signature_element_parents`, `config`, `logs`.
*   **Configuration Storage:** Application configuration (default language, ports, HTTPS paths) is stored in the `config` table in the SQLite database. This eliminates the need for external configuration files, though environment variables and CLI arguments can override values.

## 6. Environment Variables
Configuration precedence is **command-line argument > environment variable > database config > default**.

*   `JEZARCH_DB_PATH`: Path to the SQLite database file (overrides the default `./jezarch.sqlite.db`).
*   `JEZARCH_HTTP_PORT`: HTTP server port (default: 8080).
*   `JEZARCH_HTTPS_PORT`: HTTPS server port (default: 8443).
*   `JEZARCH_HTTPS_KEY_PATH`: Path to the HTTPS private key file (PEM). Ignored if the file does not exist.
*   `JEZARCH_HTTPS_CERT_PATH`: Path to the HTTPS certificate file (PEM). Ignored if the file does not exist.
*   `JEZARCH_HTTPS_CA_PATH`: Path to the HTTPS CA chain file (PEM). Optional. Ignored if the file does not exist.
*   `JEZARCH_DEFAULT_LANGUAGE`: Default language code (`en` or `pl`).
*   `JEZARCH_INITIAL_ADMIN_PASSWORD`: Password for the bootstrapped `admin` account on first start. If unset, a strong random password is generated and printed once to the console.
*   `JEZARCH_RATE_LIMIT_DISABLED`: Set to any truthy value (e.g. `1`) to disable rate limiting on login/registration (intended for testing).
*   `SEED_ADMIN_PASSWORD`: Admin password used by the demo-data seed scripts (`scripts/seed-data*.ts`) when the positional arguments are omitted.

## 7. Command Line Arguments
The application accepts the following command-line arguments (highest precedence):
*   `--http-port <number>`: Port for HTTP traffic (default: 8080).
*   `--https-port <number>`: Port for HTTPS traffic (default: 8443).
*   `--db-path <path>`: Path to the SQLite database file (default: `./jezarch.sqlite.db`).
*   `--default-language <code>`: Default language code (default: "en").
*   `--https-key-path <path>`: Path to HTTPS private key file.
*   `--https-cert-path <path>`: Path to HTTPS certificate file.
*   `--https-ca-path <path>`: Path to HTTPS CA chain file.
*   `--log <duration><unit>`: Dump log entries from the last given duration (e.g. `--log 5m`) to the console and exit (does not start the server).
*   `--debug-console`: Print all internal logs (`Log.info`, `Log.error`) to the console.
*   `--help`: Display the help message and exit.

## 8. Technology Stack
*   **Runtime:** [Bun](https://bun.sh/) (JavaScript/TypeScript runtime, bundler, package manager)
*   **Backend:** TypeScript, Bun native HTTP server API, SQLite via `bun:sqlite`, Zod validation, bcryptjs password hashing
*   **Frontend:** React 19, TypeScript, [Shadcn UI](https://ui.shadcn.com/) (Radix UI + Tailwind CSS), React Router DOM, React Hook Form, Zod validation, custom build script via `Bun.build` API
*   **Localization:** Custom translation system using `intl-messageformat` with ICU MessageFormat support, English and Polish translations
*   **Database:** SQLite with WAL mode and foreign key enforcement

## 9. Further Considerations/Open Questions:
*   **Error Handling & Logging:** Application logs are stored in the `logs` table with level, category, user, and optional JSON data. Log viewer available in admin panel. Log purging by age is supported.
*   **Testing:** Unit tests, integration tests, and end-to-end tests are important for quality assurance. Tests run from the repository root with `bun run test` (type checks via `test:types`, then the Bun test runner over frontend + backend via `test:code`).
*   **API Design:** RESTful API under `/api` prefix with consistent patterns across resource endpoints.
*   **Media Storage:** Media files associated with archive documents are referenced via URL strings (not stored as BLOBs).
