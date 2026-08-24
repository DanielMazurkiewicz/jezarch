# JezArch - Często Zadawane Pytania

Odpowiedzi na najczęstsze pytania dotyczące systemu zarządzania archiwum JezArch.

## Ogólne Koncepcje

### Czym jest element? (#21)

W systemie sygnatur, **element** to pojedyncza pozycja w ramach komponentu. Na przykład, jeśli masz komponent o nazwie "Seria", elementami mogą być "Seria A", "Seria B", "Seria C" itp.

Elementy mogą mieć **elementy nadrzędne** z innych komponentów, tworząc hierarchię. Na przykład, "Seria A" (element) może być dzieckiem "Zespołu X" (element z innego komponentu).

Podczas tworzenia dokumentu w sekcji Archiwum, przypisujesz mu "opisową ścieżkę sygnatury" - sekwencję identyfikatorów elementów, która klasyfikuje, gdzie dokument należy w strukturze archiwum.

### Czym jest komponent? (#25)

**Komponent** to kategoria klasyfikacyjna, która definiuje poziom w hierarchicznej strukturze archiwum. Typowe przykłady obejmują:

- **Zespół** - najwyższy poziom organizacji (np. cała kolekcja)
- **Seria** - grupa powiązanych rekordów w ramach zespołu
- **Podseria** - podział serii

Każdy komponent ma **typ indeksu**, który określa, jak numerowane są jego elementy:
- Dziesiętny (1, 2, 3...)
- Rzymski (I, II, III...)
- Małe litery (a, b, c...)
- Duże litery (A, B, C...)

### Jaka jest różnica między komponentem a elementem? (#25)

| Komponent | Element |
|-----------|---------|
| Typ kategorii (jak etykieta folderu) | Konkretna instancja w ramach tej kategorii |
| Definiuje format indeksu (dziesiętny, rzymski itp.) | Otrzymuje automatyczny lub ręczny indeks |
| Przykład: "Seria" | Przykład: "Seria A", "Seria B" |
| Może być usunięty (kaskadowo do elementów) | Może mieć elementy nadrzędne z innych komponentów |

### Jak działa hierarchia elementów? (#27)

Elementy mogą mieć **relacje nadrzędne-podrzędne** z innymi elementami, nawet z różnych komponentów. Jest to przechowywane w tabeli wiele-do-wielu (`signature_element_parents`), co oznacza, że element może mieć wielu rodziców.

W oknie **Selektora Ścieżki Sygnatury** (używanym podczas tworzenia/edycji dokumentów archiwalnych):

- **Tryb hierarchiczny**: Pokazuje elementy główne (te bez rodziców) jako pierwsze. Wybranie elementu ujawnia jego dzieci, umożliwiając schodzenie poziom po poziomie.
- **Tryb wolny**: Pokazuje wszystkie elementy z wybranego komponentu naraz, pozwalając wybrać dowolny element niezależnie od relacji nadrzędnych.

Podczas tworzenia lub edycji elementu możesz przypisać elementy nadrzędne z innych komponentów, aby zbudować drzewo klasyfikacji. System zapobiega ustawieniu samego siebie jako rodzica, ale nie wymusza ścisłego drzewa z jednym rodzicem — elementy mogą należeć do wielu gałęzi.

## Relacja Archiwum i Sygnatur

### Jaka jest relacja między Archiwum a Sygnaturami? (#22)

- **Sygnatury** definiują system klasyfikacji - hierarchiczną taksonomię komponentów i elementów
- **Archiwum** przechowuje rzeczywiste jednostki (pojemniki) i dokumenty (pozycje)

Łącznikiem między nimi jest pole **"opisowa ścieżka sygnatury"** w dokumentach archiwalnych. To pole przechowuje odniesienia do identyfikatorów elementów z systemu sygnatur, klasyfikując, gdzie każdy dokument należy.

Na przykład, dokument może mieć opisową ścieżkę sygnatury `[1, 5, 12]`, co oznacza, że należy pod Elementem 1 → Elementem 5 → Elementem 12 w hierarchii klasyfikacji.

### Jak wpisy w Sygnaturach pojawiają się w Archiwum? (#24)

Podczas tworzenia komponentów i elementów w sekcji Sygnatury, stają się one dostępne w oknie dialogowym "Dodaj Ścieżkę Sygnatury" w sekcji Archiwum. Okno dialogowe pobiera wszystkie komponenty i elementy z API, umożliwiając przeglądanie i wybieranie elementów do zbudowania ścieżki sygnatury dla dokumentów.

### Czy Sygnatury powinny używać opisów w stylu inwentarza, a Archiwum widoku drzewa? (#23)

Obecny projekt rozdziela odpowiedzialności:

- **Sekcja Sygnatur** używa widoku listy (jak inwentarz/katalog) - jest to odpowiednie, ponieważ komponenty i elementy są definicjami klasyfikacji, a nie hierarchicznymi pojemnikami
- **Sekcja Archiwum** obsługuje nawigację hierarchiczną przez jednostki (kliknięcie jednostki nawiguje do `?unitId=N`, pokazując tylko dzieci tej jednostki)

