// frontend-react/src/translations/models/notes.ts
import { TranslationSet } from "../models";

// Ensure all keys used in components/notes/* are listed here
export type NotesTranslationKey =
  | 'notesTitle'
  | 'notesDescription'
  | 'notesCreateTitle'
  | 'notesEditTitle'
  | 'notesNoNotesFound' // Used in NotesPage
  | 'notesClickCreateHint' // Used in NotesPage
  | 'notesContentColumn' // Used in NotesPage (SearchBar)
  | 'notesAuthorColumn' // Used in NoteList
  | 'notesModifiedColumn' // Used in NoteList
  | 'notesSharedColumn' // Used in NoteList and NotesPage (SearchBar)
  | 'notesSharePubliclyLabel' // Used in NoteEditor
  | 'notesContentLabel' // Used in NoteEditor
  | 'notesShareTooltip' // Used in NoteEditor
  | 'notesPreviewTitleTooltip'
  | 'notesNoTagsPlaceholder'
  | 'notesLoadErrorPlaceholder'
  | 'notesTitleSingular'
  | 'notesFetchError'
  | 'notesLoadDetailsError'
  | 'notesPermissionErrorDelete'
  | 'notesDeleteConfirm'
  | 'notesDeleteSuccess'
  | 'notesDeleteFailed'
  | 'notesSaveSuccess'
  | 'notesSaveFailed'
  | 'notesPreviewTitle'
  | 'notesPreviewBy'
  | 'notesPreviewOn'
  | 'notesNoContentPlaceholder' // Added missing key
  | 'notesSharedBadge' // Added missing key
  | 'notesPrivateBadge' // Added missing key
  ;

export type NotesTranslationSet = TranslationSet<NotesTranslationKey>;