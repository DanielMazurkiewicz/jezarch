// frontend-react/src/translations/models/tags.ts
import { TranslationSet } from "../models";

// Define keys specific to the Tags feature
export type TagsTranslationKey =
  | 'tagsTitle' // Can be used for plural or general title
  | 'tagsDescription'
  | 'tagsCreateTitle'
  | 'tagsEditTitle'
  | 'tagsNoTagsFound'
  | 'tagsClickCreateHint'
  | 'tagLabelSingular' // New key for singular form
  | 'tagsEditDialogDescription' // e.g., Edit the tag "{tagName}".
  | 'tagsCreateDialogDescription' // e.g., Create a new tag to organize content.
  | 'tagsConfirmDeleteMessage' // e.g., Are you sure you want to delete the tag "{tagName}"? This will remove it from all associated items.
  | 'tagsDeleteSuccess' // e.g., Tag "{tagName}" deleted successfully.
  | 'tagsDeleteFailed' // e.g., Failed to delete tag: {message}
  | 'tagsSaveFailed' // e.g., Failed to save tag: {message}
  | 'tagsPermissionErrorEdit' // e.g., Only administrators can edit tags.
  | 'tagsPermissionErrorDelete' // e.g., Only administrators can delete tags.
  ;

export type TagsTranslationSet = TranslationSet<TagsTranslationKey>;