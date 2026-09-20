# Przewodnik Instalacji JezArch

Ten przewodnik zawiera instrukcje dotyczące instalacji i uruchamiania aplikacji JezArch na różnych systemach operacyjnych.

## Spis Treści

*   [Wymagania Wstępne](#wymagania-wstępne)
*   [Kroki Instalacji](#kroki-instalacji)
    *   [Windows](#windows-1)
    *   [macOS](#macos-1)
    *   [Linux](#linux-1)
*   [Uruchamianie Aplikacji](#uruchamianie-aplikacji)
    *   [Szybki Start (Deweloperski)](#szybki-start-deweloperski)
    *   [Tylko Backend (Deweloperski)](#tylko-backend-deweloperski)
    *   [Tryb Produkcyjny](#tryb-produkcyjny)
*   [Początkowa Konfiguracja](#początkowa-konfiguracja)

---

## Wymagania Wstępne

*   **Bun:** JezArch używa środowiska uruchomieniowego Bun. Musisz zainstalować Bun na swoim systemie. Odwiedź [oficjalną stronę Bun](https://bun.sh/), aby uzyskać instrukcje instalacji dla Twojego systemu operacyjnego.

---

## Kroki Instalacji

1.  **Sklonuj Repozytorium:** Pobierz kod źródłowy JezArch, zazwyczaj klonując repozytorium Git:
    ```bash
    git clone <adres_repozytorium>
    cd katalog-projektu-jezarch # Przejdź do katalogu projektu
    ```

2.  **Zainstaluj Zależności:** Z katalogu głównego repozytorium uruchom wieloplatformowe polecenie `install` — zainstaluje zależności dla katalogów głównego, `backend` i `frontend`:

    ```bash
    bun run install
    ```

    (Alternatywnie: `cd backend && bun install`, a następnie `cd ../frontend && bun install`.)

---

### Windows

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Windows na [stronie Bun](https://bun.sh/docs/installation#windows). Zazwyczaj polega to na uruchomieniu polecenia w PowerShell.
2.  **Zainstaluj Zależności:** Otwórz terminal (np. PowerShell lub Wiersz Polecenia), przejdź do katalogu projektu i uruchom `bun run install`.

### macOS

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla macOS na [stronie Bun](https://bun.sh/docs/installation#macos). Zazwyczaj jest to jedno polecenie w Terminalu.
2.  **Zainstaluj Zależności:** Otwórz Terminal, przejdź do katalogu projektu i uruchom `bun run install`.

### Linux

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Linux na [stronie Bun](https://bun.sh/docs/installation#linux). Zazwyczaj wymaga to użycia `curl` lub innego menedżera pakietów. Upewnij się, że `unzip` jest zainstalowany (`sudo apt install unzip` lub podobne).
2.  **Zainstaluj Zależności:** Otwórz terminal, przejdź do katalogu projektu i uruchom `bun run install`.

---

## Uruchamianie Aplikacji

Wszystkie poniższe polecenia są uruchamiane z katalogu głównego repozytorium i działają identycznie w systemach Windows (cmd.exe/PowerShell), macOS i Linux.

### Szybki Start (Deweloperski)

Z katalogu głównego repozytorium:

```bash
bun run start:dev
```

Polecenie to jednorazowo buduje **frontend** (bez minifikacji, z mapami źródła) do katalogu `frontend/dist`, a następnie uruchamia serwer **backendu** ze źródła (`src/main.ts`), który serwuje zarówno API, jak i pliki frontendu. Sprawdź dane wyjściowe konsoli, aby poznać adresy URL (domyślnie: HTTP 8080, HTTPS 8443).

> **Uwaga:** Nie ma monitorowania plików ani automatycznego przeładowania. Po zmianach w kodzie frontendu lub backendu należy ponownie uruchomić `bun run start:dev`.

### Tylko Backend (Deweloperski)

Ten tryb uruchamia backend ze źródła (`src/main.ts`) bez kroku budowania frontendu.

1.  Uruchom sam backend, z katalogu `backend`:
    ```bash
    cd backend
    bun run dev
    ```
2.  Serwer nasłuchuje na skonfigurowanych portach HTTP/HTTPS (domyślnie: HTTP 8080, HTTPS 8443). Backend serwuje pliki frontendu z katalogu `frontend/dist`.

3.  Otwórz aplikację w przeglądarce pod adresem `http://localhost:8080` (lub skonfigurowanym portem).

> **Uwaga:** W tym trybie musisz co najmniej raz zbudować frontend, aby katalog `frontend/dist` istniał — uruchom `bun run build:dev` z katalogu głównego. W przeciwnym razie dostępne będzie tylko API.

---

### Tryb Produkcyjny

W trybie produkcyjnym buduje się zoptymalizowane zasoby frontendu oraz pakiet backendu, a następnie uruchamia się ten pakiet.

1.  **Zbuduj wszystko** z katalogu głównego repozytorium:
    ```bash
    bun run build:prod
    ```
    *   Usuwa poprzednie artefakty budowania (czyste budowanie).
    *   Buduje frontend (zminifikowany) do katalogu `frontend/dist`.
    *   Pakuje backend do pojedynczego pliku `backend/dist/server.js`.

2.  **Uruchom pakiet produkcyjny:**
    ```bash
    bun run start:prod [-- <opcjonalne --argumenty>]
    ```
    *   Jeśli plik `backend/dist/server.js` jeszcze nie istnieje, polecenie `start:prod` najpierw wszystko zbuduje.
    *   Zastąp `<opcjonalne --argumenty>` dowolnymi argumentami linii poleceń backendu (np. `--http-port 80`, `--https-key-path /sciezka/do/klucza`). Pełna lista znajduje się w sekcji "Argumenty Linii Poleceń" (Command Line Arguments) pliku [REQUIREMENTS.md](../../REQUIREMENTS.md).
    *   Uruchomienie ze źródła: `cd backend && bun run src/main.ts [argumenty]`.

3.  Otwórz aplikację w przeglądarce pod skonfigurowanym adresem URL i portem produkcyjnym.

### Testy i Konserwacja

Z katalogu głównego repozytorium (działa na wszystkich platformach):

```bash
bun run test          # sprawdzenia typów (test:types) + testy frontendu/backendu (test:code)
bun run test:types    # tsc --noEmit dla frontendu i backendu
bun run test:code     # bun test dla frontendu (jeśli istnieją testy) i backendu
bun run clean         # usuwa artefakty budowania (frontend/dist, backend/dist); `cleanup` to alias
```

Pozostałe polecenia katalogu głównego: `bun run help` (pomoc runnera) oraz `bun run update` (`git pull` + instalacja + aktualizacja zależności). Pełna tabela poleceń znajduje się w [README głównym](../../README.md).

---

## Początkowa Konfiguracja

*   Przy pierwszym uruchomieniu aplikacja utworzy plik bazy danych SQLite (np. `jezarch.sqlite.db` w katalogu `backend`, chyba że skonfigurowano inaczej).
*   Początkowe konto administratora jest tworzone automatycznie:
    *   **Login:** `admin`
    *   **Hasło:** pobierane ze zmiennej środowiskowej `JEZARCH_INITIAL_ADMIN_PASSWORD`, jeśli jest ustawiona; w przeciwnym razie generowane jest silne losowe hasło i **wyświetlane jednorazowo w konsoli serwera** podczas startu.
*   **Skopiuj wygenerowane hasło natychmiast — nie zostanie pokazane ponownie.** Później możesz je zmienić opcją "Zmień hasło" w menu użytkownika w nagłówku.

### Wypełnianie Danymi Demo (Opcjonalne)

Z katalogu głównego repozytorium wieloplatformowe polecenia seed zapełniają świeżo zainstalowaną instancję przykładową zawartością przez API (serwer musi być uruchomiony):

```bash
bun run seed [adres-serwera] [haslo-admina]    # obszerne dane demo po angielsku (= seed:en)
bun run seed:en [adres-serwera] [haslo-admina] # obszerne dane demo po angielsku
bun run seed:pl [adres-serwera] [haslo-admina] # dane demo po polsku
```

Hasło administratora jest odczytywane ze zmiennej `SEED_ADMIN_PASSWORD`, z argumentu CLI podanego po opcjonalnym adresie serwera, lub z `JEZARCH_INITIAL_ADMIN_PASSWORD`, jeśli serwer został z nim uruchomiony. Forma pozycyjna powyżej działa na wszystkich platformach (PowerShell/cmd nie obsługują składni `SEED_ADMIN_PASSWORD=...`).
