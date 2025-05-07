// frontend-react/src/translations/models/archive.ts
import { TranslationSet } from "../models";

export type ArchiveTranslationKey =
  | 'archiveTitle' // Already in common, override if needed
  | 'archiveDescription'
  | 'archiveCreateDocumentButton'
  | 'archiveCreateUnitButton' // Might be needed if creation logic changes
  | 'archiveNoItemsInUnit' // e.g., "No items found in unit '{unitTitle}'."
  | 'archiveNoItemsForUserTags' // e.g., "No documents found matching your assigned tags."
  | 'archiveIsEmpty' // Used in ArchivePage
  | 'archiveItemLabel' // Used in ArchivePage dialog title
  | 'archiveUnitLabel'
  | 'archiveDocumentLabel'
  | 'backToArchiveButton'
  | 'archiveCreatorLabel'
  | 'archiveCreationDateLabel'
  | 'archiveTopoSigLabel'
  | 'archiveDescSigLabel'
  ;

export type ArchiveTranslationSet = TranslationSet<ArchiveTranslationKey>;