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
    *   Stylizacja: Tailwind CSS v4 (przetwarzane przez `bun-plugin-tailwind`)
    *   Routing: React Router DOM
    *   Formularze: React Hook Form
    *   Walidacja: Zod
    *   Zarządzanie Stanem: React Context API (`AuthContext`)
    *   Narzędzie Budowania: Niestandardowy skrypt Bun (`frontend/build.ts`) używający API `Bun.build`
*   **Lokalizacja:** Niestandardowy system tłumaczeń używający `intl-messageformat`.

---

## Pierwszeństwo Konfiguracji

Parametry aplikacji (porty, ścieżka bazy danych, język, ustawienia HTTPS) są określane przy użyciu następującej kolejności pierwszeństwa (najwyższy priorytet jako pierwszy):

1.  **Argumenty Linii Poleceń:** Flagi przekazane podczas uruchamiania serwera backendu (np. `--http-port 9000`). Zobacz `bun run src/main.ts --help` w katalogu `backend` dla dostępnych opcji.
2.  **Zmienne Środowiskowe:** Systemowe zmienne środowiskowe (np. `JEZARCH_HTTP_PORT=9000`).
3.  **Konfiguracja Bazy Danych:** Wartości przechowywane w tabeli `config` w bazie danych SQLite (zarządzane przez Panel Administratora -> Ustawienia Aplikacji).
4.  **Wartości Domyślne:** Domyślne wartości zakodowane na stałe w `backend/src/initialization/app_params.ts`.

Ostateczne, obowiązujące parametry używane przez działającą aplikację są logowane do konsoli podczas uruchamiania serwera.

---

## Baza Danych

*   Używa SQLite do przechowywania danych.
*   Lokalizacja pliku bazy danych domyślnie to `backend/jezarch.sqlite.db`, ale jest konfigurowalna.
*   Wykorzystuje `PRAGMA foreign_keys = ON` dla integralności relacyjnej.
*   Domyślnie używa `PRAGMA journal_mode = WAL` (Write-Ahead Logging) dla lepszej współbieżności, pozwalając na odczyty podczas zapisów.

---

## Przegląd API

Backend udostępnia API RESTful pod prefiksem `/api`. Kluczowe punkty końcowe zasobów obejmują:

*   `/api/user/...` (Uwierzytelnianie, Zarządzanie Użytkownikami)
*   `/api/configs/...` (Konfiguracja Aplikacji)
*   `/api/logs/...` (Logi Systemowe)
*   `/api/tag/...`, `/api/tags` (Tagi Globalne)
*   `/api/note/...` (Notatki)
*   `/api/signature/component/...` (Komponenty Sygnatur)
*   `/api/signature/element/...` (Elementy Sygnatur)
*   `/api/archive/document/...` (Dokumenty/Jednostki Archiwalne)
*   `/api/admin/db/...` (Administracja Bazą Danych)

Uwierzytelnianie odbywa się za pomocą tokena sesyjnego (UUID) przekazywanego w nagłówku `Authorization`. Tokeny sesyjne są uzyskiwane przez `POST /api/user/login` i wygasają po 24 godzinach. Konkretne punkty końcowe wymagają różnych ról użytkownika (`admin`, `employee` lub `user`) do uzyskania dostępu.

Podczas pierwszego uruchomienia aplikacja tworzy początkowe konto `admin`: hasło pochodzi ze zmiennej `JEZARCH_INITIAL_ADMIN_PASSWORD`, jeśli jest ustawiona; w przeciwnym razie generowane jest silne losowe hasło i wyświetlane jednorazowo w konsoli.
