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
  tagsPermissionErrorEdit: 'Tylko administratorzy mogą edytować tagi.',
  tagsPermissionErrorDelete: 'Tylko administratorzy mogą usuwać tagi.',
};