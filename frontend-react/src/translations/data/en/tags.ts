// frontend-react/src/translations/data/en/tags.ts
import type { TagsTranslationSet } from '../../models/tags';

export const tagsTranslationsEN: TagsTranslationSet = {
  tagsTitle: 'Tags', // General title / Plural
  tagsDescription: 'Organize your notes and documents using tags.',
  tagsCreateTitle: 'Create Tag',
  tagsEditTitle: 'Edit Tag',
  tagsNoTagsFound: 'No tags found.',
  tagsClickCreateHint: 'Click "Create Tag" to add one.',
  tagLabelSingular: 'Tag', // Singular form
  tagsEditDialogDescription: 'Edit the tag "{tagName}".',
  tagsCreateDialogDescription: 'Create a new tag to organize content.',
  tagsConfirmDeleteMessage: 'Are you sure you want to delete the tag "{tagName}"? This will remove it from all associated items.',
  tagsDeleteSuccess: 'Tag "{tagName}" deleted successfully.',
  tagsDeleteFailed: 'Failed to delete tag: {message}',
  tagsSaveFailed: 'Failed to save tag: {message}',
  tagsPermissionErrorEdit: 'Only administrators can edit tags.',
  tagsPermissionErrorDelete: 'Only administrators can delete tags.',
};