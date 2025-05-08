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
    *   Styling: Tailwind CSS (processed via `bun-plugin-tailwind`)
    *   Routing: React Router DOM
    *   Forms: React Hook Form
    *   Validation: Zod
    *   State Management: React Context API (`AuthContext`)
    *   Build Tool: Custom Bun script (`frontend/build.ts`) using `Bun.build` API
*   **Localization:** Custom translation system using `intl-messageformat`.

---

# (Polish / Polski)

# Szczegóły Techniczne JezArch

Ten dokument zawiera krótki przegląd stosu technologicznego i koncepcji konfiguracyjnych JezArch.

## Stos Technologiczny

*   **Środowisko Uruchomieniowe:** [Bun](https://bun.sh/) (środowisko uruchomieniowe JavaScript/TypeScript, bundler, menedżer pakietów, narzędzie do testowania)
*   **Backend:**
    *   Język: TypeScript
    *   Framework: Natywne API serwera HTTP Bun
    *   Baza Danych: SQLite (przez `bun:sqlite`)
    *   Walidacja: Zod
    *   Haszowanie Haseł: BcryptJS (przez `bcryptjs` kompatybilny z Bun)
*   **Frontend:**
    *   Biblioteka: React 19
    *   Język: TypeScript
    *   Komponenty UI: [Shadcn UI](https://ui.shadcn.com/) (zbudowane na Radix UI i Tailwind CSS)
    *   Stylizacja: Tailwind CSS (przetwarzane przez `bun-plugin-tailwind`)
    *   Routing: React Router DOM
    *   Formularze: React Hook Form
    *   Walidacja: Zod
    *   Zarządzanie Stanem: React Context API (`AuthContext`)
    *   Narzędzie Budowania: Niestandardowy skrypt Bun (`frontend/build.ts`) używający API `Bun.build`
*   **Lokalizacja:** Niestandardowy system tłumaczeń używający `intl-messageformat`.

---

## Configuration Precedence

Application parameters (ports, database path, language, HTTPS settings) are determined using the following order of precedence (highest priority first):

1.  **Command-Line Arguments:** Flags passed when running the backend server (e.g., `--http-port 9000`). See `bun run src/main.ts --help` in the `backend` directory for options.
2.  **Environment Variables:** System environment variables (e.g., `JEZARCH_HTTP_PORT=9000`).
3.  **Database Configuration:** Values stored in the `config` table in the SQLite database (managed via the Admin Panel -> App Settings).
4.  **Default Values:** Hardcoded defaults defined in `backend/src/initialization/app_params.ts`.

The final, effective parameters used by the running application are logged to the console on server startup.

---

## (Polish / Polski) Pierwszeństwo Konfiguracji

Parametry aplikacji (porty, ścieżka bazy danych, język, ustawienia HTTPS) są określane przy użyciu następującej kolejności pierwszeństwa (najwyższy priorytet jako pierwszy):

1.  **Argumenty Linii Poleceń:** Flagi przekazane podczas uruchamiania serwera backendu (np. `--http-port 9000`). Zobacz `bun run src/main.ts --help` w katalogu `backend` dla dostępnych opcji.
2.  **Zmienne Środowiskowe:** Systemowe zmienne środowiskowe (np. `JEZARCH_HTTP_PORT=9000`).
3.  **Konfiguracja Bazy Danych:** Wartości przechowywane w tabeli `config` w bazie danych SQLite (zarządzane przez Panel Administratora -> Ustawienia Aplikacji).
4.  **Wartości Domyślne:** Domyślne wartości zakodowane na stałe w `backend/src/initialization/app_params.ts`.

Ostateczne, obowiązujące parametry używane przez działającą aplikację są logowane do konsoli podczas uruchamiania serwera.

---

## Database

*   Uses SQLite for data storage.
*   The database file location defaults to `backend/jezarch.sqlite.db` but is configurable.
*   Employs `PRAGMA foreign_keys = ON` for relational integrity.
*   Defaults to `PRAGMA journal_mode = WAL` (Write-Ahead Logging) for improved concurrency, allowing reads while writes are occurring.

---

## (Polish / Polski) Baza Danych

*   Używa SQLite do przechowywania danych.
*   Lokalizacja pliku bazy danych domyślnie to `backend/jezarch.sqlite.db`, ale jest konfigurowalna.
*   Wykorzystuje `PRAGMA foreign_keys = ON` dla integralności relacyjnej.
*   Domyślnie używa `PRAGMA journal_mode = WAL` (Write-Ahead Logging) dla lepszej współbieżności, pozwalając na odczyty podczas zapisów.

---

## API Overview

The backend exposes a RESTful API under the `/api` prefix. Key resource endpoints include:

*   `/api/user/...` (Authentication, User Management)
*   `/api/config/...` (Application Configuration)
*   `/api/logs/...` (System Logs)
*   `/api/tags/...` (Global Tags)
*   `/api/note/...` (Notes)
*   `/api/signature/component/...` (Signature Components)
*   `/api/signature/element/...` (Signature Elements)
*   `/api/archive/document/...` (Archive Documents/Units)
*   `/api/admin/db/...` (Database Administration)

Authentication is typically handled via a token passed in the `Authorization` header. Specific endpoints require different user roles ('Admin', 'Employee', 'User') for access.

---

## (Polish / Polski) Przegląd API

Backend udostępnia API RESTful pod prefiksem `/api`. Kluczowe punkty końcowe zasobów obejmują:

*   `/api/user/...` (Uwierzytelnianie, Zarządzanie Użytkownikami)
*   `/api/config/...` (Konfiguracja Aplikacji)
*   `/api/logs/...` (Logi Systemowe)
*   `/api/tags/...` (Tagi Globalne)
*   `/api/note/...` (Notatki)
*   `/api/signature/component/...` (Komponenty Sygnatur)
*   `/api/signature/element/...` (Elementy Sygnatur)
*   `/api/archive/document/...` (Dokumenty/Jednostki Archiwalne)
*   `/api/admin/db/...` (Administracja Bazą Danych)

Uwierzytelnianie jest zazwyczaj obsługiwane za pomocą tokenu przekazywanego w nagłówku `Authorization`. Konkretne punkty końcowe wymagają różnych ról użytkownika ('Admin', 'Pracownik', 'Użytkownik') do uzyskania dostępu.