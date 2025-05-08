# JezArch Administrator Guide

This guide details the functionalities available exclusively to users with the 'Admin' role in the JezArch application.

## Table of Contents

*   [Accessing the Admin Panel](#accessing-the-admin-panel)
*   [User Management](#user-management)
    *   [Viewing Users](#viewing-users)
    *   [Assigning/Changing Roles](#assigningchanging-roles)
    *   [Assigning Tags (for 'User' role)](#assigning-tags-for-user-role)
    *   [Setting User Passwords](#setting-user-passwords)
    *   [Setting Preferred Language](#setting-preferred-language)
*   [Application Settings](#application-settings)
    *   [Default Language](#default-language)
    *   [Network Ports (HTTP/HTTPS)](#network-ports-httphttps)
    *   [HTTPS/SSL Configuration](#httpssl-configuration)
    *   [Restart Implications](#restart-implications)
*   [Database Management](#database-management)
    *   [Backup](#backup)
    *   [Restore](#restore)
*   [Log Viewer](#log-viewer)
    *   [Searching Logs](#searching-logs)
    *   [Viewing Details](#viewing-details-1)
    *   [Purging Logs](#purging-logs)
*   [Other Admin Privileges](#other-admin-privileges)

---

# (Polish / Polski)

# Przewodnik Administratora JezArch

Ten przewodnik szczegółowo opisuje funkcjonalności dostępne wyłącznie dla użytkowników z rolą 'Admin' w aplikacji JezArch.

## Spis Treści

*   [Dostęp do Panelu Administratora](#dostęp-do-panelu-administratora)
*   [Zarządzanie Użytkownikami](#zarządzanie-użytkownikami)
    *   [Przeglądanie Użytkowników](#przeglądanie-użytkowników)
    *   [Przypisywanie/Zmiana Ról](#przypisywaniezmiana-ról)
    *   [Przypisywanie Tagów (dla roli 'Użytkownik')](#przypisywanie-tagów-dla-roli-użytkownik)
    *   [Ustawianie Haseł Użytkowników](#ustawianie-haseł-użytkowników)
    *   [Ustawianie Preferowanego Języka](#ustawianie-preferowanego-języka)
*   [Ustawienia Aplikacji](#ustawienia-aplikacji)
    *   [Domyślny Język](#domyślny-język)
    *   [Porty Sieciowe (HTTP/HTTPS)](#porty-sieciowe-httphttps)
    *   [Konfiguracja HTTPS/SSL](#konfiguracja-httpsssl)
    *   [Implikacje Restartu](#implikacje-restartu)
*   [Zarządzanie Bazą Danych](#zarządzanie-bazą-danych)
    *   [Kopia Zapasowa](#kopia-zapasowa)
    *   [Przywracanie](#przywracanie)
*   [Przeglądarka Logów](#przeglądarka-logów)
    *   [Wyszukiwanie Logów](#wyszukiwanie-logów)
    *   [Wyświetlanie Szczegółów](#wyświetlanie-szczegółów-1)
    *   [Usuwanie Logów](#usuwanie-logów)
*   [Inne Uprawnienia Administratora](#inne-uprawnienia-administratora)

---

## Accessing the Admin Panel

1.  Log in with an account that has the 'Admin' role.
2.  Click on the "Admin" link in the sidebar navigation.

## (Polish / Polski) Dostęp do Panelu Administratora

1.  Zaloguj się na konto posiadające rolę 'Admin'.
2.  Kliknij link "Admin" w nawigacji paska bocznego.

---

## User Management

Navigate to the "User Management" tab within the Admin Panel.

### Viewing Users

*   A table displays all registered users, including their Login, Role, Preferred Language, and Assigned Tags (if applicable).
*   Users with `null` (No Role / Disabled) role cannot log in.

### (Polish / Polski) Przeglądanie Użytkowników

*   Tabela wyświetla wszystkich zarejestrowanych użytkowników, w tym ich Login, Rolę, Preferowany Język i Przypisane Tagi (jeśli dotyczy).
*   Użytkownicy z rolą `null` (Brak Roli / Wyłączony) nie mogą się zalogować.

### Assigning/Changing Roles

*   Use the dropdown menu in the "Role" column for a specific user.
*   Select the desired role: 'Admin', 'Employee', 'User', or 'No Role / Disabled' (which effectively disables the account).
*   **Important:** You cannot change your own role.
*   Changing a user's role *away from* 'User' will automatically clear any tags previously assigned to them.
*   Changing a user's role *to* 'User' allows you to subsequently assign tags. You might be prompted to assign tags immediately after changing the role to 'User'.

### (Polish / Polski) Przypisywanie/Zmiana Ról

*   Użyj menu rozwijanego w kolumnie "Rola" dla konkretnego użytkownika.
*   Wybierz pożądaną rolę: 'Admin', 'Pracownik', 'Użytkownik' lub 'Brak Roli / Wyłączony' (co skutecznie wyłącza konto).
*   **Ważne:** Nie możesz zmienić własnej roli.
*   Zmiana roli użytkownika *z* 'Użytkownik' na inną automatycznie wyczyści wszelkie tagi wcześniej mu przypisane.
*   Zmiana roli użytkownika *na* 'Użytkownik' pozwala na późniejsze przypisanie tagów. Możesz zostać poproszony o przypisanie tagów natychmiast po zmianie roli na 'Użytkownik'.

### Assigning Tags (for 'User' role)

*   This feature is only applicable to users with the 'User' role. Users with this role can only view/search archive documents that have *at least one* of the tags assigned to them here.
*   Click the **Assign Tags** (tags icon) button in the "Actions" column for a user with the 'User' role.
*   A dialog opens with a Tag Selector. Select the tags the user should have access to.
*   Click **Save**.
*   To remove all tags, open the dialog and save with no tags selected.

### (Polish / Polski) Przypisywanie Tagów (dla roli 'Użytkownik')

*   Ta funkcja dotyczy tylko użytkowników z rolą 'Użytkownik'. Użytkownicy z tą rolą mogą przeglądać/wyszukiwać tylko te dokumenty archiwalne, które mają przypisany *przynajmniej jeden* z tagów przypisanych im tutaj.
*   Kliknij przycisk **Przypisz Tagi** (ikona tagów) w kolumnie "Akcje" dla użytkownika z rolą 'Użytkownik'.
*   Otworzy się okno dialogowe z Selektorem Tagów. Wybierz tagi, do których użytkownik powinien mieć dostęp.
*   Kliknij **Zapisz**.
*   Aby usunąć wszystkie tagi, otwórz okno dialogowe i zapisz bez wybranych tagów.

### Setting User Passwords

*   Click the **Set Password** (key icon) button for any user (except yourself).
*   Enter a new password that meets the complexity requirements (shown in the dialog).
*   Click **Set Password**. This immediately changes the user's password.

### (Polish / Polski) Ustawianie Haseł Użytkowników

*   Kliknij przycisk **Ustaw Hasło** (ikona klucza) dla dowolnego użytkownika (oprócz siebie).
*   Wprowadź nowe hasło spełniające wymagania złożoności (pokazane w oknie dialogowym).
*   Kliknij **Ustaw Hasło**. Hasło użytkownika zostanie natychmiast zmienione.

### Setting Preferred Language

*   Click the **Set Language** (languages icon) button for any user (including yourself, though usually done via header dropdown).
*   Select the desired language from the dropdown.
*   Click **Save**. The user's interface preference will be updated.

### (Polish / Polski) Ustawianie Preferowanego Języka

*   Kliknij przycisk **Ustaw Język** (ikona języków) dla dowolnego użytkownika (w tym siebie, chociaż zazwyczaj robi się to przez menu w nagłówku).
*   Wybierz pożądany język z listy rozwijanej.
*   Kliknij **Zapisz**. Preferencje językowe interfejsu użytkownika zostaną zaktualizowane.

---

## Application Settings

Navigate to the "App Settings" tab within the Admin Panel. Changes here might require a server restart or trigger automatic actions (like reloading HTTPS configuration).

### Default Language

*   Select the default language for the user interface for new users or users without a specific preference set.

### (Polish / Polski) Domyślny Język

*   Wybierz domyślny język interfejsu użytkownika dla nowych użytkowników lub użytkowników bez ustawionych preferencji.

### Network Ports (HTTP/HTTPS)

*   Set the port numbers the application server listens on for HTTP and HTTPS traffic.
*   **Requires Manual Server Restart:** Changing these ports **requires you to manually stop and restart the backend server process** for the changes to take effect.

### (Polish / Polski) Porty Sieciowe (HTTP/HTTPS)

*   Ustaw numery portów, na których serwer aplikacji nasłuchuje ruchu HTTP i HTTPS.
*   **Wymaga Ręcznego Restartu Serwera:** Zmiana tych portów **wymaga ręcznego zatrzymania i ponownego uruchomienia procesu serwera backendu**, aby zmiany weszły w życie.

### HTTPS/SSL Configuration

*   To enable HTTPS, provide the **absolute paths** on the server to your:
    *   **Private Key File** (e.g., `/etc/ssl/private/mydomain.key`)
    *   **Certificate File** (e.g., `/etc/ssl/certs/mydomain.crt` or `.pem`)
*   You can optionally provide a path to a **CA Chain File** if needed for your certificate.
*   **Paths must exist on the server where the backend is running.** The application checks for file existence before saving.
*   Setting valid Key and Certificate paths and saving will attempt to start/reload the HTTPS server.
*   To disable HTTPS, click the **Clear HTTPS Settings** button. This removes all paths and stops the HTTPS server.
*   **Server Actions:** Changing these settings may trigger an automatic reload of the HTTPS configuration or stop the HTTPS server if paths become invalid or are cleared. Check server logs for confirmation.

### (Polish / Polski) Konfiguracja HTTPS/SSL

*   Aby włączyć HTTPS, podaj **bezwzględne ścieżki** na serwerze do Twoich:
    *   **Pliku Klucza Prywatnego** (np. `/etc/ssl/private/mojadomena.key`)
    *   **Pliku Certyfikatu** (np. `/etc/ssl/certs/mojadomena.crt` lub `.pem`)
*   Możesz opcjonalnie podać ścieżkę do **Pliku Łańcucha CA**, jeśli jest to wymagane dla Twojego certyfikatu.
*   **Ścieżki muszą istnieć na serwerze, na którym działa backend.** Aplikacja sprawdza istnienie plików przed zapisaniem.
*   Ustawienie prawidłowych ścieżek Klucza i Certyfikatu oraz zapisanie spowoduje próbę uruchomienia/przeładowania serwera HTTPS.
*   Aby wyłączyć HTTPS, kliknij przycisk **Wyczyść Ustawienia HTTPS**. Spowoduje to usunięcie wszystkich ścieżek i zatrzymanie serwera HTTPS.
*   **Akcje Serwera:** Zmiana tych ustawień może wywołać automatyczne przeładowanie konfiguracji HTTPS lub zatrzymać serwer HTTPS, jeśli ścieżki staną się nieprawidłowe lub zostaną wyczyszczone. Sprawdź logi serwera, aby uzyskać potwierdzenie.

### Restart Implications

*   Changing **HTTP Port** or **HTTPS Port** requires a **manual restart** of the backend server process.
*   Changing **Default Language** takes effect immediately for new sessions/users without preferences.
*   Changing **HTTPS Paths** triggers automatic actions (reload/stop HTTPS service) but a manual restart might sometimes be beneficial if issues occur.

### (Polish / Polski) Implikacje Restartu

*   Zmiana **Portu HTTP** lub **Portu HTTPS** wymaga **ręcznego restartu** procesu serwera backendu.
*   Zmiana **Domyślnego Języka** działa natychmiast dla nowych sesji/użytkowników bez ustawionych preferencji.
*   Zmiana **Ścieżek HTTPS** wywołuje automatyczne akcje (przeładowanie/zatrzymanie usługi HTTPS), ale ręczny restart może być czasem korzystny w przypadku problemów.

---

## Database Management

Navigate to the "Database" tab.

### Backup

*   Click **Download Backup File**.
*   This initiates a download of the current SQLite database file (e.g., `jezarch-backup-YYYY-MM-DDTHH-MM-SS-ZZZ.sqlite.db`).
*   **Note:** Before backup, the system attempts a `PRAGMA wal_checkpoint(TRUNCATE)` to ensure data consistency if Write-Ahead Logging (WAL) is enabled (which is the default).
*   Store the downloaded backup file securely in a separate location.

### (Polish / Polski) Kopia Zapasowa

*   Kliknij **Pobierz Plik Kopii Zapasowej**.
*   Rozpocznie to pobieranie bieżącego pliku bazy danych SQLite (np. `jezarch-backup-RRRR-MM-DDTHH-MM-SS-ZZZ.sqlite.db`).
*   **Uwaga:** Przed utworzeniem kopii zapasowej system próbuje wykonać `PRAGMA wal_checkpoint(TRUNCATE)`, aby zapewnić spójność danych, jeśli włączone jest logowanie z wyprzedzeniem zapisu (WAL) (co jest domyślne).
*   Przechowuj pobrany plik kopii zapasowej bezpiecznie w oddzielnej lokalizacji.

### Restore

*   **Restoring is a manual process requiring server access.**
*   **Procedure:**
    1.  **Stop** the JezArch backend server process completely.
    2.  **Locate** the active SQLite database file on the server. Its path is shown in the startup logs or can be inferred from configuration (default: `backend/jezarch.sqlite.db`).
    3.  **Replace** the active database file with your desired backup file. Ensure the filename matches what the application expects (e.g., rename your backup to `jezarch.sqlite.db`).
    4.  **Restart** the JezArch backend server process.

### (Polish / Polski) Przywracanie

*   **Przywracanie jest procesem ręcznym wymagającym dostępu do serwera.**
*   **Procedura:**
    1.  **Zatrzymaj** całkowicie proces serwera backendu JezArch.
    2.  **Zlokalizuj** aktywny plik bazy danych SQLite na serwerze. Jego ścieżka jest pokazana w logach startowych lub można ją wywnioskować z konfiguracji (domyślnie: `backend/jezarch.sqlite.db`).
    3.  **Zastąp** aktywny plik bazy danych pożądanym plikiem kopii zapasowej. Upewnij się, że nazwa pliku odpowiada oczekiwanej przez aplikację (np. zmień nazwę kopii zapasowej na `jezarch.sqlite.db`).
    4.  **Uruchom ponownie** proces serwera backendu JezArch.

---

## Log Viewer

Navigate to the "System Logs" tab.

### Searching Logs

*   Use the search bar to filter logs by:
    *   Level (Info, Warn, Error)
    *   User ID (or 'system')
    *   Category (e.g., 'auth', 'db', 'startup')
    *   Message content (Contains)
    *   Timestamp (Date range conditions)

### (Polish / Polski) Wyszukiwanie Logów

*   Użyj paska wyszukiwania, aby filtrować logi według:
    *   Poziomu (Info, Ostrzeż., Błąd)
    *   ID Użytkownika (lub 'system')
    *   Kategorii (np. 'auth', 'db', 'startup')
    *   Treści wiadomości (Zawiera)
    *   Znacznika czasu (Warunki zakresu dat)

### Viewing Details

*   If a log entry has associated data (e.g., error details, request payload), an **Info** (i) icon appears in the "Data" column.
*   Click the icon to open a dialog displaying the formatted data (usually JSON).

### (Polish / Polski) Wyświetlanie Szczegółów

*   Jeśli wpis logu zawiera powiązane dane (np. szczegóły błędu, payload żądania), ikona **Info** (i) pojawi się w kolumnie "Dane".
*   Kliknij ikonę, aby otworzyć okno dialogowe wyświetlające sformatowane dane (zazwyczaj JSON).

### Purging Logs

*   To prevent the log database from growing indefinitely, you can purge old entries.
*   Enter the number of days in the input field (e.g., `30` to keep the last 30 days).
*   Click the **Purge** button.
*   Confirm the action in the dialog.
*   **Warning:** This permanently deletes log entries older than the specified number of days.

### (Polish / Polski) Usuwanie Logów

*   Aby zapobiec nieograniczonemu rozrostowi bazy danych logów, możesz usuwać stare wpisy.
*   Wprowadź liczbę dni w polu wejściowym (np. `30`, aby zachować ostatnie 30 dni).
*   Kliknij przycisk **Usuń**.
*   Potwierdź akcję w oknie dialogowym.
*   **Ostrzeżenie:** To trwale usuwa wpisy logów starsze niż podana liczba dni.

---

## Other Admin Privileges

Beyond the dedicated Admin Panel, Administrators generally have elevated permissions throughout the application:

*   **Can edit/delete any Tag.**
*   **Can edit/delete any Note.**
*   **Can edit/delete any Signature Component (including Elements via cascade).**
*   **Can bypass ownership checks** for viewing/editing/deleting most items (except changing their own role/password via admin routes).
*   Can view inactive Archive items in searches if specified.

## (Polish / Polski) Inne Uprawnienia Administratora

Poza dedykowanym Panelem Administratora, Administratorzy generalnie mają podwyższone uprawnienia w całej aplikacji:

*   **Mogą edytować/usuwać dowolny Tag.**
*   **Mogą edytować/usuwać dowolną Notatkę.**
*   **Mogą edytować/usuwać dowolny Komponent Sygnatury (w tym Elementy przez kaskadę).**
*   **Mogą omijać kontrole własności** przy przeglądaniu/edycji/usuwaniu większości elementów (z wyjątkiem zmiany własnej roli/hasła przez ścieżki administracyjne).
*   Mogą wyświetlać nieaktywne pozycje Archiwum w wyszukiwaniach, jeśli jest to określone.