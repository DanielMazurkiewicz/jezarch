import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { FileText, Folder, Trash2, Edit } from 'lucide-react';
// Updated type import to include search result type
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/hooks/useAuth';

// Define a local type extending the search result to include optional resolved fields
// This acknowledges the backend might not always send them or the type definition is out of sync
type PreviewDocumentType = ArchiveDocumentSearchResult & {
    resolvedTopographicSignatures?: string[];
    resolvedDescriptiveSignatures?: string[];
};


interface DocumentPreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    // Use the SearchResult type which includes resolved signatures
    document: ArchiveDocumentSearchResult | null;
    onEdit: (doc: ArchiveDocument) => void; // Keep base type for edit simplicity if form uses base type
    onDisable: (docId: number) => void;
    // Added parentUnitTitle for better display in the link
    parentUnitTitle?: string | null;
}

// --- Date Formatter (Copied from ArchivePage) ---
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return "Error"; }
};
// ---------------------------------------------------

const DocumentPreviewDialog: React.FC<DocumentPreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    document: originalDoc, // Use original name internally for clarity
    onEdit,
    onDisable,
    parentUnitTitle,
}) => {
    const { user } = useAuth();

    // Cast the document to our local type for easier access to potentially resolved fields
    const previewingDoc = originalDoc as PreviewDocumentType | null;

    if (!previewingDoc) {
        return null;
    }

    const isOwnerOrAdmin = user?.role === 'admin' || user?.userId === previewingDoc.ownerUserId;

    const handleEditClick = () => {
        onOpenChange(false); // Close preview
        // Cast to base type if necessary for the form component
        onEdit(previewingDoc as ArchiveDocument);
    };

    const handleDisableClick = () => {
        onDisable(previewingDoc.archiveDocumentId!);
        // Optionally close dialog after confirmation within onDisable, or keep open
        // onOpenChange(false);
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
                        <p><strong>Creator:</strong> {previewingDoc.creator}</p>
                        <p><strong>Date:</strong> {previewingDoc.creationDate}</p>
                        {previewingDoc.parentUnitArchiveDocumentId && (
                            <p><strong>Parent Unit:</strong> <Link to={`/archive?unitId=${previewingDoc.parentUnitArchiveDocumentId}`} className='text-primary hover:underline' onClick={()=> onOpenChange(false)}>{parentUnitTitle || `ID ${previewingDoc.parentUnitArchiveDocumentId}`}</Link></p>
                        )}
                        <p><strong>Owner:</strong> {previewingDoc.ownerLogin ?? 'N/A'} (ID: {previewingDoc.ownerUserId})</p>
                        {/* Display Tags */}
                        {previewingDoc.tags && previewingDoc.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1 items-center">
                                <strong className='mr-1'>Tags:</strong>
                                {previewingDoc.tags.map(tag => (
                                    <Badge key={tag.tagId} variant="secondary" className="text-xs font-normal">{tag.name}</Badge>
                                ))}
                            </div>
                        )}
                        {/* Display Signatures (using optional chaining on the potentially resolved fields) */}
                        {previewingDoc?.resolvedTopographicSignatures && previewingDoc.resolvedTopographicSignatures.length > 0 && (
                            <div className='flex flex-wrap gap-1 pt-1 items-center'>
                                 <strong className='mr-1'>Topo Sigs:</strong>
                                 {/* Explicitly type sig and idx */}
                                 {previewingDoc.resolvedTopographicSignatures.map((sig: string, idx: number) => (
                                     <Badge key={`topo-${idx}`} variant="outline" className='font-mono text-xs'>{sig}</Badge>
                                 ))}
                             </div>
                        )}
                        {previewingDoc?.resolvedDescriptiveSignatures && previewingDoc.resolvedDescriptiveSignatures.length > 0 && (
                             <div className='flex flex-wrap gap-1 pt-1 items-center'>
                                 <strong className='mr-1'>Desc Sigs:</strong>
                                 {/* Explicitly type sig and idx */}
                                 {previewingDoc.resolvedDescriptiveSignatures.map((sig: string, idx: number) => (
                                     <Badge key={`desc-${idx}`} variant="outline" className='font-mono text-xs'>{sig}</Badge>
                                 ))}
                             </div>
                        )}
                    </DialogDescription>
                </DialogHeader>

                {/* Make preview content scrollable */}
                <ScrollArea className="max-h-[50vh] my-4 space-y-4 pr-3 border-t border-b py-4">
                    {/* Content Description */}
                    {previewingDoc.contentDescription && (
                        <div>
                           <h4 className='font-semibold mb-1 text-base'>Content Description</h4>
                           <p className="text-sm whitespace-pre-wrap">{previewingDoc.contentDescription}</p>
                        </div>
                    )}
                     {/* Physical Description */}
                    {(previewingDoc.numberOfPages || previewingDoc.documentType || previewingDoc.dimensions || previewingDoc.binding || previewingDoc.condition || previewingDoc.documentLanguage) && (
                        <div>
                           <h4 className='font-semibold mb-1 text-base'>Physical Details</h4>
                           <ul className='list-disc list-inside text-sm space-y-0.5'>
                               {previewingDoc.numberOfPages && <li>Pages: {previewingDoc.numberOfPages}</li>}
                               {previewingDoc.documentType && <li>Type: {previewingDoc.documentType}</li>}
                               {previewingDoc.dimensions && <li>Dimensions: {previewingDoc.dimensions}</li>}
                               {previewingDoc.binding && <li>Binding: {previewingDoc.binding}</li>}
                               {previewingDoc.condition && <li>Condition: {previewingDoc.condition}</li>}
                               {previewingDoc.documentLanguage && <li>Language: {previewingDoc.documentLanguage}</li>}
                           </ul>
                        </div>
                    )}
                    {/* Other Details */}
                     {(previewingDoc.remarks || previewingDoc.accessLevel || previewingDoc.additionalInformation || previewingDoc.relatedDocumentsReferences || previewingDoc.isDigitized !== null || previewingDoc.isDigitized !== undefined) && ( // Simplified check
                         <div>
                            <h4 className='font-semibold mb-1 text-base'>Other Details</h4>
                            <div className='text-sm space-y-1'>
                                {previewingDoc.remarks && (
                                    <p><strong>Remarks:</strong> {previewingDoc.remarks}</p>
                                )}
                                {previewingDoc.accessLevel && (
                                     <p><strong>Access:</strong> {previewingDoc.accessLevel} {previewingDoc.accessConditions ? `(${previewingDoc.accessConditions})` : ''}</p>
                                )}
                                {previewingDoc.additionalInformation && (
                                     <p><strong>Additional Info:</strong> {previewingDoc.additionalInformation}</p>
                                )}
                                {previewingDoc.relatedDocumentsReferences && (
                                     <p><strong>Related Docs:</strong> {previewingDoc.relatedDocumentsReferences}</p>
                                )}
                                {(previewingDoc.isDigitized !== null && previewingDoc.isDigitized !== undefined) && (
                                    <p><strong>Digitized:</strong> {previewingDoc.isDigitized ? `Yes ${previewingDoc.digitizedVersionLink ? `- Link: ` : ''}` : 'No'}{previewingDoc.digitizedVersionLink && <a href={previewingDoc.digitizedVersionLink} target="_blank" rel="noopener noreferrer" className='text-primary hover:underline break-all'>{previewingDoc.digitizedVersionLink}</a>}</p>
                                )}
                            </div>
                         </div>
                     )}
                </ScrollArea>
                <DialogFooter className='gap-2 sm:justify-between pt-4'>
                    {/* Disable button placed on the left */}
                    <div>
                        {isOwnerOrAdmin && (
                             <Button variant="outline" className='border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive' size="sm" onClick={handleDisableClick}>
                                 <Trash2 className='h-4 w-4 mr-2'/> Disable Item
                            </Button>
                        )}
                    </div>
                    {/* Edit and Close buttons on the right */}
                    <div className='flex gap-2'>
                         {isOwnerOrAdmin && (
                            <Button variant="secondary" size="sm" onClick={handleEditClick}>
                                <Edit className='h-4 w-4 mr-2'/> Edit
                            </Button>
                         )}
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default DocumentPreviewDialog;