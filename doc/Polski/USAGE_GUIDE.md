# Przewodnik Użytkownika JezArch

Ten przewodnik opisuje podstawowe funkcjonalności aplikacji JezArch dla różnych ról użytkowników. Administratorzy powinni również zapoznać się z [Przewodnikiem Administratora](ADMIN_GUIDE.md) w celu uzyskania informacji o specyficznych zadaniach administracyjnych. Przykłady krok po kroku znajdziesz w [Przykładowych Scenariuszach](WORKFLOWS.md).

## Spis Treści

*   [Logowanie i Rejestracja](#logowanie-i-rejestracja)
*   [Przegląd Interfejsu](#przegląd-interfejsu)
    *   [Nagłówek](#nagłówek)
    *   [Pasek Boczny](#pasek-boczny)
    *   [Główny Obszar Treści](#główny-obszar-treści)
    *   [Wbudowana Pomoc](#wbudowana-pomoc)
*   [Panel Główny](#panel-główny)
*   [Zarządzanie Archiwum](#zarządzanie-archiwum)
    *   [Przeglądanie Jednostek i Dokumentów](#przeglądanie-jednostek-i-dokumentów)
    *   [Wyszukiwanie](#wyszukiwanie)
    *   [Sortowanie i Paginacja](#sortowanie-i-paginacja)
    *   [Wyświetlanie Szczegółów](#wyświetlanie-szczegółów)
    *   [Tworzenie Jednostek/Dokumentów (Admin/Pracownik)](#tworzenie-jednostekdokumentów-adminpracownik)
    *   [Edytowanie Jednostek/Dokumentów (Admin/Pracownik)](#edytowanie-jednostekdokumentów-adminpracownik)
    *   [Usuwanie Pozycji (Admin/Pracownik)](#usuwanie-pozycji-adminpracownik)
    *   [Wsadowe Tagowanie (Admin/Pracownik)](#wsadowe-tagowanie-adminpracownik)
*   [Sygnatury (Admin/Pracownik)](#sygnatury-adminpracownik)
    *   [Komponenty](#komponenty)
    *   [Elementy](#elementy)
*   [Tagi (Admin/Pracownik)](#tagi-adminpracownik)
*   [Notatki (Admin/Pracownik)](#notatki-adminpracownik)
    *   [Przeglądanie i Wyszukiwanie](#przeglądanie-i-wyszukiwanie)
    *   [Tworzenie i Edytowanie](#tworzenie-i-edytowanie)
    *   [Usuwanie](#usuwanie)
    *   [Udostępnianie](#udostępnianie)
*   [Profil Użytkownika](#profil-użytkownika)
    *   [Zmiana Hasła](#zmiana-hasła)
    *   [Zmiana Języka](#zmiana-języka)
    *   [Wylogowywanie](#wylogowywanie)
*   [Przykładowe Scenariusze](#przykładowe-scenariusze)

---

## Logowanie i Rejestracja

*   **Logowanie:** Wejdź do aplikacji pod adresem URL podanym przez administratora (np. `http://localhost:8080`). Wprowadź swoją nazwę użytkownika i hasło na ekranie logowania.
*   **Rejestracja:** Kliknij link "Zarejestruj się". Podaj nazwę użytkownika i silne hasło (minimum 8 znaków, w tym wielka litera, mała litera i cyfra). Potwierdź hasło. Po pomyślnej rejestracji zazwyczaj nie będziesz miał przypisanej żadnej roli ('null') i nie będziesz mógł się zalogować, dopóki Administrator nie przypisze Ci roli ('pracownik' lub 'użytkownik').
*   **Sesje:** Sesja logowania jest ważna przez **24 godziny**. Po tym czasie nastąpi automatyczne wylogowanie i konieczne będzie ponowne zalogowanie.
*   **Limitowanie prób:** Aby utrudnić ataki brute-force i spam, obowiązują limity częstotliwości prób logowania i rejestracji. Po ich przekroczeniu otrzymasz odpowiedź "zbyt wiele żądań" i musisz odczekać przed kolejną próbą.

---

## Przegląd Interfejsu

### Nagłówek

*   **Tytuł Strony i Ikona:** Wyświetla nazwę i odpowiednią ikonę dla bieżącej sekcji.
*   **Menu Użytkownika:** Kliknij ikonę użytkownika (w prawym górnym rogu), aby:
    *   Zobaczyć swoją nazwę użytkownika i rolę.
    *   Zmienić język interfejsu.
    *   Zmienić hasło.
    *   Wylogować się.

### Pasek Boczny

*   Umożliwia nawigację do głównych sekcji aplikacji w zależności od Twojej roli:
    *   **Panel Główny:** Strona przeglądowa.
    *   **Archiwum:** Przeglądaj i wyszukuj dokumenty oraz jednostki archiwalne. (Rola 'Użytkownik' widzi 'Szukaj w Archiwum').
    *   **Sygnatury (Admin/Pracownik):** Zarządzaj komponentami i elementami sygnatur.
    *   **Tagi (Admin/Pracownik):** Zarządzaj globalnymi tagami.
    *   **Notatki (Admin/Pracownik):** Dostęp do osobistych i udostępnionych notatek.
    *   **Admin (Tylko Admin):** Dostęp do funkcji administracyjnych.
*   Pasek boczny pokazuje konto, jako które jesteś zalogowany, oraz ikonę wylogowania u góry.
*   Szerokość paska bocznego można **przeciągać**, aby go zmienić.
*   Na stronie **Archiwum** na dole paska bocznego pojawia się szybki filtr **"Drzewo sygnatur opisowych"** (zobacz [Wyszukiwanie](#wyszukiwanie)).

### Główny Obszar Treści

*   Wyświetla zawartość wybranej sekcji (np. listę dokumentów, formularze, ustawienia).

### Wbudowana Pomoc

*   Każda główna strona (Panel Główny, Archiwum, Sygnatury, Tagi, Notatki, Admin) ma przycisk **Pomoc**, który otwiera wbudowany przewodnik dla tej strony.
*   Przewodniki objaśniają cel sekcji, kluczowe pojęcia i uprawnienia poszczególnych ról.

---

## Panel Główny

Domyślna strona po zalogowaniu. Wyświetla wiadomość powitalną. Użytkownicy z rolą 'Użytkownik' są zachęcani do użycia paska bocznego do przeszukiwania archiwum, podczas gdy inne role są proszone o wybranie sekcji.

---

## Zarządzanie Archiwum

### Przeglądanie Jednostek i Dokumentów

*   Dostępne przez link "Archiwum" / "Szukaj w Archiwum" na pasku bocznym.
*   Główny widok archiwum listuje jednostki i dokumenty najwyższego poziomu.
*   Pozycje oznaczone ikoną **Folderu** to **Jednostki**. Kliknięcie Jednostki przenosi do jej wnętrza, pokazując zawarte w niej dokumenty i podjednostki.
*   Pozycje oznaczone ikoną **Pliku** to **Dokumenty**. Kliknięcie Dokumentu otwiera okno podglądu.
*   Użyj przycisku **Strzałki Wstecz**, będąc wewnątrz jednostki, aby wrócić do poziomu nadrzędnego lub głównego widoku archiwum.
*   Nagłówek pokazuje, ile pozycji pasuje do bieżącego widoku ("Znaleziono N pozycji.").

### Wyszukiwanie

*   Użyj **Paska Wyszukiwania** na górze strony Archiwum, aby znaleźć pozycje.
*   Kliknij **Dodaj Filtr**, aby dodać kryterium wyszukiwania; każdy wiersz ma **Pole**, **Warunek** i **Wartość**.
*   Wybierz **Pole** z listy:
    *   **Wszystkie role:** Tytuł, Twórca, Data Utworzenia, Miejsce Utworzenia, Pieczęcie, Opis Treści, Sygnatura Topograficzna, Sygnatura Opisowa, Typ (tylko w widoku głównym archiwum), Czy Zdigitalizowano.
    *   **Tylko Admin/Pracownik:** Tagi, Utworzone Przez, Zaktualizowane Przez, Czy Usunięte.
    *   Gdy przeglądasz zawartość jednostki, lista jest automatycznie ograniczona do jej zawartości.
*   Wybierz **Warunek** — dostępne warunki zależą od typu pola:
    *   **Pola tekstowe** (Tytuł, Twórca, Data Utworzenia, Miejsce, Pieczęcie, Treść, Sygn. Topograficzna, Utworzone Przez, Zaktualizowane Przez): `Zawiera` (znajduje fragmenty) lub `Równa się`.
    *   **Pola wyboru** (Typ): `Jest` lub `Jest jednym z` (wartości oddzielone przecinkami).
    *   **Pola logiczne** (Czy Zdigitalizowano, Czy Usunięte): `Jest` → `Prawda` lub `Fałsz`.
    *   **Tagi:** `Ma którykolwiek z` — wybierz jeden lub więcej tagów; dopasowuje pozycje z **przynajmniej jednym** z wybranych tagów.
    *   **Sygnatura Opisowa:** `Zawiera Sekwencję`, `Zaczyna się` lub `Równa się` — użyj **Selektora Ścieżki Sygnatury**, aby zbudować ścieżkę elementów do dopasowania. (`Równa się` z pustą ścieżką dopasowuje pozycje bez sygnatury opisowej).
*   Wprowadź **Wartość** dla wybranego pola (fragment tekstu, wartość, wartość logiczna, tagi lub ścieżka sygnatury).
*   Zaznacz pole **NIE** w wierszu, aby zanegować warunek (np. `Czy Zdigitalizowano` + `NIE` znajduje pozycje, które *nie* są zdigitalizowane).
*   Dodaj wiele kryteriów, aby zawęzić wyniki — są łączone operatorem **AND**, więc każdy wiersz dodatkowo ogranicza zbiór wyników.
*   Kliknij **Szukaj**, aby zastosować filtry. Kliknij **Resetuj**, aby wyczyścić kryteria i wrócić do widoku domyślnego (pracownicy i admin wracają do ukrywania usuniętych).
*   **Szybki filtr sygnatur ("Drzewo sygnatur opisowych"):** drzewo na dole paska bocznego to alternatywny sposób filtrowania według sygnatury opisowej. Włącz pole wyboru, wybierz warunek (`Zaczyna się` / `Zawiera Sekwencję` / `Równa się`) i klikaj w hierarchii sygnatur (komponenty → elementy → elementy podrzędne), aby wybrać ścieżkę. Wybrana ścieżka jest nakładana **na wierzch** kryteriów z paska wyszukiwania, a jej elementy są pokazywane jako rozwiązana ścieżka. Kliknij już wybrany element, aby wyczyścić filtr, a jeśli drzewo jest nieaktualne, użyj ikony odświeżania. Domyślnie na najwyższym poziomie drzewa widoczne są tylko **komponenty główne**; odznacz **Tylko komponenty główne**, aby pokazać wszystkie komponenty (elementy ukrytych komponentów pozostają dostępne jako dzieci).
*   **Rola 'Użytkownik':** filtr tagów jest zawsze aktywny — wyniki obejmują tylko dokumenty mające **przynajmniej jeden** z tagów przypisanych Ci przez administratora. Jeśli nie przypisano tagów, wyszukiwanie nic nie zwraca.

### Sortowanie i Paginacja

*   Kliknij nagłówek kolumny, aby posortować listę archiwum — sortowalne kolumny to **Typ**, **Tytuł** i **Sygn. Topograficzna**.
*   Kliknij ten sam nagłówek ponownie, aby przełączyć między porządkiem rosnącym a malejącym; strzałki wskazują bieżący kierunek.
*   Wyniki są podzielone na strony (10 pozycji na stronę). Użyj paska paginacji na dole listy, aby przechodzić między stronami.

### Wyświetlanie Szczegółów

*   Kliknięcie wiersza **Dokumentu** na liście otwiera **Okno Podglądu**.
*   Okno dialogowe pokazuje:
    *   Podstawowe informacje (Tytuł, Twórca, Data, Miejsce Utworzenia, link do Jednostki Nadrzędnej, Typ).
    *   Przypisane Tagi i Sygnatury (Topograficzną i rozwiązane ścieżki Opisowe).
    *   Informacje o tym, kto utworzył/zaktualizował pozycję wraz ze znacznikami czasu.
    *   Opis Treści, Uwagi, Pieczęcie, Język Dokumentu.
    *   Szczegóły Fizyczne dla **jednostek** (Strony, Typ Dokumentu, Wymiary, Oprawa, Stan).
    *   Informacje o Dostępie (Poziom Dostępu, Warunki Dostępu) oraz Informacje Dodatkowe / Powiązane Dokumenty, jeśli podano.
    *   Status digitalizacji ("Tak — Link:" otwiera wersję cyfrową, jeśli dostępna; w przeciwnym razie "Nie").
*   Administratorzy/Pracownicy widzą przyciski **Edytuj** i **Usuń** w stopce okna dialogowego (oraz **Przywróć** dla usuniętych pozycji).

### Tworzenie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij przycisk **Utwórz Pozycję** (lub **Utwórz Dokument**, gdy jesteś wewnątrz jednostki).
*   Pojawi się okno dialogowe z formularzem podzielonym na sekcje:
    *   **Podstawowe Informacje:**
        *   **Typ:** Wybierz 'Jednostka' lub 'Dokument'. Nie można zmienić po utworzeniu. Jeśli jesteś wewnątrz jednostki, domyślnie jest to 'Dokument' i nie można tego zmienić.
        *   **Jednostka Nadrzędna:** (Tylko dla Dokumentów, podczas tworzenia w głównym widoku) Wybierz jednostkę, do której należy ten dokument, używając wyszukiwanej listy rozwijanej.
        *   **Tytuł, Twórca, Data Utworzenia:** Pola wymagane. Data Utworzenia to tekst dowolny (np. `2023-10-26` lub `ok. 1950`).
        *   **Miejsce Utworzenia** i **Pieczęcie** (opcjonalne).
    *   **Opis Fizyczny** *(pokazywany tylko dla Jednostek):* Liczba Stron, Typ Dokumentu, Wymiary, Oprawa, Stan.
    *   **Treść i Kontekst:** Język Dokumentu, Opis Treści, Uwagi, Pieczęcie, Odwołania do Powiązanych Dokumentów, Informacje Dodatkowe.
    *   **Dostęp i Digitalizacja:** Poziom Dostępu, Warunki Dostępu, pole **Czy Zdigitalizowano** (zaznaczenie odsłania **Link do Wersji Cyfrowej**, który musi być prawidłowym URL-em).
    *   **Indeksowanie:**
        *   **Sygnatura Topograficzna:** tekst dowolny dla fizycznej lokalizacji (np. `Pudło 1, Teczka 5, Pozycja 3`).
        *   **Sygnatury Opisowe:** użyj **Selektora Ścieżki Sygnatury**, aby dodać jedną lub więcej ścieżek elementów.
        *   **Tagi:** przypisz istniejące tagi **Selektorem Tagów** (najpierw utwórz tagi w sekcji Tagi).
    *   Kliknij **Utwórz Pozycję**.

### Edytowanie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij ikonę **Edytuj** (ołówek) w wierszu pozycji lub w oknie podglądu.
*   Otworzy się okno dialogowe formularza, wstępnie wypełnione danymi pozycji.
*   Zmodyfikuj pola według potrzeb. 'Typu' nie można zmienić.
*   Kliknij **Aktualizuj Pozycję**.

### Usuwanie Pozycji (Admin/Pracownik)

*   Kliknij ikonę **Usuń** (kosz) w wierszu pozycji lub w oknie podglądu.
*   Potwierdź akcję w monicie.
*   Pozycja zostanie miękko usunięta: nie zostaje trwale usunięta. W domyślnym widoku pokazujemy tylko pozycje nieuusunięte; Administrator i Pracownik mogą ujawnić usunięte pozycje, usuwając filtr `Czy Usunięte` (lub ustawiając go na `Prawda`) — usunięte pozycje otrzymują ikonę **Przywróć**. Zwykli użytkownicy nigdy nie widzą pozycji usuniętych.
*   Kliknij ikonę **Przywróć** przy pozycji, aby ją przywrócić.

### Wsadowe Tagowanie (Admin/Pracownik)

*   Użyj paska wyszukiwania, aby przefiltrować pozycje, które chcesz otagować.
*   Kliknij **Dodaj Tagi** lub **Usuń Tagi** obok paska wyszukiwania.
*   Pojawi się okno dialogowe pokazujące, na ile pozycji wpłynie akcja w oparciu o bieżące filtry wyszukiwania.
    *   **Ostrzeżenie:** Jeśli żadne filtry wyszukiwania nie są aktywne, akcja zostanie zastosowana do *wszystkich* pozycji w archiwum.
*   Wybierz tagi, które chcesz dodać lub usunąć, używając Selektora Tagów.
*   Kliknij **Dodaj Tagi ({liczba})** lub **Usuń Tagi ({liczba})**, aby potwierdzić.

---

## Sygnatury (Admin/Pracownik)

Zarządzaj elementami składowymi sygnatur opisowych.

### Komponenty

*   Przejdź do sekcji **Sygnatury**.
*   Wyświetl istniejące komponenty, ich opis, typ indeksowania i liczbę elementów. Komponenty są sortowane z **komponentami głównymi na początku**, a następnie alfabetycznie; komponenty główne mają wyróżnioną (kolorową) ikonę folderu.
*   **Tworzenie:** Kliknij **Nowy Komponent**. Podaj unikalną Nazwę, opcjonalny Opis, wybierz Typ Formatowania Indeksu (jak będą wyświetlane indeksy elementów w tym komponencie - Dziesiętny, Rzymski itp.) i zaznacz **Komponent główny**, jeśli ten poziom należy do głównej struktury sygnatur.
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis, Typ Indeksu lub flagę **Komponent główny**.
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). **Ostrzeżenie:** To trwale usuwa komponent ORAZ wszystkie jego elementy.
*   **Reindeksacja (Admin/Pracownik):** Kliknij ikonę **Reindeksuj** (lista restart). Przelicza i aktualizuje pole `index` dla wszystkich elementów w tym komponencie w oparciu o ich kolejność alfabetyczną i typ indeksu komponentu. Przydatne po dodaniu/usunięciu/zmianie nazwy wielu elementów. Uwaga: własne indeksy elementów zostaną nadpisane.
*   **Otwórz:** Kliknij wiersz komponentu, aby przejść do strony jego Elementów.

### Elementy

*   Przejdź na tę stronę, klikając wiersz komponentu na stronie Sygnatury.
*   Wyświetl elementy należące do wybranego komponentu nadrzędnego.
*   **Edycja komponentu nadrzędnego:** Kliknij ikonę **Edytuj** (ołówek) obok tytułu strony, aby zmodyfikować Nazwę, Opis, Typ Indeksu lub flagę Główny komponent bez opuszczania strony Elementów.
*   **Reindeksacja komponentu nadrzędnego:** Kliknij ikonę **Reindeksuj** (lista restart) obok tytułu strony, aby ponumerować wszystkie elementy w tym komponencie — to samo działanie co Reindeksacja na liście Komponentów (własne wartości indeksów zostaną nadpisane).
*   **Tworzenie:** Kliknij **Nowy Element**. Podaj Nazwę, opcjonalny Opis. Możesz opcjonalnie podać konkretny Indeks (tekst, np. "1a", "V"), w przeciwnym razie zostanie on wygenerowany automatycznie na podstawie licznika komponentu i typu indeksu. Użyj selektora **Elementy Nadrzędne**, aby połączyć ten element jako dziecko innych elementów (tworząc relacje hierarchiczne).
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis, Indeks lub Elementy Nadrzędne. Wyczyszczenie pola Indeks usuwa własną wartość (element zachowa bieżący indeks do czasu reindeksacji).
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). To trwale usuwa element i czyści odwołania do niego w ścieżkach sygnatur dokumentów.
*   **Wyszukiwanie:** Użyj paska wyszukiwania, aby filtrować elementy w bieżącym komponencie (filtr komponentu jest już nałożony). Dostępne pola: **Nazwa**, **Opis** i **Indeks** (wszystkie z warunkami `Zawiera` / `Równa się`) oraz **Ma Rodziców** (warunek logiczny `Jest` → Prawda/Fałsz, pokazujący tylko elementy będące dziećmi innych elementów). Wyniki są podzielone na strony (15 na stronę).

---

## Tagi (Admin/Pracownik)

Zarządzaj globalnymi tagami używanymi do organizacji dokumentów i notatek.

*   Przejdź do sekcji **Tagi**.
*   Wyświetl wszystkie istniejące tagi.
*   **Tworzenie:** Kliknij **Utwórz Tag**. Wprowadź Nazwę i opcjonalny Opis.
*   **Edycja (Admin/Pracownik):** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę lub Opis.
*   **Usuwanie (Admin/Pracownik):** Kliknij ikonę **Usuń** (kosz). Potwierdź usunięcie. Spowoduje to globalne usunięcie taga i usunięcie go ze wszystkich powiązanych elementów.

---

## Notatki (Admin/Pracownik)

Twórz i zarządzaj osobistymi oraz udostępnionymi notatkami.

### Przeglądanie i Wyszukiwanie

*   Przejdź do sekcji **Notatki**.
*   Lista wyświetla notatki utworzone przez Ciebie **LUB** notatki utworzone przez innych, które są oznaczone jako **Udostępnione**.
*   Użyj **Paska Wyszukiwania**, aby filtrować notatki. Dostępne pola: **Tytuł**, **Treść** (`Zawiera` / `Równa się`), **Udostępniona** (logiczne `Jest` → Prawda/Fałsz), **Tagi** (`Ma którykolwiek z`) oraz **Autor** (`Zawiera` / `Równa się`; widoczne tylko dla Admina). Wiele kryteriów łączonych jest operatorem **AND**, a każdy wiersz można zanegować polem **NIE**.
*   Kliknij tytuł notatki lub ikonę **Podgląd** (oko), aby zobaczyć pełną treść w oknie dialogowym.

### Tworzenie i Edytowanie

*   Kliknij **Utwórz Notatkę**.
*   Wprowadź Tytuł (wymagany) i Treść.
*   Użyj **Selektora Tagów**, aby przypisać odpowiednie tagi.
*   Opcjonalnie zaznacz **Udostępnij tę notatkę publicznie**, aby była widoczna dla innych Administratorów/Pracowników na głównej liście. (Tylko właściciele lub Administratorzy mogą to później zmienić).
*   Kliknij **Utwórz Notatkę**.
*   Aby edytować, kliknij ikonę **Edytuj** (ołówek) w wierszu notatki. Zmodyfikuj szczegóły i kliknij **Edytuj Notatkę**.

### Usuwanie

*   Możesz usuwać notatki, których jesteś właścicielem.
*   Administratorzy mogą usuwać dowolne notatki.
*   Kliknij ikonę **Usuń** (kosz) i potwierdź.

### Udostępnianie

*   Podczas tworzenia lub edytowania notatki zaznacz pole "Udostępnij tę notatkę publicznie".
*   Udostępnione notatki są widoczne na głównej liście dla wszystkich Administratorów i Pracowników.
*   Tylko właściciel notatki lub Administrator może zmienić status udostępniania.

---

## Profil Użytkownika

### Zmiana Hasła

*   Wybierz "Zmień hasło" z menu użytkownika.
*   Wprowadź swoje **Obecne Hasło**.
*   Wprowadź swoje **Nowe Hasło** i potwierdź je. Upewnij się, że spełnia wymagania złożoności.
*   Kliknij **Zmień hasło**.

### Zmiana Języka

*   Kliknij menu rozwijane ikony użytkownika.
*   Najedź kursorem lub kliknij podmenu "Język".
*   Wybierz preferowany język (np. English, Polski).
*   Interfejs zostanie natychmiast zaktualizowany, a Twoje preferencje zostaną zapisane dla przyszłych sesji.

### Wylogowywanie

*   Wybierz "Wyloguj" z menu użytkownika.
*   Twoja sesja zostanie zakończona.

---

## Przykładowe Scenariusze

Pełne, krok po kroku przykłady — od pierwszego uruchomienia, przez budowę archiwum i wyszukiwanie, po przyznawanie ograniczonego dostępu i rutynową konserwację — znajdziesz w przewodniku [Przykładowe Scenariusze](WORKFLOWS.md).
