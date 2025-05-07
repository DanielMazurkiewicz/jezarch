// frontend-react/src/translations/data/pl/notes.ts
import type { NotesTranslationSet } from '../../models/notes';

export const notesTranslationsPL: NotesTranslationSet = {
  notesTitle: 'Notatki',
  notesDescription: 'Twórz, przeglądaj i zarządzaj osobistymi oraz udostępnionymi notatkami.',
  notesCreateTitle: 'Utwórz Notatkę',
  notesEditTitle: 'Edytuj Notatkę',
  notesNoNotesFound: 'Nie znaleziono notatek.',
  notesClickCreateHint: 'Kliknij "Utwórz Notatkę", aby dodać nową.',
  notesContentColumn: 'Treść',
  notesAuthorColumn: 'Autor',
  notesModifiedColumn: 'Zmodyfikowano',
  notesSharedColumn: 'Udostępniona',
  notesSharePubliclyLabel: 'Udostępnij tę notatkę publicznie',
  notesContentLabel: 'Treść',
  notesShareTooltip: "Tylko właściciel lub administrator może zmienić status udostępniania",
  notesPreviewTitleTooltip: 'Kliknij, aby zobaczyć podgląd "{title}"', // Added Key
  notesNoTagsPlaceholder: 'Brak tagów', // Added Key
  notesLoadErrorPlaceholder: 'Nie udało się załadować notatek. Spróbuj ponownie później.', // Added Key
  // --- UPDATED: Changed case ---
  notesTitleSingular: 'Notatkę', // e.g., "Utwórz Notatkę"
  // -----------------------------
  notesFetchError: 'Nie udało się pobrać notatek', // Added Key
  notesLoadDetailsError: 'Nie udało się załadować szczegółów notatki', // Added Key
  notesPermissionErrorDelete: 'Możesz usuwać tylko swoje notatki, chyba że jesteś administratorem.',
  notesDeleteConfirm: 'Czy na pewno chcesz usunąć tę notatkę?',
  notesDeleteSuccess: 'Notatka usunięta pomyślnie.',
  notesDeleteFailed: 'Nie udało się usunąć notatki: {message}',
  notesSaveSuccess: 'Notatka {action} pomyślnie.', // action: utworzona/zaktualizowana
  notesSaveFailed: 'Nie udało się zapisać notatki: {message}',
  notesPreviewTitle: 'Podgląd Notatki',
  notesPreviewBy: 'Autor:',
  notesPreviewOn: 'dnia',
  notesNoContentPlaceholder: 'Brak treści.', // Added Key
  notesSharedBadge: 'Udostępniona', // Added Key
  notesPrivateBadge: 'Prywatna', // Added Key
};