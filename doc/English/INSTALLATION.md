# JezArch Installation Guide

This guide provides instructions for installing and running the JezArch application on different operating systems.

## Table of Contents

*   [Prerequisites](#prerequisites)
*   [Installation Steps](#installation-steps)
    *   [Windows](#windows)
    *   [macOS](#macos)
    *   [Linux](#linux)
*   [Running the Application](#running-the-application)
    *   [Quick Start (Development)](#quick-start-development)
    *   [Backend Only (Development)](#backend-only-development)
    *   [Production Mode](#production-mode)
*   [Initial Setup](#initial-setup)

---

## Prerequisites

*   **Bun:** JezArch uses the Bun runtime. You need to install Bun on your system. Visit the [official Bun website](https://bun.sh/) for installation instructions specific to your OS.

---

## Installation Steps

1.  **Clone the Repository:** Obtain the JezArch source code, typically by cloning the Git repository:
    ```bash
    git clone <repository_url>
    cd jezarch-project-directory # Navigate into the project directory
    ```

2.  **Install Dependencies:** From the repository root, run the cross-platform `install` command — it installs dependencies for the root, `backend`, and `frontend`:

    ```bash
    bun run install
    ```

    (Alternatively, `cd backend && bun install`, then `cd ../frontend && bun install`.)

---

### Windows

1.  **Install Bun:** Follow the Windows installation guide on the [Bun website](https://bun.sh/docs/installation#windows). Typically involves running a command in PowerShell.
2.  **Install Dependencies:** Open your terminal (like PowerShell or Command Prompt), navigate to the project directory, and run `bun run install`.

### macOS

1.  **Install Bun:** Follow the macOS installation guide on the [Bun website](https://bun.sh/docs/installation#macos). Usually a single command in the Terminal.
2.  **Install Dependencies:** Open Terminal, navigate to the project directory, and run `bun run install`.

### Linux

1.  **Install Bun:** Follow the Linux installation guide on the [Bun website](https://bun.sh/docs/installation#linux). Usually involves `curl` or another package manager. Make sure unzip is installed (`sudo apt install unzip` or similar).
2.  **Install Dependencies:** Open your terminal, navigate to the project directory, and run `bun run install`.

---

## Running the Application

All commands below are run from the repository root and work identically on Windows (cmd.exe/PowerShell), macOS, and Linux.

### Quick Start (Development)

From the repository root:

```bash
bun run start:dev
```

This builds the **frontend** once (unminified, with source maps) into `frontend/dist` and then starts the **backend** server from source (`src/main.ts`), which serves both the API and the frontend files. Check the console output for the URLs (default: HTTP 8080, HTTPS 8443).

> **Note:** There is no file watcher / live reload. After changing frontend or backend code you must restart `bun run start:dev` to see the changes.

### Backend Only (Development)

This runs the backend from source (`src/main.ts`) without the frontend build step.

1.  Start only the backend, from inside the `backend` directory:
    ```bash
    cd backend
    bun run dev
    ```
2.  The server listens on the configured HTTP/HTTPS ports (default: HTTP 8080, HTTPS 8443). The backend serves the frontend files from the `frontend/dist` directory.

3.  Access the application in your browser at `http://localhost:8080` (or the configured port).

> **Note:** In this mode you need to build the frontend at least once so that `frontend/dist` exists — run `bun run build:dev` from the repository root. Otherwise only the API will be available.

### Production Mode

For production, you typically build optimized frontend assets and the backend bundle, then run the bundle.

1.  **Build everything** from the repository root:
    ```bash
    bun run build:prod
    ```
    *   Removes previous build outputs (clean build).
    *   Builds the frontend (minified) into `frontend/dist`.
    *   Bundles the backend into a single file `backend/dist/server.js`.

2.  **Run the production bundle:**
    ```bash
    bun run start:prod [-- <optional --arguments>]
    ```
    *   If `backend/dist/server.js` does not exist yet, `start:prod` builds everything first.
    *   Replace `<optional --arguments>` with any backend command-line arguments (e.g. `--http-port 80`, `--https-key-path /path/to/key`). The full list is documented in the "Command Line Arguments" section of the root [REQUIREMENTS.md](../../REQUIREMENTS.md).
    *   Running from source instead: `cd backend && bun run src/main.ts [args]`.

3.  Access the application in your browser at the configured production URL and port.

### Testing & Maintenance

From the repository root (works on all platforms):

```bash
bun run test          # type checks (test:types) + frontend/backend tests (test:code)
bun run test:types    # tsc --noEmit for the frontend and the backend
bun run test:code     # bun test over the frontend (if any tests exist) and the backend
bun run clean         # remove build outputs (frontend/dist, backend/dist); `cleanup` is an alias
```

Other root commands: `bun run help` (runner help) and `bun run update` (`git pull` + install + dependency bump). The complete command table is in the [root README](../../README.md).

---

## Initial Setup

*   On the first run, the application will create the SQLite database file (e.g., `jezarch.sqlite.db` in the `backend` directory, unless configured otherwise).
*   An initial administrator account is created automatically:
    *   **Login:** `admin`
    *   **Password:** taken from the `JEZARCH_INITIAL_ADMIN_PASSWORD` environment variable if set; otherwise a strong random password is generated and **printed once to the server console** during startup.
*   **Copy the generated password immediately — it is not shown again.** You can change it later with the "Change Password" option in the user dropdown menu in the header.

### Seeding Demo Data (Optional)

From the repository root, the cross-platform seed commands populate a freshly installed instance with demo content via the API (the server must be running):

```bash
bun run seed [server-url] [admin-password]    # comprehensive English demo data (= seed:en)
bun run seed:en [server-url] [admin-password] # comprehensive English demo data
bun run seed:pl [server-url] [admin-password] # Polish demo data
```

The admin password is read from `SEED_ADMIN_PASSWORD`, from the CLI argument after the optional server URL, or falls back to `JEZARCH_INITIAL_ADMIN_PASSWORD` if the server was started with it. The positional form above works on all platforms (PowerShell/cmd do not support the inline `SEED_ADMIN_PASSWORD=...` syntax).
