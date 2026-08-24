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

2.  **Install Dependencies:** Navigate to the `backend` and `frontend` directories separately and install dependencies using Bun.

    *   **Backend:**
        ```bash
        cd backend
        bun install
        cd ..
        ```

    *   **Frontend:**
        ```bash
        cd frontend
        bun install
        cd ..
        ```

---

### Windows

1.  **Install Bun:** Follow the Windows installation guide on the [Bun website](https://bun.sh/docs/installation#windows). Typically involves running a command in PowerShell.
2.  **Install Dependencies:** Open your terminal (like PowerShell or Command Prompt), navigate to the project directory, and run the `bun install` commands for `backend` and `frontend` as shown above.

### macOS

1.  **Install Bun:** Follow the macOS installation guide on the [Bun website](https://bun.sh/docs/installation#macos). Usually a single command in the Terminal.
2.  **Install Dependencies:** Open Terminal, navigate to the project directory, and run the `bun install` commands for `backend` and `frontend` as shown above.

### Linux

1.  **Install Bun:** Follow the Linux installation guide on the [Bun website](https://bun.sh/docs/installation#linux). Usually involves `curl` or another package manager. Make sure unzip is installed (`sudo apt install unzip` or similar).
2.  **Install Dependencies:** Open your terminal, navigate to the project directory, and run the `bun install` commands for `backend` and `frontend` as shown above.

---

## Running the Application

You can either start both servers with one command from the repository root, or run them individually.

### Quick Start (Development)

From the repository root:

```bash
bun run dev
```

This starts the **backend** API server and the **frontend** development server concurrently. Check the console output for the URLs (backend defaults to HTTP 8080; the frontend dev server prints its own address and proxies/builds on the fly).

### Backend Only (Development)

This mode uses Bun's built-in file watcher for hot reloading (frontend might require manual refresh depending on changes).

1.  Navigate to the `backend` directory:
    ```bash
    cd backend
    ```
2.  Start the backend server:
    ```bash
    bun run dev
    ```
    *   This typically runs the `src/main.ts` script.
    *   The server will listen on the configured HTTP/HTTPS ports (default: HTTP 8080, HTTPS 8443). Check the console output for the exact URLs.
    *   The backend serves the frontend files from the `frontend/dist` directory (the frontend build script places files there).

3.  Access the application in your browser at `http://localhost:8080` (or the configured port).

> **Note:** In this mode you need to build the frontend at least once (`cd frontend && bun run build`) so that `frontend/dist` exists, otherwise only the API will be available.

### Production Mode

For production, you typically build optimized frontend assets and run the backend server directly.

1.  **Build Frontend:** Navigate to the `frontend` directory and run the build script:
    ```bash
    cd frontend
    bun run build # Or your specific build command if different
    cd ..
    ```
    *   This creates optimized static files in `frontend/dist`.

2.  **Build Backend (Optional but Recommended):** Bundle the backend into a single file for potentially better performance. Navigate to the `backend` directory:
    ```bash
    cd backend
    bun run build
    cd ..
    ```
    *   This uses `Bunfile.js` and creates `backend/dist/server.js`.

3.  **Run Backend:**
    *   **If you built the backend:**
        ```bash
        cd backend
        bun run dist/server.js [optional --arguments]
        ```
    *   **If you skip the backend build:**
        ```bash
        cd backend
        bun run src/main.ts [optional --arguments]
        ```
    *   Replace `[optional --arguments]` with any command-line arguments needed (e.g., `--http-port 80`, `--https-key-path /path/to/key`). The full list is documented in the "Command Line Arguments" section of the root [REQUIREMENTS.md](../../REQUIREMENTS.md).

4.  Access the application in your browser at the configured production URL and port.

---

## Initial Setup

*   On the first run, the application will create the SQLite database file (e.g., `jezarch.sqlite.db` in the `backend` directory, unless configured otherwise).
*   An initial administrator account is created automatically:
    *   **Login:** `admin`
    *   **Password:** taken from the `JEZARCH_INITIAL_ADMIN_PASSWORD` environment variable if set; otherwise a strong random password is generated and **printed once to the server console** during startup.
*   **Copy the generated password immediately — it is not shown again.** You can change it later with the "Change Password" option in the user dropdown menu in the header.

### Seeding Demo Data (Optional)

The backend provides scripts that populate a freshly installed instance with demo content via the API (the server must be running):

```bash
cd backend
SEED_ADMIN_PASSWORD=<admin-password> bun run seed      # English demo data
SEED_ADMIN_PASSWORD=<admin-password> bun run seed:pl   # Polish demo data
```

The admin password is read from `SEED_ADMIN_PASSWORD`, from the CLI argument after the optional server URL (`bun run seed [url] [admin-password]`), or falls back to `JEZARCH_INITIAL_ADMIN_PASSWORD` if the server was started with it.
