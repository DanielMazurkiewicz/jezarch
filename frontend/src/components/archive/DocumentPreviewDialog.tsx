import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { FileText, Folder, Trash2, RefreshCcw, Edit } from 'lucide-react';
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/hooks/useAuth';
import { type SupportedLanguage } from '@/translations/models';
import { t } from '@/translations/utils'; // Import translation utility
import { cn } from '@/lib/utils';

// Define a local type extending the search result to include optional resolved fields
type PreviewDocumentType = ArchiveDocumentSearchResult & {
    resolvedDescriptiveSignatures?: string[];
};


interface DocumentPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    document: ArchiveDocumentSearchResult | null;
    onEdit: (doc: ArchiveDocument) => void;
    onDelete: (docId: number) => void;
    onRestore: (docId: number) => void;
    parentUnitTitle?: string | null;
}

// --- Date Formatter (receives language parameter) ---
const formatDate = (dateInput: Date | string | undefined | null, lang: SupportedLanguage): string => {
    if (!dateInput) return t('archivePreviewNotApplicable', lang);
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return t('archivePreviewInvalidDate', lang);
        // Format date and time for Created/Updated On fields
        return date.toLocaleString(undefined, {
             year: 'numeric', month: 'short', day: 'numeric',
             hour: '2-digit', minute: '2-digit', second: '2-digit'
            });
    } catch (e) { return t('archivePreviewErrorDate', lang); }
};


