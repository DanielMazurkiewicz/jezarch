// frontend-react/src/translations/data/en/notes.ts
import type { NotesTranslationSet } from '../../models/notes';

export const notesTranslationsEN: NotesTranslationSet = {
  notesTitle: 'Notes',
  notesDescription: 'Create, view, and manage personal & shared notes.',
  notesCreateTitle: 'Create Note',
  notesEditTitle: 'Edit Note',
  notesNoNotesFound: 'No notes found.',
  notesClickCreateHint: 'Click "Create Note" to add one.',
  notesContentColumn: 'Content',
  notesAuthorColumn: 'Author',
  notesModifiedColumn: 'Modified',
  notesSharedColumn: 'Shared',
  notesSharePubliclyLabel: 'Share this note publicly',
  notesContentLabel: 'Content',
  notesShareTooltip: "Only the owner or an admin can change the shared status",
  notesPreviewTitleTooltip: 'Click to preview "{title}"', // Added Key
  notesNoTagsPlaceholder: 'No tags', // Added Key
  notesLoadErrorPlaceholder: 'Could not load notes. Please try again later.', // Added Key
  notesTitleSingular: 'Note', // Added Key
  notesFetchError: 'Failed to fetch notes', // Added Key
  notesLoadDetailsError: 'Failed to load note details', // Added Key
  notesPermissionErrorDelete: 'You can only delete your own notes, unless you are an admin.',
  notesDeleteConfirm: 'Are you sure you want to delete this note?',
  notesDeleteSuccess: 'Note deleted successfully.',
  notesDeleteFailed: 'Failed to delete note: {message}',
  notesSaveSuccess: 'Note {action} successfully.', // action: created/updated
  notesSaveFailed: 'Failed to save note: {message}',
  notesPreviewTitle: 'Note Preview',
  notesPreviewBy: 'By',
  notesPreviewOn: 'on',
  notesNoContentPlaceholder: 'No content.', // Added Key
};