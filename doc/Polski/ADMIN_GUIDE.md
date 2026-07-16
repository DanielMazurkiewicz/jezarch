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

## Dostęp do Panelu Administratora

1.  Zaloguj się na konto posiadające rolę 'Admin'.
2.  Kliknij link "Admin" w nawigacji paska bocznego.

---

## Zarządzanie Użytkownikami

### Przeglądanie Użytkowników

*   Tabela wyświetla wszystkich zarejestrowanych użytkowników, w tym ich Login, Rolę, Preferowany Język i Przypisane Tagi (jeśli dotyczy).
*   Użytkownicy z rolą `null` (Brak Roli / Wyłączony) nie mogą się zalogować.

### Przypisywanie/Zmiana Ról

*   Użyj menu rozwijanego w kolumnie "Rola" dla konkretnego użytkownika.
*   Wybierz pożądaną rolę: 'Admin', 'Pracownik', 'Użytkownik' lub 'Brak Roli / Wyłączony' (co skutecznie wyłącza konto).
*   **Ważne:** Nie możesz zmienić własnej roli.
*   Zmiana roli użytkownika *z* 'Użytkownik' na inną automatycznie wyczyści wszelkie tagi wcześniej mu przypisane.
*   Zmiana roli użytkownika *na* 'Użytkownik' pozwala na późniejsze przypisanie tagów. Możesz zostać poproszony o przypisanie tagów natychmiast po zmianie roli na 'Użytkownik'.

### Przypisywanie Tagów (dla roli 'Użytkownik')

*   Ta funkcja dotyczy tylko użytkowników z rolą 'Użytkownik'. Użytkownicy z tą rolą mogą przeglądać/wyszukiwać tylko te dokumenty archiwalne, które mają przypisany *przynajmniej jeden* z tagów przypisanych im tutaj.
*   Kliknij przycisk **Przypisz Tagi** (ikona tagów) w kolumnie "Akcje" dla użytkownika z rolą 'Użytkownik'.
*   Otworzy się okno dialogowe z Selektorem Tagów. Wybierz tagi, do których użytkownik powinien mieć dostęp.
*   Kliknij **Zapisz**.
*   Aby usunąć wszystkie tagi, otwórz okno dialogowe i zapisz bez wybranych tagów.

### Ustawianie Haseł Użytkowników

*   Kliknij przycisk **Ustaw Hasło** (ikona klucza) dla dowolnego użytkownika (oprócz siebie).
*   Wprowadź nowe hasło spełniające wymagania złożoności (pokazane w oknie dialogowym).
*   Kliknij **Ustaw Hasło**. Hasło użytkownika zostanie natychmiast zmienione.

### Ustawianie Preferowanego Języka

*   Kliknij przycisk **Ustaw Język** (ikona języków) dla dowolnego użytkownika (w tym siebie, chociaż zazwyczaj robi się to przez menu w nagłówku).
*   Wybierz pożądany język z listy rozwijanej.
*   Kliknij **Zapisz**. Preferencje językowe interfejsu użytkownika zostaną zaktualizowane.

---

## Ustawienia Aplikacji

### Domyślny Język

*   Wybierz domyślny język interfejsu użytkownika dla nowych użytkowników lub użytkowników bez ustawionych preferencji.

### Porty Sieciowe (HTTP/HTTPS)

*   Ustaw numery portów, na których serwer aplikacji nasłuchuje ruchu HTTP i HTTPS.
*   **Wymaga Ręcznego Restartu Serwera:** Zmiana tych portów **wymaga ręcznego zatrzymania i ponownego uruchomienia procesu serwera backendu**, aby zmiany weszły w życie.

### Konfiguracja HTTPS/SSL

*   Aby włączyć HTTPS, podaj **bezwzględne ścieżki** na serwerze do Twoich:
    *   **Pliku Klucza Prywatnego** (np. `/etc/ssl/private/mojadomena.key`)
    *   **Pliku Certyfikatu** (np. `/etc/ssl/certs/mojadomena.crt` lub `.pem`)
*   Możesz opcjonalnie podać ścieżkę do **Pliku Łańcucha CA**, jeśli jest to wymagane dla Twojego certyfikatu.
*   **Ścieżki muszą istnieć na serwerze, na którym działa backend.** Aplikacja sprawdza istnienie plików przed zapisaniem.
*   Ustawienie prawidłowych ścieżek Klucza i Certyfikatu oraz zapisanie spowoduje próbę uruchomienia/przeładowania serwera HTTPS.
*   Aby wyłączyć HTTPS, kliknij przycisk **Wyczyść Ustawienia HTTPS**. Spowoduje to usunięcie wszystkich ścieżek i zatrzymanie serwera HTTPS.
*   **Akcje Serwera:** Zmiana tych ustawień może wywołać automatyczne przeładowanie konfiguracji HTTPS lub zatrzymać serwer HTTPS, jeśli ścieżki staną się nieprawidłowe lub zostaną wyczyszczone. Sprawdź logi serwera, aby uzyskać potwierdzenie.

