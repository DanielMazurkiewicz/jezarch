// frontend-react/src/translations/data/pl/tags.ts
import type { TagsTranslationSet } from '../../models/tags';

export const tagsTranslationsPL: TagsTranslationSet = {
  tagsTitle: 'Tagi', // General title / Plural
  tagsDescription: 'Organizuj swoje notatki i dokumenty za pomocą tagów.',
  tagsCreateTitle: 'Utwórz Tag',
  tagsEditTitle: 'Edytuj Tag',
  tagsNoTagsFound: 'Nie znaleziono tagów.',
  tagsClickCreateHint: 'Kliknij "Utwórz Tag", aby dodać nowy.',
  tagLabelSingular: 'Tag', // Singular form
  tagsEditDialogDescription: 'Edytuj tag "{tagName}".',
  tagsCreateDialogDescription: 'Utwórz nowy tag do organizacji treści.',
  tagsConfirmDeleteMessage: 'Czy na pewno chcesz usunąć tag "{tagName}"? Zostanie on usunięty ze wszystkich powiązanych elementów.',
  tagsDeleteSuccess: 'Tag "{tagName}" usunięty pomyślnie.',
  tagsDeleteFailed: 'Nie udało się usunąć taga: {message}',
  tagsSaveFailed: 'Nie udało się zapisać taga: {message}',
  tagsPermissionErrorEdit: 'Nie masz uprawnień do zarządzania tagami.',
  tagsPermissionErrorDelete: 'Nie masz uprawnień do usuwania tagów.',
  // New Tags PL Keys
  tagLoadFailedError: 'Nie udało się załadować tagów',
  tagSaveSuccess: 'Tag {action} pomyślnie.', // action: utworzono/zaktualizowano
  tagsLoadErrorPlaceholder: 'Nie udało się załadować tagów. Spróbuj ponownie później.',
  tagSavedCreated: 'Tag został pomyślnie utworzony.',
  tagSavedUpdated: 'Tag został pomyślnie zaktualizowany.',
  tagsHelpTitle: 'O tagach',
  tagsHelpIntro: 'Tagi to etykiety nadawane dokumentom i notatom w celu ich organizowania i filtrowania. Tagi są globalne — zdefiniowane raz i wielokrotnie używane.',
  tagsHelpAccess: 'Tagi kontrolują również dostęp dla ograniczonej roli użytkownika: administrator przypisuje użytkownikowi określone tagi, a ten użytkownik widzi tylko dokumenty oznaczone tymi tagami.',
  tagsHelpPermissions: 'Administratorzy i pracownicy mogą tworzyć, edytować i usuwać tagi. Usunięcie tagu usuwa go ze wszystkich dokumentów i notatek.',
};