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

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Windows na [stronie Bun](https://bun.sh/docs/installation#windows). Zazwyczaj polega to na uruchomieniu polecenia w PowerShell.
2.  **Zainstaluj Zależności:** Otwórz terminal (np. PowerShell lub Wiersz Polecenia), przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

### macOS

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla macOS na [stronie Bun](https://bun.sh/docs/installation#macos). Zazwyczaj jest to jedno polecenie w Terminalu.
2.  **Zainstaluj Zależności:** Otwórz Terminal, przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

### Linux

1.  **Zainstaluj Bun:** Postępuj zgodnie z instrukcją instalacji dla Linux na [stronie Bun](https://bun.sh/docs/installation#linux). Zazwyczaj wymaga to użycia `curl` lub innego menedżera pakietów. Upewnij się, że `unzip` jest zainstalowany (`sudo apt install unzip` lub podobne).
2.  **Zainstaluj Zależności:** Otwórz terminal, przejdź do katalogu projektu i uruchom polecenia `bun install` dla `backend` i `frontend`, jak pokazano powyżej.

---

## Uruchamianie Aplikacji

Możesz uruchomić oba serwery jednym poleceniem z katalogu głównego repozytorium lub uruchamiać je osobno.

### Szybki Start (Deweloperski)

Z katalogu głównego repozytorium:

```bash
bun run dev
```

Polecenie to uruchamia równocześnie serwer API **backendu** i serwer deweloperski **frontendu**. Sprawdź dane wyjściowe konsoli, aby poznać adresy URL (backend domyślnie nasłuchuje na porcie HTTP 8080; serwer deweloperski frontendu wypisuje własny adres).

### Tylko Backend (Deweloperski)

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

> **Uwaga:** W tym trybie musisz co najmniej raz zbudować frontend (`cd frontend && bun run build`), aby katalog `frontend/dist` istniał — w przeciwnym razie dostępne będzie tylko API.

---

### Tryb Produkcyjny

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
    *   Zastąp `[opcjonalne --argumenty]` dowolnymi potrzebnymi argumentami linii poleceń (np. `--http-port 80`, `--https-key-path /sciezka/do/klucza`). Pełna lista znajduje się w sekcji "Argumenty Linii Poleceń" (Command Line Arguments) pliku [REQUIREMENTS.md](../../REQUIREMENTS.md).

4.  Otwórz aplikację w przeglądarce pod skonfigurowanym adresem URL i portem produkcyjnym.

---

## Początkowa Konfiguracja

*   Przy pierwszym uruchomieniu aplikacja utworzy plik bazy danych SQLite (np. `jezarch.sqlite.db` w katalogu `backend`, chyba że skonfigurowano inaczej).
*   Początkowe konto administratora jest tworzone automatycznie:
    *   **Login:** `admin`
    *   **Hasło:** pobierane ze zmiennej środowiskowej `JEZARCH_INITIAL_ADMIN_PASSWORD`, jeśli jest ustawiona; w przeciwnym razie generowane jest silne losowe hasło i **wyświetlane jednorazowo w konsoli serwera** podczas startu.
*   **Skopiuj wygenerowane hasło natychmiast — nie zostanie pokazane ponownie.** Później możesz je zmienić opcją "Zmień hasło" w menu użytkownika w nagłówku.

### Wypełnianie Danymi Demo (Opcjonalne)

Backend udostępnia skrypty, które przez API zapełniają świeżo zainstalowaną instancję przykładową zawartością (serwer musi być uruchomiony):

```bash
cd backend
SEED_ADMIN_PASSWORD=<haslo-admina> bun run seed      # dane demo po angielsku
SEED_ADMIN_PASSWORD=<haslo-admina> bun run seed:pl   # dane demo po polsku
```

Hasło administratora jest odczytywane ze zmiennej `SEED_ADMIN_PASSWORD`, z argumentu CLI podanego po opcjonalnym adresie serwera (`bun run seed [adres] [haslo-admina]`), lub z `JEZARCH_INITIAL_ADMIN_PASSWORD`, jeśli serwer został z nim uruchomiony.