### Implikacje Restartu

*   Zmiana **Portu HTTP** lub **Portu HTTPS** wymaga **ręcznego restartu** procesu serwera backendu.
*   Zmiana **Domyślnego Języka** działa natychmiast dla nowych sesji/użytkowników bez ustawionych preferencji.
*   Zmiana **Ścieżek HTTPS** wywołuje automatyczne akcje (przeładowanie/zatrzymanie usługi HTTPS), ale ręczny restart może być czasem korzystny w przypadku problemów.

---

## Zarządzanie Bazą Danych

### Kopia Zapasowa

*   Kliknij **Pobierz Plik Kopii Zapasowej**.
*   Rozpocznie to pobieranie bieżącego pliku bazy danych SQLite (np. `jezarch-backup-RRRR-MM-DDTHH-MM-SS-ZZZ.sqlite.db`).
*   **Uwaga:** Przed utworzeniem kopii zapasowej system próbuje wykonać `PRAGMA wal_checkpoint(TRUNCATE)`, aby zapewnić spójność danych, jeśli włączone jest logowanie z wyprzedzeniem zapisu (WAL) (co jest domyślne).
*   Przechowuj pobrany plik kopii zapasowej bezpiecznie w oddzielnej lokalizacji.

### Przywracanie

*   **Przywracanie jest procesem ręcznym wymagającym dostępu do serwera.**
*   **Procedura:**
    1.  **Zatrzymaj** całkowicie proces serwera backendu JezArch.
    2.  **Zlokalizuj** aktywny plik bazy danych SQLite na serwerze. Jego ścieżka jest pokazana w logach startowych lub można ją wywnioskować z konfiguracji (domyślnie: `backend/jezarch.sqlite.db`).
    3.  **Zastąp** aktywny plik bazy danych pożądanym plikiem kopii zapasowej. Upewnij się, że nazwa pliku odpowiada oczekiwanej przez aplikację (np. zmień nazwę kopii zapasowej na `jezarch.sqlite.db`).
    4.  **Uruchom ponownie** proces serwera backendu JezArch.

---

## Przeglądarka Logów

### Wyszukiwanie Logów

*   Użyj paska wyszukiwania, aby filtrować logi według:
    *   Poziomu (Info, Ostrzeż., Błąd)
    *   ID Użytkownika (lub 'system')
    *   Kategorii (np. 'auth', 'db', 'startup')
    *   Treści wiadomości (Zawiera)
    *   Znacznika czasu (Warunki zakresu dat)

### Wyświetlanie Szczegółów

*   Jeśli wpis logu zawiera powiązane dane (np. szczegóły błędu, payload żądania), ikona **Info** (i) pojawi się w kolumnie "Dane".
*   Kliknij ikonę, aby otworzyć okno dialogowe wyświetlające sformatowane dane (zazwyczaj JSON).

### Usuwanie Logów

*   Aby zapobiec nieograniczonemu rozrostowi bazy danych logów, możesz usuwać stare wpisy.
*   Wprowadź liczbę dni w polu wejściowym (np. `30`, aby zachować ostatnie 30 dni).
*   Kliknij przycisk **Usuń**.
*   Potwierdź akcję w oknie dialogowym.
*   **Ostrzeżenie:** To trwale usuwa wpisy logów starsze niż podana liczba dni.

---

## Inne Uprawnienia Administratora

Poza dedykowanym Panelem Administratora, Administratorzy generalnie mają podwyższone uprawnienia w całej aplikacji:

*   **Mogą edytować/usuwać dowolny Tag.**
*   **Mogą edytować/usuwać dowolną Notatkę.**
*   **Mogą edytować/usuwać dowolny Komponent Sygnatury (w tym Elementy przez kaskadę).**
*   **Mogą omijać kontrole własności** przy przeglądaniu/edycji/usuwaniu większości elementów (z wyjątkiem zmiany własnej roli/hasła przez ścieżki administracyjne).
*   Mogą wyświetlać nieaktywne pozycje Archiwum w wyszukiwaniach, jeśli jest to określone.