Struktura drzewa archiwum jest zdefiniowana przez pole `parentUnitArchiveDocumentId`, które tworzy relacje nadrzędne-podrzędne między jednostkami i dokumentami.

## Opisy Dokumentów i Jednostek

### Dlaczego jednostki i dokumenty nie mogą mieć tego samego szczegółowego opisu? (#20)

Pola opisu fizycznego (wymiary, oprawa, stan, liczba stron itp.) dotyczą **jednostek** (woluminów oprawionych), a nie pojedynczych dokumentów. Jednostka reprezentuje fizyczny obiekt, taki jak oprawiony wolumin, który może zawierać wiele dokumentów.

Dla **dokumentów** potrzebne są tylko następujące pola:
- Tytuł
- Twórca
- Data utworzenia
- Opis treści
- Uwagi
- Sygnatury topograficzne/opisowe
- Tagi

Formularz warunkowo pokazuje pola opisu fizycznego tylko wtedy, gdy typ jest ustawiony na "jednostka". Dodatkowo, okno podglądu wyświetla szczegóły fizyczne tylko dla jednostek, a backend automatycznie usuwa pola opisu fizycznego, gdy typ to "dokument".

## Role Użytkowników i Uprawnienia

### Dlaczego tylko administratorzy mogą tworzyć komponenty? (#26)

To było ograniczenie, które zostało naprawione. Teraz zarówno rola **admin**, jak i **pracownik** mogą:
- Tworzyć komponenty
- Edytować komponenty
- Tworzyć i edytować elementy
- Przeglądać podgląd komponentów i elementów
- Reindeksować elementy (przelicza wszystkie indeksy)

**Tylko admin** może:
- Usuwać komponenty (destrukcyjne - kaskadowo do wszystkich elementów)
- Usuwać elementy (destrukcyjne - czyści odwołania w ścieżkach sygnatur dokumentów)

### Dlaczego pracownicy nie mają dostępu do sekcji Sygnatury? (#28)

Sekcja Sygnatury jest dostępna zarówno dla roli admin, jak i pracownik. Jeśli masz problemy z dostępem:

1. Upewnij się, że Twoje konto ma przypisaną rolę `employee` (nie `null`)
2. Wyloguj się i zaloguj ponownie, aby odświeżyć sesję
3. Sprawdź, czy pasek boczny pokazuje link "Sygnatury" dla Twojej roli

Kontrolery backendu i trasy frontendu poprawnie zezwalają rolom `admin` i `employee` na wszystkie operacje na sygnaturach.

## Wybór Ścieżki Sygnatury

### Dlaczego dokumenty nie pojawiają się podczas dodawania ścieżki sygnatury? (#29)

Selektor ścieżki sygnatury (`ElementBrowserDialogContent`) ładuje komponenty i elementy z API. Jeśli elementy się nie pojawiają:

1. Upewnij się, że komponenty i elementy zostały utworzone w sekcji Sygnatury
2. Najpierw wybierz komponent z listy rozwijanej
3. W **trybie hierarchicznym**: najpierw pokazywane są elementy bez rodziców, następnie dzieci wybranych elementów
4. W **trybie wolnym**: pokazywane są wszystkie elementy z wybranego komponentu
5. Użyj pola wyszukiwania, aby filtrować elementy według nazwy lub indeksu

Pole uwag w formularzach dokumentów akceptuje nieograniczoną liczbę znaków (używa komponentu `Textarea` bez limitu znaków w frontendzie ani backendzie).

## Funkcje Interfejsu

### Czy każda sekcja ma opcje podglądu i usuwania? (#30)

Tak, wszystkie główne sekcje mają teraz:

| Sekcja | Podgląd | Usuwanie |
|--------|---------|----------|
| Archiwum | DocumentPreviewDialog | Miękkie usunięcie / przywracanie (soft delete) |
| Komponenty | ComponentPreviewDialog | Twarde usuwanie tylko dla admina |
| Elementy | ElementPreviewDialog | Twarde usuwanie tylko dla admina |
| Tagi | Formularz edycji służy jako podgląd | Usuwanie z potwierdzeniem |
| Notatki | NotePreviewDialog | Usuwanie z potwierdzeniem |

Okna dialogowe podglądu pokazują szczegóły wybranej pozycji w trybie tylko do odczytu, z przyciskami edycji/usuwania dla autoryzowanych użytkowników (właściciel lub admin dla notatek, admin/pracownik dla pozostałych sekcji).

### Czy lista archiwum jest sortowalna? (#31)

Tak, lista archiwum obsługuje sortowanie według:
- **Tytułu** - sortowanie alfabetyczne
- **Typu** - jednostka vs dokument
- **Sygnatury Topograficznej** - sortowanie alfabetyczne tekstu sygnatury

Kliknij nagłówek kolumny, aby sortować. Kliknij ponownie, aby przełączyć między porządkiem rosnącym a malejącym. Wskaźniki sortowania (strzałki) pokazują bieżący kierunek sortowania.