const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    document: originalDoc,
    onEdit,
    onDelete,
    onRestore,
    parentUnitTitle,
}) => {
    const { user, preferredLanguage } = useAuth();

    const previewingDoc = originalDoc as PreviewDocumentType | null;

    if (!previewingDoc) {
        return null;
    }

    // --- Permission Check ---
    const canModify = user?.role === 'admin' || user?.role === 'employee';
    const isDeleted = Boolean(previewingDoc.isDeleted);

    const handleEditClick = () => {
        onOpenChange(false);
        onEdit(previewingDoc as ArchiveDocument);
    };

    const handleDeleteClick = () => {
        onDelete(previewingDoc.archiveDocumentId!);
    };

    const handleRestoreClick = () => {
        onRestore(previewingDoc.archiveDocumentId!);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle className='flex items-center gap-2'>
                        {previewingDoc.type === 'unit' ? <Folder className='h-5 w-5 text-blue-600'/> : <FileText className='h-5 w-5 text-green-600'/>}
                        {previewingDoc.title}
                    </DialogTitle>
                    <DialogDescription className='space-y-1 pt-1 text-left'>
                        <p><strong>{t('archivePreviewCreatorLabel', preferredLanguage)}:</strong> {previewingDoc.creator}</p>
                        <p><strong>{t('archivePreviewDateLabel', preferredLanguage)}:</strong> {previewingDoc.creationDate}</p>
                        {previewingDoc.parentUnitArchiveDocumentId && (
                            <p><strong>{t('archivePreviewParentUnitLabel', preferredLanguage)}:</strong> <Link to={`/archive?unitId=${previewingDoc.parentUnitArchiveDocumentId}`} className='text-primary hover:underline' onClick={()=> onOpenChange(false)}>{parentUnitTitle || `ID ${previewingDoc.parentUnitArchiveDocumentId}`}</Link></p>
                        )}
                        {/* --- Updated: Show Created By / Updated By --- */}
                        <p><strong>{t('archivePreviewCreatedByLabel', preferredLanguage)}:</strong> {previewingDoc.createdBy} ({formatDate(previewingDoc.createdOn, preferredLanguage)})</p>
                        <p><strong>{t('archivePreviewUpdatedByLabel', preferredLanguage)}:</strong> {previewingDoc.updatedBy} ({formatDate(previewingDoc.modifiedOn, preferredLanguage)})</p>
                        {/* ------------------------------------------ */}
                        {previewingDoc.tags && previewingDoc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 items-center">
                                <strong className='mr-1'>{t('archivePreviewTagsLabel', preferredLanguage)}:</strong>
                                {previewingDoc.tags.map(tag => (
                                    <Badge key={tag.tagId} variant="secondary" className="text-xs font-normal">{tag.name}</Badge>
                                ))}
                            </div>
                        )}
                         {previewingDoc.topographicSignature && (
                             <div className='flex flex-wrap gap-1 pt-1 items-center'>
                                 <strong className='mr-1'>{t('archivePreviewTopoSigLabel', preferredLanguage)}:</strong>
                                 <Badge variant="outline" className='font-mono text-xs'>{previewingDoc.topographicSignature}</Badge>
                             </div>
                         )}
                        {previewingDoc?.resolvedDescriptiveSignatures && previewingDoc.resolvedDescriptiveSignatures.length > 0 && (
                             <div className='flex flex-wrap gap-1 pt-1 items-center'>
                                 <strong className='mr-1'>{t('archivePreviewDescSigLabel', preferredLanguage)}:</strong>
                                 {previewingDoc.resolvedDescriptiveSignatures.map((sig: string, idx: number) => (
                                     <Badge key={`desc-${idx}`} variant="outline" className='font-mono text-xs'>{sig}</Badge>
                                 ))}
                             </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                <ScrollArea className="max-h-[50vh] my-4 space-y-4 pr-3 border-t border-b py-4">
                    {/* Content Description */}
                    {previewingDoc.contentDescription && (
                        <div>
                           <h4 className='font-semibold mb-1 text-base'>{t('archivePreviewContentDescriptionLabel', preferredLanguage)}</h4>
                           <p className="text-sm whitespace-pre-wrap">{previewingDoc.contentDescription}</p>
                        </div>
                    )}
                     {/* Physical Description (only for units) */}
                    {previewingDoc.type === 'unit' && (previewingDoc.numberOfPages || previewingDoc.documentType || previewingDoc.dimensions || previewingDoc.binding || previewingDoc.condition || previewingDoc.documentLanguage) && (
                        <div>
                           <h4 className='font-semibold mb-1 text-base'>{t('archivePreviewPhysicalDetailsLabel', preferredLanguage)}</h4>
                           <ul className='list-disc list-inside text-sm space-y-0.5'>
                               {previewingDoc.numberOfPages && <li>{t('archivePreviewPagesLabel', preferredLanguage)}: {previewingDoc.numberOfPages}</li>}
                               {previewingDoc.documentType && <li>{t('archivePreviewTypeLabel', preferredLanguage)}: {previewingDoc.documentType}</li>}
                               {previewingDoc.dimensions && <li>{t('archivePreviewDimensionsLabel', preferredLanguage)}: {previewingDoc.dimensions}</li>}
                               {previewingDoc.binding && <li>{t('archivePreviewBindingLabel', preferredLanguage)}: {previewingDoc.binding}</li>}
                               {previewingDoc.condition && <li>{t('archivePreviewConditionLabel', preferredLanguage)}: {previewingDoc.condition}</li>}
                               {previewingDoc.documentLanguage && <li>{t('archivePreviewLanguageLabel', preferredLanguage)}: {previewingDoc.documentLanguage}</li>}
                           </ul>
                        </div>
                    )}
                    {/* Other Details */}
                     {(previewingDoc.remarks || previewingDoc.accessLevel || previewingDoc.additionalInformation || previewingDoc.relatedDocumentsReferences || previewingDoc.isDigitized !== null || previewingDoc.isDigitized !== undefined) && (
                         <div>
                            <h4 className='font-semibold mb-1 text-base'>{t('archivePreviewOtherDetailsLabel', preferredLanguage)}</h4>
                            <div className='text-sm space-y-1'>
                                {previewingDoc.remarks && (
                                    <p><strong>{t('archivePreviewRemarksLabel', preferredLanguage)}:</strong> {previewingDoc.remarks}</p>
                                )}
                                {previewingDoc.accessLevel && (
                                     <p><strong>{t('archivePreviewAccessLabel', preferredLanguage)}:</strong> {previewingDoc.accessLevel} {previewingDoc.accessConditions ? `(${previewingDoc.accessConditions})` : ''}</p>
                                )}
                                {previewingDoc.additionalInformation && (
                                     <p><strong>{t('archivePreviewAdditionalInfoLabel', preferredLanguage)}:</strong> {previewingDoc.additionalInformation}</p>
                                )}
                                {previewingDoc.relatedDocumentsReferences && (
                                     <p><strong>{t('archivePreviewRelatedDocsLabel', preferredLanguage)}:</strong> {previewingDoc.relatedDocumentsReferences}</p>
                                )}
                                {(previewingDoc.isDigitized !== null && previewingDoc.isDigitized !== undefined) && (
                                    <p><strong>{t('archivePreviewDigitizedLabel', preferredLanguage)}:</strong> {previewingDoc.isDigitized ? `${t('archivePreviewDigitizedYes', preferredLanguage)} ${previewingDoc.digitizedVersionLink ? `- ${t('archivePreviewDigitizedYesLink', preferredLanguage)} ` : ''}` : t('archivePreviewDigitizedNo', preferredLanguage)}{previewingDoc.digitizedVersionLink && <a href={previewingDoc.digitizedVersionLink} target="_blank" rel="noopener noreferrer" className='text-primary hover:underline break-all'>{previewingDoc.digitizedVersionLink}</a>}</p>
                                )}
                            </div>
                         </div>
                     )}
                     {/* Empty Content Placeholder */}
                     {!previewingDoc.contentDescription && !(previewingDoc.numberOfPages || previewingDoc.documentType || previewingDoc.dimensions || previewingDoc.binding || previewingDoc.condition || previewingDoc.documentLanguage) && !(previewingDoc.remarks || previewingDoc.accessLevel || previewingDoc.additionalInformation || previewingDoc.relatedDocumentsReferences || previewingDoc.isDigitized !== null || previewingDoc.isDigitized !== undefined) && (
                          <p className="text-sm text-muted-foreground italic text-center py-4">{t('archivePreviewEmptyContent', preferredLanguage)}</p>
                     )}
                </ScrollArea>
                <DialogFooter className='gap-2 sm:justify-between pt-4'>
                    {/* Delete / Restore button placed on the left */}
                    <div>
                        {canModify && !isDeleted && (
                             <Button
                                variant="outline"
                                className={cn('border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive')}
                                size="sm"
                                onClick={handleDeleteClick}
                            >
                                 <Trash2 className='h-4 w-4 mr-2'/> {t('deleteButton', preferredLanguage)}
                            </Button>
                        )}
                        {canModify && isDeleted && (
                             <Button
                                variant="outline"
                                className={cn('border-green-600 text-green-600 hover:bg-green-50')}
                                size="sm"
                                onClick={handleRestoreClick}
                            >
                                 <RefreshCcw className='h-4 w-4 mr-2'/> {t('restoreButton', preferredLanguage)}
                            </Button>
                        )}
                    </div>
                    {/* Edit and Close buttons on the right */}
                    <div className='flex gap-2'>
                         {canModify && (
                            <Button variant="secondary" size="sm" onClick={handleEditClick}>
                                <Edit className='h-4 w-4 mr-2'/> {t('editButton', preferredLanguage)}
                            </Button>
                         )}
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('closeButton', preferredLanguage)}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentPreviewDialog;