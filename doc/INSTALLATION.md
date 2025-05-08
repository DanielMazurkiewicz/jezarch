# JezArch Installation Guide

This guide provides instructions for installing and running the JezArch application on different operating systems.

## Table of Contents

*   [Prerequisites](#prerequisites)
*   [Installation Steps](#installation-steps)
    *   [Windows](#windows)
    *   [macOS](#macos)
    *   [Linux](#linux)
*   [Running the Application](#running-the-application)
    *   [Development Mode](#development-mode)
    *   [Production Mode](#production-mode)
*   [Initial Setup](#initial-setup)

---

# (Polish / Polski)

# Przewodnik Instalacji JezArch

Ten przewodnik zawiera instrukcje dotyczące instalacji i uruchamiania aplikacji JezArch na różnych systemach operacyjnych.

## Spis Treści

*   [Wymagania Wstępne](#wymagania-wstępne)
*   [Kroki Instalacji](#kroki-instalacji)
    *   [Windows](#windows-1)
    *   [macOS](#macos-1)
    *   [Linux](#linux-1)
*   [Uruchamianie Aplikacji](#uruchamianie-aplikacji)
    *   [Tryb Deweloperski](#tryb-deweloperski)
    *   [Tryb Produkcyjny](#tryb-produkcyjny)
*   [Początkowa Konfiguracja](#początkowa-konfiguracja)

---

## Prerequisites

*   **Bun:** JezArch uses the Bun runtime. You need to install Bun on your system. Visit the [official Bun website](https://bun.sh/) for installation instructions specific to your OS.

---

## (Polish / Polski) Wymagania Wstępne

*   **Bun:** JezArch używa środowiska uruchomieniowego Bun. Musisz zainstalować Bun na swoim systemie. Odwiedź [oficjalną stronę Bun](https://bun.sh/), aby uzyskać instrukcje instalacji dla Twojego systemu operacyjnego.

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

## (Polish / Polski) Kroki Instalacji

1.  **Sklonuj Repozytorium:** Pobierz kod źródłowy JezArch, zazwyczaj klonując repozytorium Git:
    ```bash
    git clone <adres_repozytorium>
    cd katalog-projektu-jezarch # Przejdź do katalogu projektu
    ```

2.  **Zainstaluj Zależności:** Przejdź osobno do katalogów `backend` i `frontend` i zainstaluj zależności używając Bun.

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

### (Polish / Polski) Windows

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Windows na [stronie Bun](https://bun.sh/docs/installation#windows). Zazwyczaj polega to na uruchomieniu polecenia w PowerShell.
2.  **Zainstaluj Zależności:** Otwórz terminal (np. PowerShell lub Wiersz Polecenia), przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

---

### macOS

1.  **Install Bun:** Follow the macOS installation guide on the [Bun website](https://bun.sh/docs/installation#macos). Usually a single command in the Terminal.
2.  **Install Dependencies:** Open Terminal, navigate to the project directory, and run the `bun install` commands for `backend` and `frontend` as shown above.

### (Polish / Polski) macOS

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla macOS na [stronie Bun](https://bun.sh/docs/installation#macos). Zazwyczaj jest to jedno polecenie w Terminalu.
2.  **Zainstaluj Zależności:** Otwórz Terminal, przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

---

### Linux

1.  **Install Bun:** Follow the Linux installation guide on the [Bun website](https://bun.sh/docs/installation#linux). Usually involves `curl` or another package manager. Make sure unzip is installed (`sudo apt install unzip` or similar).
2.  **Install Dependencies:** Open your terminal, navigate to the project directory, and run the `bun install` commands for `backend` and `frontend` as shown above.

### (Polish / Polski) Linux

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Linux na [stronie Bun](https://bun.sh/docs/installation#linux). Zazwyczaj wymaga to użycia `curl` lub innego menedżera pakietów. Upewnij się, że `unzip` jest zainstalowany (`sudo apt install unzip` lub podobne).
2.  **Zainstaluj Zależności:** Otwórz terminal, przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

---

## Running the Application

You need to run the **backend** server. The frontend is served statically by the backend.

### Development Mode

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

### (Polish / Polski) Tryb Deweloperski

Ten tryb wykorzystuje wbudowany mechanizm śledzenia plików Bun do automatycznego przeładowania (frontend może wymagać ręcznego odświeżenia w zależności od zmian).

1.  Przejdź do katalogu `backend`:
    ```bash
    cd backend
    ```
2.  Uruchom serwer backendu:
    ```bash
    bun run dev
    ```
    *   To polecenie zazwyczaj uruchamia skrypt `src/main.ts`.
    *   Serwer będzie nasłuchiwał na skonfigurowanych portach HTTP/HTTPS (domyślnie: HTTP 8080, HTTPS 8443). Sprawdź dane wyjściowe konsoli, aby poznać dokładne adresy URL.
    *   Backend serwuje pliki frontendu z katalogu `frontend/dist` (skrypt budujący frontend umieszcza tam pliki).

3.  Otwórz aplikację w przeglądarce pod adresem `http://localhost:8080` (lub skonfigurowanym portem).

---

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
    *   Replace `[optional --arguments]` with any command-line arguments needed (e.g., `--http-port 80`, `--https-key-path /path/to/key`). See [Configuration](#configuration) (link TBD or mention where config is documented) for available arguments.

4.  Access the application in your browser at the configured production URL and port.

### (Polish / Polski) Tryb Produkcyjny

W trybie produkcyjnym zazwyczaj buduje się zoptymalizowane zasoby frontendu i uruchamia serwer backendu bezpośrednio.

1.  **Zbuduj Frontend:** Przejdź do katalogu `frontend` i uruchom skrypt budujący:
    ```bash
    cd frontend
    bun run build # Lub inne specyficzne polecenie budowania
    cd ..
    ```
    *   Tworzy to zoptymalizowane pliki statyczne w `frontend/dist`.

2.  **Zbuduj Backend (Opcjonalne, ale Zalecane):** Skompiluj backend do pojedynczego pliku dla potencjalnie lepszej wydajności. Przejdź do katalogu `backend`:
    ```bash
    cd backend
    bun run build
    cd ..
    ```
    *   Używa to `Bunfile.js` i tworzy `backend/dist/server.js`.

3.  **Uruchom Backend:**
    *   **Jeśli zbudowałeś backend:**
        ```bash
        cd backend
        bun run dist/server.js [opcjonalne --argumenty]
        ```
    *   **Jeśli pominąłeś budowanie backendu:**
        ```bash
        cd backend
        bun run src/main.ts [opcjonalne --argumenty]
        ```
    *   Zastąp `[opcjonalne --argumenty]` dowolnymi potrzebnymi argumentami linii poleceń (np. `--http-port 80`, `--https-key-path /sciezka/do/klucza`). Zobacz [Konfiguracja](#konfiguracja) (link TBD lub wspomnij, gdzie dokumentacja konfiguracji) dla dostępnych argumentów.

4.  Otwórz aplikację w przeglądarce pod skonfigurowanym adresem URL i portem produkcyjnym.

---

## Initial Setup

*   On the first run, the application will create the SQLite database file (e.g., `jezarch.sqlite.db` in the `backend` directory, unless configured otherwise).
*   A default administrator user is created with the following credentials:
    *   **Login:** `admin`
    *   **Password:** `admin`
*   **It is strongly recommended to log in immediately and change the default admin password.** Use the "Change Password" option in the user dropdown menu in the header.

## (Polish / Polski) Początkowa Konfiguracja

*   Przy pierwszym uruchomieniu aplikacja utworzy plik bazy danych SQLite (np. `jezarch.sqlite.db` w katalogu `backend`, chyba że skonfigurowano inaczej).
*   Domyślny użytkownik administratora jest tworzony z następującymi danymi logowania:
    *   **Login:** `admin`
    *   **Hasło:** `admin`
*   **Zdecydowanie zaleca się natychmiastowe zalogowanie i zmianę domyślnego hasła administratora.** Użyj opcji "Zmień hasło" w menu użytkownika w nagłówku.