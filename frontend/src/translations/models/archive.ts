// frontend-react/src/translations/models/archive.ts
import { TranslationSet } from "../models";

export type ArchiveTranslationKey =
  | 'archiveTitle'
  | 'archiveDescription'
  | 'archiveCreateDocumentButton'
  | 'archiveCreateUnitButton'
  | 'archiveNoItemsInUnit' // e.g., "No items found in unit '{unitTitle}'."
  | 'archiveNoItemsForUserTags' // e.g., "No documents found matching your assigned tags."
  | 'archiveIsEmpty'
  | 'archiveItemLabel'
  | 'archiveUnitLabel'
  | 'archiveDocumentLabel'
  | 'backToArchiveButton'
  | 'archiveCreatorLabel'
  | 'archiveCreationDateLabel'
  | 'archiveTopoSigLabel'
  | 'archiveDescSigLabel'
  | 'archiveEditItemDialogTitle' // e.g., "Edit {itemType}"
  | 'archiveCreateItemDialogTitle' // e.g., "Create {itemType}"
  | 'archiveCreateInUnitDialogTitle' // e.g., "Create Document in Unit "{unitTitle}""
  | 'archiveDisableConfirm' // e.g., "Are you sure you want to disable this {itemType}?"
  | 'archiveDisableSuccess'
  | 'archiveDisableFailed' // e.g., "Failed to disable item: {message}"
  | 'archiveSaveSuccess' // e.g., "Item {action} successfully."
  | 'archiveSaveFailed' // e.g., "Failed to save item: {message}"
  | 'archiveDetailsLoadFailed' // e.g., "Failed to load document details: {message}"
  | 'archiveFoundItems' // e.g., "Found {count} item(s)."
  | 'archiveBatchActionWarning' // e.g., "Batch actions will affect {count} items matching current filters."
  | 'archiveBatchActionNoFilterWarning' // e.g., "Batch actions will affect all {count} items in the archive (no filters applied)."
  | 'archiveBatchActionLoading'
  | 'archiveBatchTagsAddTitle'
  | 'archiveBatchTagsRemoveTitle'
  | 'archiveBatchTagsDescription' // e.g., "Select tags to {action} for all {count} items..."
  | 'archiveBatchTagsWarningTitle'
  | 'archiveBatchTagsWarningText' // e.g., "This action affects {count} items..."
  | 'archiveBatchTagsPlaceholder'
  | 'archiveBatchTagsConfirmAdd' // e.g., "Add Tags ({count})"
  | 'archiveBatchTagsConfirmRemove' // e.g., "Remove Tags ({count})"
  | 'archiveBatchTagsNoTagsWarning'
  | 'archiveBatchTagsSuccess' // e.g., "{action} tags for {count} items."
  | 'archiveBatchTagsFailed' // e.g., "Batch tagging failed: {message}"
  | 'archiveDocumentPreviewTitle' // e.g., "Preview Document "{title}""
  | 'archiveUnitOpenTitle' // e.g., "Open Unit "{title}""
  | 'archivePermissionErrorEdit'
  | 'archivePermissionErrorCreate'
  | 'archivePermissionErrorDisable'
  | 'archivePermissionErrorBatchTag'
  | 'archivePreviewBasicInfoLabel'
  | 'archivePreviewCreatorLabel'
  | 'archivePreviewDateLabel'
  | 'archivePreviewParentUnitLabel'
  | 'archivePreviewCreatedByLabel' // Replaced Owner
  | 'archivePreviewUpdatedByLabel' // Added
  | 'archivePreviewTagsLabel'
  | 'archivePreviewTopoSigLabel'
  | 'archivePreviewDescSigLabel'
  | 'archivePreviewContentDescriptionLabel'
  | 'archivePreviewPhysicalDetailsLabel'
  | 'archivePreviewPagesLabel'
  | 'archivePreviewTypeLabel'
  | 'archivePreviewDimensionsLabel'
  | 'archivePreviewBindingLabel'
  | 'archivePreviewConditionLabel'
  | 'archivePreviewLanguageLabel'
  | 'archivePreviewOtherDetailsLabel'
  | 'archivePreviewRemarksLabel'
  | 'archivePreviewAccessLabel'
  | 'archivePreviewAdditionalInfoLabel'
  | 'archivePreviewRelatedDocsLabel'
  | 'archivePreviewDigitizedLabel'
  | 'archivePreviewDigitizedYesLink'
  | 'archivePreviewDigitizedYes'
  | 'archivePreviewDigitizedNo'
  | 'archivePreviewEmptyContent'
  | 'archiveFormBasicInfoTitle'
  | 'archiveFormPhysicalDescTitle'
  | 'archiveFormContentContextTitle'
  | 'archiveFormAccessDigitizationTitle'
  | 'archiveFormIndexingTitle'
  | 'archiveFormTypeLabel'
  | 'archiveFormSelectTypePlaceholder'
  | 'archiveFormDocumentOption'
  | 'archiveFormUnitOption'
  | 'archiveFormTypeDisabledHint'
  | 'archiveFormParentUnitLabel'
  | 'archiveFormParentUnitContextHint'
  | 'archiveFormTitleLabel'
  | 'archiveFormCreatorLabel'
  | 'archiveFormCreationDateLabel'
  | 'archiveFormCreationDatePlaceholder'
  | 'archiveFormPagesLabel'
  | 'archiveFormDocTypeLabel'
  | 'archiveFormDocTypePlaceholder'
  | 'archiveFormDimensionsLabel'
  | 'archiveFormDimensionsPlaceholder'
  | 'archiveFormBindingLabel'
  | 'archiveFormBindingPlaceholder'
  | 'archiveFormConditionLabel'
  | 'archiveFormConditionPlaceholder'
  | 'archiveFormLanguageLabel'
  | 'archiveFormLanguagePlaceholder'
  | 'archiveFormContentDescLabel'
  | 'archiveFormContentDescPlaceholder'
  | 'archiveFormRemarksLabel'
  | 'archiveFormRemarksPlaceholder'
  | 'archiveFormRelatedDocsLabel'
  | 'archiveFormRelatedDocsPlaceholder'
  | 'archiveFormAdditionalInfoLabel'
  | 'archiveFormAdditionalInfoPlaceholder'
  | 'archiveFormAccessLevelLabel'
  | 'archiveFormAccessLevelPlaceholder'
  | 'archiveFormAccessConditionsLabel'
  | 'archiveFormAccessConditionsPlaceholder'
  | 'archiveFormIsDigitizedLabel'
  | 'archiveFormDigitizedLinkLabel'
  | 'archiveFormDigitizedLinkPlaceholder'
  | 'archiveFormTopoSigLabel'
  | 'archiveFormTopoSigPlaceholder'
  | 'archiveFormDescSigLabel'
  | 'archiveFormTagsLabel'
  | 'archiveFormUpdateItemButton'
  | 'archiveFormCreateItemButton'
  | 'archiveFormNoChangesDetected'
  | 'archiveInvalidParentTypeError' // e.g., "Item ID {id} is not a Unit."
  | 'archiveParentUnitLoadError' // e.g., "Failed to load parent unit: {message}"
  | 'archiveFetchError' // e.g., "Failed to fetch documents"
  | 'archiveBatchAddTooltipFiltered'
  | 'archiveBatchAddTooltipAll'
  | 'archiveBatchRemoveTooltipFiltered'
  | 'archiveBatchRemoveTooltipAll'
  | 'archiveIsActiveLabel' // e.g., "Is Active"
  | 'unitLabel' // Singular "Unit"
  | 'archiveBrowsingUnit' // e.g., "Browsing items within "{unitTitle}"."
  | 'archiveDescriptionUser' // e.g., "Search documents based on your assigned tags."
  | 'archiveClickCreateHint' // e.g., 'Click "Create Item" to start.'
  | 'archivePreviewBy' // Used for original document creator
  | 'archivePreviewOn' // Used for original document creation date
  | 'archivePreviewInvalidDate'
  | 'archivePreviewErrorDate'
  | 'archivePreviewNotApplicable'
  | 'added' // For batch tag success message
  | 'removed' // For batch tag success message
  | 'thisUnit' // Placeholder for parentUnitId context
  | 'createRootItemButton'
  | 'ownerUserIdSearchLabel' // Keep key for reference, but update label in translation files
  | 'createdBySearchLabel' // New key
  | 'updatedBySearchLabel' // New key
  ;

export type ArchiveTranslationSet = TranslationSet<ArchiveTranslationKey>;