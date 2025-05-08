# JezArch Usage Guide

This guide covers the core functionalities of the JezArch application for different user roles. Administrators should also consult the [Admin Guide](ADMIN_GUIDE.md) for specific administrative tasks.

## Table of Contents

*   [Logging In & Registration](#logging-in--registration)
*   [Interface Overview](#interface-overview)
    *   [Header](#header)
    *   [Sidebar](#sidebar)
    *   [Main Content Area](#main-content-area)
*   [Dashboard](#dashboard)
*   [Archive Management](#archive-management)
    *   [Browsing Units & Documents](#browsing-units--documents)
    *   [Searching](#searching)
    *   [Viewing Details](#viewing-details)
    *   [Creating Units/Documents (Admin/Employee)](#creating-unitsdocuments-adminemployee)
    *   [Editing Units/Documents (Admin/Employee)](#editing-unitsdocuments-adminemployee)
    *   [Disabling Items (Admin/Employee)](#disabling-items-adminemployee)
    *   [Batch Tagging (Admin/Employee)](#batch-tagging-adminemployee)
*   [Signatures (Admin/Employee)](#signatures-adminemployee)
    *   [Components](#components)
    *   [Elements](#elements)
*   [Tags (Admin/Employee)](#tags-adminemployee)
*   [Notes (Admin/Employee)](#notes-adminemployee)
    *   [Viewing & Searching](#viewing--searching)
    *   [Creating & Editing](#creating--editing)
    *   [Deleting](#deleting)
    *   [Sharing](#sharing)
*   [User Profile](#user-profile)
    *   [Changing Password](#changing-password)
    *   [Changing Language](#changing-language)
    *   [Logging Out](#logging-out)

---

# (Polish / Polski)

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

## Logging In & Registration

*   **Login:** Access the application via the URL provided by your administrator (e.g., `http://localhost:8080`). Enter your username and password on the login screen.
*   **Registration:** If registration is enabled, click the "Register" link. Provide a username and a strong password (minimum 8 characters, including uppercase, lowercase, and a number). Confirm your password. After successful registration, you will typically have no assigned role ('null') and cannot log in until an Administrator assigns you a role ('employee' or 'user').

## (Polish / Polski) Logowanie i Rejestracja

*   **Logowanie:** Wejdź do aplikacji pod adresem URL podanym przez administratora (np. `http://localhost:8080`). Wprowadź swoją nazwę użytkownika i hasło na ekranie logowania.
*   **Rejestracja:** Jeśli rejestracja jest włączona, kliknij link "Zarejestruj się". Podaj nazwę użytkownika i silne hasło (minimum 8 znaków, w tym wielka litera, mała litera i cyfra). Potwierdź hasło. Po pomyślnej rejestracji zazwyczaj nie będziesz miał przypisanej żadnej roli ('null') i nie będziesz mógł się zalogować, dopóki Administrator nie przypisze Ci roli ('pracownik' lub 'użytkownik').

---

## Interface Overview

### Header

*   **Page Title & Icon:** Displays the name and relevant icon for the current section.
*   **User Menu:** Click the user icon (top right) to:
    *   See your username and role.
    *   Change your interface language.
    *   Change your password.
    *   Log out.

### Sidebar

*   Provides navigation to the main sections of the application based on your role:
    *   **Dashboard:** Overview page.
    *   **Archive:** Browse and search archival documents and units. ('User' role sees 'Search Archive').
    *   **Signatures (Admin/Employee):** Manage signature components and elements.
    *   **Tags (Admin/Employee):** Manage global tags.
    *   **Notes (Admin/Employee):** Access personal and shared notes.
    *   **Admin (Admin only):** Access administrative functions.

### Main Content Area

*   Displays the content for the selected section (e.g., list of documents, forms, settings).

## (Polish / Polski) Przegląd Interfejsu

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

## Dashboard

The default page after logging in. Provides a welcome message. 'User' role users are prompted to use the sidebar to search the archive, while other roles are prompted to select a section.

## (Polish / Polski) Panel Główny

Domyślna strona po zalogowaniu. Wyświetla wiadomość powitalną. Użytkownicy z rolą 'Użytkownik' są zachęcani do użycia paska bocznego do przeszukiwania archiwum, podczas gdy inne role są proszone o wybranie sekcji.

---

## Archive Management

Accessible via the "Archive" / "Search Archive" link in the sidebar.

### Browsing Units & Documents

*   The main archive view lists top-level units and documents.
*   Items marked with a **Folder** icon are **Units**. Clicking a Unit navigates into it, showing its child documents and sub-units.
*   Items marked with a **File** icon are **Documents**. Clicking a Document opens a preview dialog.
*   Use the **Back Arrow** button when inside a unit to return to the parent level or archive root.

### (Polish / Polski) Przeglądanie Jednostek i Dokumentów

*   Dostępne przez link "Archiwum" / "Szukaj w Archiwum" na pasku bocznym.
*   Główny widok archiwum listuje jednostki i dokumenty najwyższego poziomu.
*   Pozycje oznaczone ikoną **Folderu** to **Jednostki**. Kliknięcie Jednostki przenosi do jej wnętrza, pokazując zawarte w niej dokumenty i podjednostki.
*   Pozycje oznaczone ikoną **Pliku** to **Dokumenty**. Kliknięcie Dokumentu otwiera okno podglądu.
*   Użyj przycisku **Strzałki Wstecz**, będąc wewnątrz jednostki, aby wrócić do poziomu nadrzędnego lub głównego widoku archiwum.

### Searching

*   Use the **Search Bar** at the top of the Archive page to find items.
*   Click **Add Filter** to add search criteria.
*   Select a **Field** (e.g., Title, Creator, Tags, Descriptive Signature).
*   Choose a **Condition** (e.g., Contains, Equals, Has Any Of, Starts With Path).
*   Enter a **Value**.
    *   For text fields (`Contains`): Enter text fragments.
    *   For `Tags`: Select one or more tags from the dropdown. `Has Any Of` finds items with *at least one* of the selected tags.
    *   For `Descriptive Signature`: Use the **Signature Path Picker** (`Equals`, `Starts With`, `Contains Sequence`) to build the signature path you want to search for.
    *   For `boolean` fields (Is Digitized, Is Active): Select `True` or `False`.
*   You can check the **NOT** box to negate a condition (e.g., find items *not* matching).
*   Add multiple criteria to narrow down results (they are combined with AND).
*   Click **Search** to apply filters. Click **Reset** to clear filters.
*   **'User' role:** Search results are automatically filtered to show only documents matching tags assigned to the user by an administrator.

### (Polish / Polski) Wyszukiwanie

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

### Viewing Details

*   Clicking a **Document** row in the list opens a **Preview Dialog**.
*   The dialog shows:
    *   Basic info (Title, Creator, Date, Parent Unit link).
    *   Assigned Tags and Signatures (Topographic and resolved Descriptive).
    *   Created By/Updated By information with timestamps.
    *   Content Description, Physical Details, Access info, Remarks, etc.
    *   A link to the digitized version if available.
*   Admins/Employees see **Edit** and **Disable** buttons in the dialog footer.

### (Polish / Polski) Wyświetlanie Szczegółów

*   Kliknięcie wiersza **Dokumentu** na liście otwiera **Okno Podglądu**.
*   Okno dialogowe pokazuje:
    *   Podstawowe informacje (Tytuł, Twórca, Data, link do Jednostki Nadrzędnej).
    *   Przypisane Tagi i Sygnatury (Topograficzną i rozwiązane Opisowe).
    *   Informacje o tym, kto utworzył/zaktualizował pozycję wraz ze znacznikami czasu.
    *   Opis Treści, Szczegóły Fizyczne, informacje o Dostępie, Uwagi itp.
    *   Link do wersji cyfrowej, jeśli jest dostępna.
*   Administratorzy/Pracownicy widzą przyciski **Edytuj** i **Dezaktywuj** w stopce okna dialogowego.

### Creating Units/Documents (Admin/Employee)

*   Click the **Create Item** button (or **Create Document** when inside a unit).
*   A dialog appears with a form:
    *   **Type:** Select 'Unit' or 'Document'. Cannot be changed after creation. If inside a unit, this defaults to 'Document' and cannot be changed.
    *   **Parent Unit:** (Only for Documents, when creating at root) Select the unit this document belongs to using the dropdown search.
    *   **Title, Creator, Creation Date:** Required fields.
    *   **Signatures & Tags:** Use the dedicated pickers to assign Topographic Signature (text), Descriptive Signatures (paths), and Tags.
    *   **Other Fields:** Fill in optional metadata (Physical Description, Content, Access, Digitization, etc.).
    *   Click **Create Item**.

### (Polish / Polski) Tworzenie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij przycisk **Utwórz Pozycję** (lub **Utwórz Dokument**, gdy jesteś wewnątrz jednostki).
*   Pojawi się okno dialogowe z formularzem:
    *   **Typ:** Wybierz 'Jednostka' lub 'Dokument'. Nie można zmienić po utworzeniu. Jeśli jesteś wewnątrz jednostki, domyślnie jest to 'Dokument' i nie można tego zmienić.
    *   **Jednostka Nadrzędna:** (Tylko dla Dokumentów, podczas tworzenia w głównym widoku) Wybierz jednostkę, do której należy ten dokument, używając wyszukiwanej listy rozwijanej.
    *   **Tytuł, Twórca, Data Utworzenia:** Pola wymagane.
    *   **Sygnatury i Tagi:** Użyj dedykowanych selektorów, aby przypisać Sygnaturę Topograficzną (tekst), Sygnatury Opisowe (ścieżki) i Tagi.
    *   **Inne Pola:** Wypełnij opcjonalne metadane (Opis Fizyczny, Treść, Dostęp, Digitalizacja itp.).
    *   Kliknij **Utwórz Pozycję**.

### Editing Units/Documents (Admin/Employee)

*   Click the **Edit** (pencil) icon on an item row or in the preview dialog.
*   The form dialog opens, pre-filled with the item's data.
*   Modify the fields as needed. The 'Type' cannot be changed.
*   Click **Update Item**.

### (Polish / Polski) Edytowanie Jednostek/Dokumentów (Admin/Pracownik)

*   Kliknij ikonę **Edytuj** (ołówek) w wierszu pozycji lub w oknie podglądu.
*   Otworzy się okno dialogowe formularza, wstępnie wypełnione danymi pozycji.
*   Zmodyfikuj pola według potrzeb. 'Typu' nie można zmienić.
*   Kliknij **Aktualizuj Pozycję**.

### Disabling Items (Admin/Employee)

*   Click the **Disable** (trash can) icon on an item row or in the preview dialog.
*   Confirm the action in the prompt.
*   The item will be marked as inactive and hidden from regular views and searches (unless an Admin specifically includes inactive items in their search). Disabled items are not permanently deleted.

### (Polish / Polski) Dezaktywacja Pozycji (Admin/Pracownik)

*   Kliknij ikonę **Dezaktywuj** (kosz) w wierszu pozycji lub w oknie podglądu.
*   Potwierdź akcję w monicie.
*   Pozycja zostanie oznaczona jako nieaktywna i ukryta w regularnych widokach i wyszukiwaniach (chyba że Administrator specjalnie uwzględni nieaktywne pozycje w swoim wyszukiwaniu). Dezaktywowane pozycje nie są trwale usuwane.

### Batch Tagging (Admin/Employee)

*   Use the search bar to filter the items you want to tag.
*   Click **Add Tags** or **Remove Tags** near the search bar.
*   A dialog appears showing how many items will be affected based on the current search filters.
    *   **Warning:** If no search filters are active, the action will apply to *all* items in the archive.
*   Select the tags you want to add or remove using the Tag Selector.
*   Click **Add Tags ({count})** or **Remove Tags ({count})** to confirm.

### (Polish / Polski) Wsadowe Tagowanie (Admin/Pracownik)

*   Użyj paska wyszukiwania, aby przefiltrować pozycje, które chcesz otagować.
*   Kliknij **Dodaj Tagi** lub **Usuń Tagi** obok paska wyszukiwania.
*   Pojawi się okno dialogowe pokazujące, na ile pozycji wpłynie akcja w oparciu o bieżące filtry wyszukiwania.
    *   **Ostrzeżenie:** Jeśli żadne filtry wyszukiwania nie są aktywne, akcja zostanie zastosowana do *wszystkich* pozycji w archiwum.
*   Wybierz tagi, które chcesz dodać lub usunąć, używając Selektora Tagów.
*   Kliknij **Dodaj Tagi ({liczba})** lub **Usuń Tagi ({liczba})**, aby potwierdzić.

---

## Signatures (Admin/Employee)

Manage the building blocks for descriptive signatures.

### Components

*   Navigate to **Signatures**.
*   View existing components, their description, index type, and element count.
*   **Create:** Click **New Component**. Provide a unique Name, optional Description, and choose the Index Formatting type (how element indices within this component will be displayed - Decimal, Roman, etc.).
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, or Index Type.
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. **Warning:** This permanently deletes the component AND all its elements.
*   **Re-index (Admin only):** Click the **Re-index** (list restart) icon. This recalculates and updates the `index` field for all elements within that component based on their alphabetical order and the component's index type. Useful after adding/deleting/renaming multiple elements.
*   **Open:** Click a component row to navigate to its Elements page.

### (Polish / Polski) Komponenty

*   Przejdź do sekcji **Sygnatury**.
*   Wyświetl istniejące komponenty, ich opis, typ indeksowania i liczbę elementów.
*   **Tworzenie:** Kliknij **Nowy Komponent**. Podaj unikalną Nazwę, opcjonalny Opis i wybierz Typ Formatowania Indeksu (jak będą wyświetlane indeksy elementów w tym komponencie - Dziesiętny, Rzymski itp.).
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis lub Typ Indeksu.
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). **Ostrzeżenie:** To trwale usuwa komponent ORAZ wszystkie jego elementy.
*   **Reindeksacja (Tylko Admin):** Kliknij ikonę **Reindeksuj** (lista restart). Przelicza i aktualizuje pole `index` dla wszystkich elementów w tym komponencie w oparciu o ich kolejność alfabetyczną i typ indeksu komponentu. Przydatne po dodaniu/usunięciu/zmianie nazwy wielu elementów.
*   **Otwórz:** Kliknij wiersz komponentu, aby przejść do strony jego Elementów.

### Elements

*   Access this page by clicking a component row on the Signatures page.
*   View elements belonging to the selected parent component.
*   **Create:** Click **New Element**. Provide a Name, optional Description. You can optionally provide a specific Index override (text, e.g., "1a", "V"), otherwise it will be auto-generated based on the component's counter and index type. Use the **Parent Elements** selector to link this element as a child of other elements (creating hierarchical relationships).
*   **Edit:** Click the **Edit** (pencil) icon. Modify Name, Description, Index override, or Parent Elements.
*   **Delete:** Click the **Delete** (trash can) icon.
*   **Search:** Use the search bar to filter elements within the current component by Name, Description, Index, or whether they have parents.

### (Polish / Polski) Elementy

*   Przejdź na tę stronę, klikając wiersz komponentu na stronie Sygnatury.
*   Wyświetl elementy należące do wybranego komponentu nadrzędnego.
*   **Tworzenie:** Kliknij **Nowy Element**. Podaj Nazwę, opcjonalny Opis. Możesz opcjonalnie podać konkretny Indeks (tekst, np. "1a", "V"), w przeciwnym razie zostanie on wygenerowany automatycznie na podstawie licznika komponentu i typu indeksu. Użyj selektora **Elementy Nadrzędne**, aby połączyć ten element jako dziecko innych elementów (tworząc relacje hierarchiczne).
*   **Edycja:** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę, Opis, Indeks lub Elementy Nadrzędne.
*   **Usuwanie:** Kliknij ikonę **Usuń** (kosz).
*   **Wyszukiwanie:** Użyj paska wyszukiwania, aby filtrować elementy w bieżącym komponencie według Nazwy, Opisu, Indeksu lub tego, czy mają elementy nadrzędne.

---

## Tags (Admin/Employee)

Manage global tags used for organizing documents and notes.

*   Navigate to **Tags**.
*   View all existing tags.
*   **Create:** Click **Create Tag**. Enter a Name and optional Description.
*   **Edit (Admin only):** Click the **Edit** (pencil) icon. Modify Name or Description.
*   **Delete (Admin only):** Click the **Delete** (trash can) icon. Confirm deletion. This removes the tag globally and from all associated items.

## (Polish / Polski) Tagi (Admin/Pracownik)

Zarządzaj globalnymi tagami używanymi do organizacji dokumentów i notatek.

*   Przejdź do sekcji **Tagi**.
*   Wyświetl wszystkie istniejące tagi.
*   **Tworzenie:** Kliknij **Utwórz Tag**. Wprowadź Nazwę i opcjonalny Opis.
*   **Edycja (Tylko Admin):** Kliknij ikonę **Edytuj** (ołówek). Zmodyfikuj Nazwę lub Opis.
*   **Usuwanie (Tylko Admin):** Kliknij ikonę **Usuń** (kosz). Potwierdź usunięcie. Spowoduje to globalne usunięcie taga i usunięcie go ze wszystkich powiązanych elementów.

---

## Notes (Admin/Employee)

Create and manage personal or shared notes.

### Viewing & Searching

*   Navigate to **Notes**.
*   The list displays notes you created **OR** notes created by others that are marked as **Shared**.
*   Use the **Search Bar** to filter notes by Title, Content, Shared status, Tags, or Author (Admin only).
*   Click a note title or the **Preview** (eye) icon to view its full content in a dialog.

### (Polish / Polski) Przeglądanie i Wyszukiwanie

*   Przejdź do sekcji **Notatki**.
*   Lista wyświetla notatki utworzone przez Ciebie **LUB** notatki utworzone przez innych, które są oznaczone jako **Udostępnione**.
*   Użyj **Paska Wyszukiwania**, aby filtrować notatki według Tytułu, Treści, statusu Udostępnienia, Tagów lub Autora (Tylko Admin).
*   Kliknij tytuł notatki lub ikonę **Podgląd** (oko), aby zobaczyć pełną treść w oknie dialogowym.

### Creating & Editing

*   Click **Create Note**.
*   Enter a Title (required) and Content.
*   Use the **Tag Selector** to assign relevant tags.
*   Optionally, check **Share this note publicly** to make it visible to other Admins/Employees in the main list. (Only owners or Admins can change this later).
*   Click **Create Note**.
*   To edit, click the **Edit** (pencil) icon on a note row. Modify details and click **Edit Note**.

### (Polish / Polski) Tworzenie i Edytowanie

*   Kliknij **Utwórz Notatkę**.
*   Wprowadź Tytuł (wymagany) i Treść.
*   Użyj **Selektora Tagów**, aby przypisać odpowiednie tagi.
*   Opcjonalnie zaznacz **Udostępnij tę notatkę publicznie**, aby była widoczna dla innych Administratorów/Pracowników na głównej liście. (Tylko właściciele lub Administratorzy mogą to później zmienić).
*   Kliknij **Utwórz Notatkę**.
*   Aby edytować, kliknij ikonę **Edytuj** (ołówek) w wierszu notatki. Zmodyfikuj szczegóły i kliknij **Edytuj Notatkę**.

### Deleting

*   You can delete notes you own.
*   Admins can delete any note.
*   Click the **Delete** (trash can) icon and confirm.

### (Polish / Polski) Usuwanie

*   Możesz usuwać notatki, których jesteś właścicielem.
*   Administratorzy mogą usuwać dowolne notatki.
*   Kliknij ikonę **Usuń** (kosz) i potwierdź.

### Sharing

*   When creating or editing a note, check the "Share this note publicly" checkbox.
*   Shared notes are visible in the main list for all Admins and Employees.
*   Only the note's owner or an Administrator can change the shared status.

### (Polish / Polski) Udostępnianie

*   Podczas tworzenia lub edytowania notatki zaznacz pole "Udostępnij tę notatkę publicznie".
*   Udostępnione notatki są widoczne na głównej liście dla wszystkich Administratorów i Pracowników.
*   Tylko właściciel notatki lub Administrator może zmienić status udostępniania.

---

## User Profile

Accessible via the user icon dropdown in the header.

### Changing Password

*   Select "Change Password" from the user menu.
*   Enter your **Current Password**.
*   Enter your **New Password** and confirm it. Ensure it meets complexity requirements.
*   Click **Change Password**.

### (Polish / Polski) Zmiana Hasła

*   Wybierz "Zmień hasło" z menu użytkownika.
*   Wprowadź swoje **Obecne Hasło**.
*   Wprowadź swoje **Nowe Hasło** i potwierdź je. Upewnij się, że spełnia wymagania złożoności.
*   Kliknij **Zmień hasło**.

### Changing Language

*   Click the user icon dropdown.
*   Hover over or click the "Language" submenu.
*   Select your preferred language (e.g., English, Polski).
*   The interface will update immediately, and your preference will be saved for future sessions.

### (Polish / Polski) Zmiana Języka

*   Kliknij menu rozwijane ikony użytkownika.
*   Najedź kursorem lub kliknij podmenu "Język".
*   Wybierz preferowany język (np. English, Polski).
*   Interfejs zostanie natychmiast zaktualizowany, a Twoje preferencje zostaną zapisane dla przyszłych sesji.

### Logging Out

*   Select "Logout" from the user menu.
*   Your session will be terminated.

### (Polish / Polski) Wylogowywanie

*   Wybierz "Wyloguj" z menu użytkownika.
*   Twoja sesja zostanie zakończona.