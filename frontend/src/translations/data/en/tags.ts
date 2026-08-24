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
  tagsPermissionErrorEdit: 'You do not have permission to manage tags.',
  tagsPermissionErrorDelete: 'You do not have permission to delete tags.',
  // New Tags Keys
  tagLoadFailedError: 'Failed to load tags',
  tagSaveSuccess: 'Tag {action} successfully.',
  tagsLoadErrorPlaceholder: 'Could not load tags. Please try again later.',
  tagSavedCreated: 'Tag created successfully.',
  tagSavedUpdated: 'Tag updated successfully.',
  tagsHelpTitle: 'About Tags',
  tagsHelpIntro: 'Tags are labels you apply to documents and notes to organize and filter them. Tags are global — defined once and reused everywhere.',
  tagsHelpAccess: 'Tags also control access for the restricted user role: an admin assigns specific tags to a user, and that user can only view documents carrying those tags.',
  tagsHelpPermissions: 'Admins and employees can create, edit, and delete tags. Deleting a tag removes it from all documents and notes.',
};