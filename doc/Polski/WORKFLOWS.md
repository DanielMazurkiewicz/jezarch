# Przykładowe Scenariusze JezArch

Ten przewodnik przeprowadzi Cię przez typowe scenariusze end-to-end w JezArch — od pierwszego uruchomienia po codzienną pracę. Zakłada, że aplikacja jest zainstalowana i uruchomiona — jeśli jeszcze tego nie zrobiłeś, zobacz [Przewodnik Instalacji](INSTALLATION.md).

## Spis Treści

*   [1. Pierwsze Uruchomienie i Dostęp do Konta Administratora](#1-pierwsze-uruchomienie-i-dostęp-do-konta-administratora)
*   [2. Zapoznanie się z Danymi Demo (Opcjonalne)](#2-zapoznanie-się-z-danymi-demo-opcjonalne)
*   [3. Budowa Struktury Archiwum](#3-budowa-struktury-archiwum)
    *   [Krok 1: Zdefiniuj klasyfikację (Sygnatury)](#krok-1-zdefiniuj-klasyfikację-sygnatury)
    *   [Krok 2: Utwórz jednostki (kontenery)](#krok-2-utwórz-jednostki-kontenery)
    *   [Krok 3: Dodaj dokumenty](#krok-3-dodaj-dokumenty)
    *   [Krok 4: Przypisz sygnatury i tagi](#krok-4-przypisz-sygnatury-i-tagi)
*   [4. Organizacja za Pomocą Tagów i Tagowania Wsadowego](#4-organizacja-za-pomocą-tagów-i-tagowania-wsadowego)
*   [5. Wyszukiwanie i Filtrowanie Archiwum](#5-wyszukiwanie-i-filtrowanie-archiwum)
*   [6. Przyznanie Ograniczonego Dostępu Użytkownikowi](#6-przyznanie-ograniczonego-dostępu-użytkownikowi)
*   [7. Zarządzanie Cyklem Życia Pozycji](#7-zarządzanie-cyklem-życia-pozycji)
*   [8. Praca z Notatkami w Zespole](#8-praca-z-notatkami-w-zespole)
*   [9. Rutynowa Konserwacja Administracyjna](#9-rutynowa-konserwacja-administracyjna)

---

## 1. Pierwsze Uruchomienie i Dostęp do Konta Administratora

**Cel:** Zalogowanie się po raz pierwszy i zabezpieczenie konta administratora.

1.  Uruchom serwer (`bun run start:dev` lub `bun run start:prod`). Przy pierwszym starcie aplikacja tworzy bazę danych SQLite oraz konto `admin`.
2.  Odczytaj **hasło administratora** z konsoli:
    *   Jeśli przed uruchomieniem ustawiłeś zmienną środowiskową `JEZARCH_INITIAL_ADMIN_PASSWORD`, hasłem jest właśnie ona.
    *   W przeciwnym razie generowane jest silne losowe hasło, **wyświetlane dokładnie raz** w konsoli serwera. Skopiuj je natychmiast.
3.  Otwórz interfejs w przeglądarce (domyślnie: `http://localhost:8080`) i zaloguj się jako **admin** z tym hasłem.
4.  Dla bezpieczeństwa zmień hasło od razu:
    *   Kliknij ikonę użytkownika w nagłówku → **Zmień hasło**.
    *   Wprowadź obecne hasło, wybierz nowe i potwierdź.

> **Wskazówka:** Inne osoby mogą się same zarejestrować, ale ich konta są tworzone bez roli i nie mogą się zalogować, dopóki nie przypiszesz im roli (zobacz [Scenariusz 6](#6-przyznanie-ograniczonego-dostępu-użytkownikowi) oraz [Przewodnik Administratora](ADMIN_GUIDE.md)).

---

## 2. Zapoznanie się z Danymi Demo (Opcjonalne)

**Cel:** Wypełnienie świeżej instancji przykładowymi użytkownikami, tagami, sygnaturami, jednostkami, dokumentami i notatkami, aby móc poznać interfejs.

1.  Przy działającym serwerze wypełnij bazę danymi demo z katalogu głównego repozytorium:
    ```bash
    bun run seed              # obszerne angielskie dane demo (= seed:en)
    bun run seed:en           # obszerne angielskie dane demo
    bun run seed:pl           # polskie dane demo
    ```
    Jeśli hasło administratora nie zostanie rozpoznane, podaj je jawnie:
    ```bash
    bun run seed http://localhost:8080 <haslo-admina>
    ```
2.  Zaloguj się jako `admin` (lub konto demo) i przejrzyj sekcje Archiwum, Sygnatury, Tagi oraz Notatki, aby zobaczyć wypełnioną zawartość.

> Uwaga: skrypty seed używają domyślnie konta administratora (`SEED_ADMIN_PASSWORD`, argument CLI lub `JEZARCH_INITIAL_ADMIN_PASSWORD`). Szczegóły znajdziesz w [Przewodniku Instalacji](INSTALLATION.md#początkowa-konfiguracja).

---

## 3. Budowa Struktury Archiwum

**Cel:** Od pustego archiwum — utworzenie klasyfikacji, dodanie kontenerów i wypełnienie ich dokumentami z sygnaturami i tagami.

### Krok 1: Zdefiniuj klasyfikację (Sygnatury)

Zacznij od taksonomii sygnatur opisowych, ponieważ dokumenty się do niej odwołują.

1.  Przejdź do **Sygnatury**.
2.  Kliknij **Nowy Komponent** i utwórz potrzebne poziomy, na przykład:
    *   **Zespół** z typem indeksu *Dziesiętny* (1, 2, 3...).
    *   **Seria** z typem indeksu *Rzymski* (I, II, III...).
    *   **Podseria** z typem indeksu *Małe litery* (a, b, c...).
    Zaznacz **Komponent główny** dla poziomów tworzących główną strukturę sygnatur — komponenty główne są sortowane na początku w każdej liście i domyślnie widoczne w szybkim drzewie sygnatur archiwum (dane demo oznaczają wszystkie te trzy poziomy jako główne).
3.  Kliknij wiersz komponentu, aby otworzyć jego stronę Elementów.
4.  Kliknij **Nowy Element**, aby dodać instancje, np. pod *Seria* dodaj "Seria A", "Seria B". Pozostaw pole **Indeks** puste, aby ponumerować element automatycznie. Aby utworzyć element podrzędny istniejącego elementu, użyj selektora **Elementy Nadrzędne** w oknie dialogowym albo kliknij nazwę elementu na stronie Elementów i użyj **Nowy Element** na jego stronie Elementów Podrzędnych — tam element nadrzędny jest wypełniony automatycznie (tylko do odczytu) i wybierasz jedynie komponent.
5.  Jeśli później zmienisz nazwy, dodasz lub usuniesz wiele elementów, kliknij ikonę **Reindeksuj** — na liście Komponentów lub obok tytułu na stronie Elementów danego komponentu — aby spójnie przenumerować wszystko (własne wartości indeksów zostaną nadpisane).

### Krok 2: Utwórz jednostki (kontenery)

1.  Otwórz sekcję **Archiwum**.
2.  Kliknij **Utwórz Pozycję**, ustaw **Typ = Jednostka** i podaj **Tytuł**, **Twórcę** oraz **Datę Utworzenia**.
3.  Opcjonalnie wypełnij blok **Opis Fizyczny** (liczba stron, typ dokumentu, wymiary, oprawa, stan), który dotyczy tylko jednostek.
4.  Kliknij **Utwórz Pozycję**. Nowa jednostka pojawi się na liście.
5.  Powtórz dla dowolnie zagnieżdżonych kontenerów.

### Krok 3: Dodaj dokumenty

1.  **Kliknij jednostkę**, aby do niej wejść, a następnie kliknij **Utwórz Dokument**.
    *   Formularz jest ustawiony na *Dokument*, a jednostka nadrzędna jest już wybrana; możesz też tworzyć dokumenty w głównym widoku archiwum i wybrać jednostkę nadrzędną selektorem.
2.  Wypełnij pola wymagane: **Tytuł**, **Twórca**, **Data Utworzenia** (tekst dowolny, np. `2023-10-26` lub `ok. 1950`).
3.  Wypełnij opcjonalne metadane w miarę potrzeb:
    *   *Treść i Kontekst:* język dokumentu, opis treści, uwagi, pieczęcie, odwołania do powiązanych dokumentów, informacje dodatkowe.
    *   *Dostęp i Digitalizacja:* poziom i warunki dostępu; zaznacz **Czy Zdigitalizowano** i podaj **Link do Wersji Cyfrowej** (prawidłowy URL), jeśli istnieje skan.
4.  Sygnatury i tagi opisano w [Kroku 4](#krok-4-przypisz-sygnatury-i-tagi); następnie kliknij **Utwórz Pozycję**.

### Krok 4: Przypisz sygnatury i tagi

Przy otwartym formularzu dokumentu:

1.  **Sygnatura Topograficzna:** wpisz jej fizyczną lokalizację jako tekst, np. `Pudło 1, Teczka 5, Pozycja 3`.
2.  **Sygnatury Opisowe:** kliknij **Dodaj Ścieżkę Sygnatury** i skorzystaj z selektora:
    *   Wybierz **komponent**, a następnie przeglądaj **Hierarchicznie** (schodząc od elementów głównych) lub wybierz dowolny element w trybie **Wolnym**.
    *   Każdy dodany element rozszerza bieżącą ścieżkę; kliknij **Dodaj Tę Ścieżkę**, aby ją przypisać. Do jednego dokumentu możesz przypisać kilka ścieżek.
3.  **Tagi:** użyj **Selektora Tagów**, aby przypisać istniejące tagi. Brakujące tagi utwórz najpierw w sekcji **Tagi** (zobacz Scenariusz 4).

---

## 4. Organizacja za Pomocą Tagów i Tagowania Wsadowego

**Cel:** Stworzenie spójnego słownika tagów i zastosowanie go do wielu dokumentów naraz.

1.  Przejdź do **Tagi** i kliknij **Utwórz Tag** dla każdej etykiety, którą chcesz używać ponownie (np. `Zdigitalizowane`, `Poufne`, `XIX wiek`). Opcjonalnie dodaj opis.
2.  Przejdź do **Archiwum** i zbuduj wyszukiwanie, które wybierze dokładnie tę grupę pozycji, którą chcesz otagować (zobacz Scenariusz 5). Nagłówek pokazuje, ile pozycji aktualnie pasuje.
3.  Kliknij **Dodaj Tagi** (lub **Usuń Tagi**) obok paska wyszukiwania.
4.  Wybierz tagi w oknie dialogowym i potwierdź.
    *   **Ostrzeżenie:** jeśli żadne filtry wyszukiwania nie są aktywne, akcja wsadowa zostanie zastosowana do **wszystkich** pozycji w archiwum. Zawsze sprawdź wyświetlaną liczbę przed potwierdzeniem.
5.  Tagi służą jako kontrola dostępu dla użytkowników z ograniczeniami — zobacz Scenariusz 6.

---

## 5. Wyszukiwanie i Filtrowanie Archiwum

**Cel:** Znalezienie dokładnego podzbioru dokumentów.

1.  Otwórz **Archiwum**. Pracownicy i administratorzy domyślnie widzą pozycje nieusunięte dzięki automatycznemu filtrowi `Czy Usunięte = Fałsz`.
2.  Użyj **Paska Wyszukiwania**, aby dodawać kryteria:
    *   **Dodaj Filtr** dla każdego pola, które chcesz ograniczyć. Dostępne pola to m.in. Tytuł, Twórca, Data Utworzenia, Miejsce Utworzenia, Pieczęcie, Opis Treści, Sygnatura Topograficzna, Sygnatura Opisowa, Typ (w widoku głównym) i Czy Zdigitalizowano; admin/pracownik widzą dodatkowo Tagi, Utworzone Przez, Zaktualizowane Przez oraz Czy Usunięte.
    *   Wybierz **Warunek** dla każdego pola:
        *   Pola tekstowe: **Zawiera** (dopasowanie fragmentu) lub **Równa się**.
        *   Pola wyboru (Typ): **Jest** lub **Jest jednym z**.
        *   Pola logiczne (Czy Zdigitalizowano, Czy Usunięte): **Jest** → Prawda/Fałsz.
        *   Tagi: **Ma którykolwiek z** (przynajmniej jeden z wybranych tagów).
        *   Sygnatura Opisowa: **Zawiera Sekwencję**, **Zaczyna się** lub **Równa się** (wybierz ścieżkę sygnatury selektorem).
    *   Zaznacz **NIE** w dowolnym wierszu, aby go zanegować (np. `Czy Zdigitalizowano = NIE Prawda`).
    *   Wiele kryteriów łączonych jest operatorem **AND**, więc każde zawęża wyniki.
3.  Kliknij **Szukaj**. Licznik wyników ("Znaleziono N pozycji.") oraz pasek paginacji odzwierciedlają przefiltrowane wyniki.
4.  Kliknij **Resetuj**, aby wyczyścić kryteria (pracownicy i admin wracają do domyślnego widoku bez usuniętych).
5.  Zawęź wyniki dodatkowo za pomocą **"Drzewa sygnatur opisowych"** na pasku bocznym: zaznacz je, wybierz warunek (`Zaczyna się` / `Zawiera Sekwencję` / `Równa się`), a następnie klikaj w hierarchii sygnatur. Wybrana ścieżka jest nakładana na filtry z paska wyszukiwania i pokazywana jako "chip". Użyj przycisku odświeżania, jeśli drzewo jest nieaktualne.
6.  Zmień kolejność wyników, klikając nagłówki kolumn **Typ**, **Tytuł** lub **Sygn. Topograficzna** (przełącza rosnąco/malejąco).

> Dla kont z rolą `użytkownik` wyniki są automatycznie ograniczone do dokumentów mających przynajmniej jeden tag przypisany do konta; jeśli nie przypisano tagów, wyszukiwanie nic nie zwraca.

---

## 6. Przyznanie Ograniczonego Dostępu Użytkownikowi

**Cel:** Umożliwienie nowemu użytkownikowi zalogowania się i wyszukiwania tylko dozwolonych dokumentów.

1.  Poproś użytkownika o rejestrację (lub utwórz konto za niego w **Admin → Zarządzanie Użytkownikami → Utwórz Użytkownika**). Nowe konta mają **Brak Roli / Wyłączony** i nie mogą się zalogować.
2.  W **Admin → Zarządzanie Użytkownikami** znajdź użytkownika i zmień jego rolę na **Użytkownik**, używając listy rozwijanej Rola.
    *   Zostaniesz od razu poproszony o przypisanie dozwolonych tagów; możesz też później kliknąć przycisk **Przypisz Tagi** (ikona tagów) w kolumnie Akcje.
3.  W oknie dialogowym tagów wybierz tagi, do których dokumentów użytkownik ma dostęp, i kliknij **Zapisz**.
    *   Użytkownik widzi dokument, jeśli ma on **przynajmniej jeden** z przypisanych tagów. Dokumenty bez żadnego z tych tagów są dla niego niewidoczne, podobnie jak pozycje usunięte.
4.  Poproś użytkownika o zalogowanie się. Jego strona Archiwum ("Szukaj w Archiwum") pokazuje tylko pasujące dokumenty, a wyszukiwanie automatycznie nakłada filtr tagów.
5.  Aby później odebrać dostęp, usuń tagi w tym samym oknie, zmień rolę lub ustaw rolę na **Brak Roli / Wyłączony**.

> Tagi przypisane użytkownikowi są automatycznie czyszczone, gdy zmienisz jego rolę z `użytkownik` na inną.

---

## 7. Zarządzanie Cyklem Życia Pozycji

**Cel:** Bezpieczne usunięcie pozycji i jej późniejsze odzyskanie.

1.  **Miękkie usunięcie:** w Archiwum kliknij ikonę **Usuń** (kosz) w wierszu dokumentu lub jednostki (lub w oknie podglądu) i potwierdź. Pozycja zostaje ukryta, a **nie** wymazana; admin/pracownik mogą ją odzyskać.
2.  **Podgląd usuniętych pozycji:** jako admin/pracownik ustaw w pasku wyszukiwania **Czy Usunięte = Jest → Prawda** (lub usuń domyślny filtr `Czy Usunięte = Fałsz`). Usunięte wiersze pokazują ikonę **Przywróć**.
3.  **Przywracanie:** kliknij ikonę **Przywróć**, aby przywrócić pozycję do zwykłej listy.

> Usunięte pozycje nigdy nie są widoczne dla kont z rolą `użytkownik`. Usunięcie komponentu lub elementu w **Sygnaturach** jest usunięciem *trwałym*, dlatego mogą to robić tylko administratorzy.

---

## 8. Praca z Notatkami w Zespole

**Cel:** Współdzielenie notatek roboczych między pracownikami.

1.  Otwórz **Notatki** i kliknij **Utwórz Notatkę**.
2.  Wprowadź **Tytuł** i **Treść**, przypisz **Tagi** i zaznacz **Udostępnij tę notatkę publicznie**, jeśli inni administratorzy/pracownicy mają ją widzieć.
3.  Kliknij **Utwórz Notatkę**. Udostępnione notatki pojawiają się na liście wszystkich z oznaczeniem *Udostępniona*; prywatne widzisz tylko Ty.
4.  Szybko znajdź notatki paskiem wyszukiwania: filtruj według Tytułu, Treści, statusu Udostępnienia, Tagów lub Autora (tylko admin).
5.  Tylko właściciel lub administrator mogą zmienić status udostępnienia lub usunąć cudzą notatkę.

---

## 9. Rutynowa Konserwacja Administracyjna

**Cel:** Regularne kopie zapasowe, porządkowanie logów i zmiana ustawień.

1.  **Kopia zapasowa bazy danych:** w **Admin → Baza Danych** kliknij **Pobierz Plik Kopii Zapasowej**. Serwer wysyła spójny snapshot (`VACUUM INTO`), więc pobranie jest bezpieczne, gdy system działa. Przechowuj plik bezpiecznie, poza serwerem.
2.  **Przywracanie kopii** to ręczna operacja po stronie serwera: zatrzymaj serwer, zastąp aktywny plik bazy kopią (zmieniając jej nazwę na oczekiwaną) i uruchom serwer ponownie.
3.  **Porządkowanie logów:** w **Admin → Logi Systemowe** wpisz liczbę dni (np. `30`) i kliknij **Usuń**, aby trwale usunąć starsze wpisy.
4.  **Zmiana ustawień:** w **Admin → Ustawienia Aplikacji** możesz zmienić domyślny język (działa natychmiast) oraz ścieżki klucza/certyfikatu/CA dla HTTPS (przeładowywane natychmiast). Zmiana **portów HTTP/HTTPS** wymaga ręcznego restartu serwera.
5.  **Włączenie HTTPS:** podaj bezwzględne ścieżki do klucza i certyfikatu (oraz opcjonalnego łańcucha CA) i kliknij **Zapisz**. Serwer przeładowuje HTTPS automatycznie; wyczyść ustawienia, aby ponownie wyłączyć HTTPS.