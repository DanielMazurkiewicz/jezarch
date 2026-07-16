# Przewodnik Użytkownika JezArch

Ten przewodnik opisuje podstawowe funkcjonalności aplikacji JezArch dla różnych ról użytkowników. Administratorzy powinni również zapoznać się z [Przewodnikiem Administratora](ADMIN_GUIDE.md) w celu uzyskania informacji o specyficznych zadaniach administracyjnych.

## Spis Treści

*   [Logowanie i Rejestracja](#logowanie-i-rejestracja)
*   [Przegląd Interfejsu](#przegląd-interfejsu)
    *   [Nagłówek](#nagłówek)
    *   [Pasek Boczny](#pasek-boczny)
    *   [Główny Obszar Treści](#główny-obszar-treści)
*   [Panel Główny](#panel-główny)
*   [Zarządzanie Archiwum](#zarządzanie-archiwum)
    *   [Przeglądanie Jednostek i Dokumentów](#przeglądanie-jednostek-i-dokumentów)
    *   [Wyszukiwanie](#wyszukiwanie)
    *   [Wyświetlanie Szczegółów](#wyświetlanie-szczegółów)
    *   [Tworzenie Jednostek/Dokumentów (Admin/Pracownik)](#tworzenie-jednostekdokumentów-adminpracownik)
    *   [Edytowanie Jednostek/Dokumentów (Admin/Pracownik)](#edytowanie-jednostekdokumentów-adminpracownik)
    *   [Dezaktywacja Pozycji (Admin/Pracownik)](#dezaktywacja-pozycji-adminpracownik)
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

---

## Logowanie i Rejestracja

*   **Logowanie:** Wejdź do aplikacji pod adresem URL podanym przez administratora (np. `http://localhost:8080`). Wprowadź swoją nazwę użytkownika i hasło na ekranie logowania.
*   **Rejestracja:** Jeśli rejestracja jest włączona, kliknij link "Zarejestruj się". Podaj nazwę użytkownika i silne hasło (minimum 8 znaków, w tym wielka litera, mała litera i cyfra). Potwierdź hasło. Po pomyślnej rejestracji zazwyczaj nie będziesz miał przypisanej żadnej roli ('null') i nie będziesz mógł się zalogować, dopóki Administrator nie przypisze Ci roli ('pracownik' lub 'użytkownik').

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

### Główny Obszar Treści

*   Wyświetla zawartość wybranej sekcji (np. listę dokumentów, formularze, ustawienia).

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

### Wyszukiwanie

*   Użyj **Paska Wyszukiwania** na górze strony Archiwum, aby znaleźć pozycje.
*   Kliknij **Dodaj Filtr**, aby dodać kryteria wyszukiwania.
*   Wybierz **Pole** (np. Tytuł, Twórca, Tagi, Sygnatura Opisowa).
*   Wybierz **Warunek** (np. Zawiera, Równa się, Ma którykolwiek z, Zaczyna się od ścieżki).
*   Wprowadź **Wartość**.
    *   Dla pól tekstowych (`Zawiera`): Wprowadź fragmenty tekstu.
    *   Dla `Tagów`: Wybierz jeden lub więcej tagów z listy rozwijanej. `Ma którykolwiek z` znajduje pozycje z *przynajmniej jednym* z wybranych tagów.
    *   Dla `Sygnatury Opisowej`: Użyj **Selektora Ścieżki Sygnatury** (`Równa się`, `Zaczyna się`, `Zawiera Sekwencję`), aby zbudować ścieżkę sygnatury, której chcesz szukać.
    *   Dla pól `boolean` (Czy zdigitalizowano, Czy Aktywny): Wybierz `Prawda` lub `Fałsz`.
*   Możesz zaznaczyć pole **NIE**, aby zanegować warunek (np. znaleźć pozycje *nie* pasujące).
*   Dodaj wiele kryteriów, aby zawęzić wyniki (są łączone operatorem AND).
*   Kliknij **Szukaj**, aby zastosować filtry. Kliknij **Resetuj**, aby wyczyścić filtry.
*   **Rola 'Użytkownik':** Wyniki wyszukiwania są automatycznie filtrowane, aby pokazać tylko dokumenty pasujące do tagów przypisanych użytkownikowi przez administratora.

### Wyświetlanie Szczegółów

*   Kliknięcie wiersza **Dokumentu** na liście otwiera **Okno Podglądu**.
*   Okno dialogowe pokazuje:
    *   Podstawowe informacje (Tytuł, Twórca, Data, link do Jednostki Nadrzędnej).
    *   Przypisane Tagi i Sygnatury (Topograficzną i rozwiązane Opisowe).
    *   Informacje o tym, kto utworzył/zaktualizował pozycję wraz ze znacznikami czasu.
    *   Opis Treści, Szczegóły Fizyczne, informacje o Dostępie, Uwagi itp.
    *   Link do wersji cyfrowej, jeśli jest dostępna.
*   Administratorzy/Pracownicy widzą przyciski **Edytuj** i **Dezaktywuj** w stopce okna dialogowego.

### Tworzenie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij przycisk **Utwórz Pozycję** (lub **Utwórz Dokument**, gdy jesteś wewnątrz jednostki).
*   Pojawi się okno dialogowe z formularzem:
    *   **Typ:** Wybierz 'Jednostka' lub 'Dokument'. Nie można zmienić po utworzeniu. Jeśli jesteś wewnątrz jednostki, domyślnie jest to 'Dokument' i nie można tego zmienić.
    *   **Jednostka Nadrzędna:** (Tylko dla Dokumentów, podczas tworzenia w głównym widoku) Wybierz jednostkę, do której należy ten dokument, używając wyszukiwanej listy rozwijanej.
    *   **Tytuł, Twórca, Data Utworzenia:** Pola wymagane.
    *   **Sygnatury i Tagi:** Użyj dedykowanych selektorów, aby przypisać Sygnaturę Topograficzną (tekst), Sygnatury Opisowe (ścieżki) i Tagi.
    *   **Inne Pola:** Wypełnij opcjonalne metadane (Opis Fizyczny, Treść, Dostęp, Digitalizacja itp.).
    *   Kliknij **Utwórz Pozycję**.

### Edytowanie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij ikonę **Edytuj** (ołówek) w wierszu pozycji lub w oknie podglądu.
*   Otworzy się okno dialogowe formularza, wstępnie wypełnione danymi pozycji.
*   Zmodyfikuj pola według potrzeb. 'Typu' nie można zmienić.
*   Kliknij **Aktualizuj Pozycję**.

### Dezaktywacja Pozycji (Admin/Pracownik)

*   Kliknij ikonę **Dezaktywuj** (kosz) w wierszu pozycji lub w oknie podglądu.
*   Potwierdź akcję w monicie.
*   Pozycja zostanie oznaczona jako nieaktywna i ukryta w regularnych widokach i wyszukiwaniach (chyba że Administrator specjalnie uwzględni nieaktywne pozycje w swoim wyszukiwaniu). Dezaktywowane pozycje nie są trwale usuwane.

### Wsadowe Tagowanie (Admin/Pracownik)

*   Użyj paska wyszukiwania, aby przefiltrować pozycje, które chcesz otagować.
*   Kliknij **Dodaj Tagi** lub **Usuń Tagi** obok paska wyszukiwania.
*   Pojawi się okno dialogowe pokazujące, na ile pozycji wpłynie akcja w oparciu o bieżące filtry wyszukiwania.
    *   **Ostrzeżenie:** Jeśli żadne filtry wyszukiwania nie są aktywne, akcja zostanie zastosowana do *wszystkich* pozycji w archiwum.
*   Wybierz tagi, które chcesz dodać lub usunąć, używając Selektora Tagów.
*   Kliknij **Dodaj Tagi ({liczba})** lub **Usuń Tagi ({liczba})**, aby potwierdzić.

---

## Sygnatury (Admin/Pracownik)

### Komponenty

*   Przejdź do sekcji **Sygnatury**.
*   Wyświetl istniejące komponenty, ich opis, typ indeksowania i liczbę elementów.
*   **Tworzenie:** Kliknij **Nowy Komponent**. Podaj unikalną Nazwę, opcjonalny Opis i wybierz Typ Formatowania Indeksu (jak będą wyświetlane indeksy elementów w tym komponencie - Dziesiętny, Rzymski itp.).
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis lub Typ Indeksu.
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). **Ostrzeżenie:** To trwale usuwa komponent ORAZ wszystkie jego elementy.
*   **Reindeksacja (Tylko Admin):** Kliknij ikonę **Reindeksuj** (lista restart). Przelicza i aktualizuje pole `index` dla wszystkich elementów w tym komponencie w oparciu o ich kolejność alfabetyczną i typ indeksu komponentu. Przydatne po dodaniu/usunięciu/zmianie nazwy wielu elementów.
*   **Otwórz:** Kliknij wiersz komponentu, aby przejść do strony jego Elementów.

### Elementy

*   Przejdź na tę stronę, klikając wiersz komponentu na stronie Sygnatury.
*   Wyświetl elementy należące do wybranego komponentu nadrzędnego.
*   **Tworzenie:** Kliknij **Nowy Element**. Podaj Nazwę, opcjonalny Opis. Możesz opcjonalnie podać konkretny Indeks (tekst, np. "1a", "V"), w przeciwnym razie zostanie on wygenerowany automatycznie na podstawie licznika komponentu i typu indeksu. Użyj selektora **Elementy Nadrzędne**, aby połączyć ten element jako dziecko innych elementów (tworząc relacje hierarchiczne).
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis, Indeks lub Elementy Nadrzędne.
*   **Usuwanie:** Kliknij ikonę **Usuń** (kosz).
*   **Wyszukiwanie:** Użyj paska wyszukiwania, aby filtrować elementy w bieżącym komponencie według Nazwy, Opisu, Indeksu lub tego, czy mają elementy nadrzędne.

---

## Tagi (Admin/Pracownik)

Zarządzaj globalnymi tagami używanymi do organizacji dokumentów i notatek.

*   Przejdź do sekcji **Tagi**.
*   Wyświetl wszystkie istniejące tagi.
*   **Tworzenie:** Kliknij **Utwórz Tag**. Wprowadź Nazwę i opcjonalny Opis.
*   **Edycja (Tylko Admin):** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę lub Opis.
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). Potwierdź usunięcie. Spowoduje to globalne usunięcie taga i usunięcie go ze wszystkich powiązanych elementów.

---

## Notatki (Admin/Pracownik)

### Przeglądanie i Wyszukiwanie

*   Przejdź do sekcji **Notatki**.
*   Lista wyświetla notatki utworzone przez Ciebie **LUB** notatki utworzone przez innych, które są oznaczone jako **Udostępnione**.
*   Użyj **Paska Wyszukiwania**, aby filtrować notatki według Tytułu, Treści, statusu Udostępnienia, Tagów lub Autora (Tylko Admin).
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
