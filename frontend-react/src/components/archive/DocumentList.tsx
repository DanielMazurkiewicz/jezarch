import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Only used if showing tags/status badges
// Added Eye icon for preview
import { Edit, Trash2, FileText, Folder, Eye } from 'lucide-react'; // Icons
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models'; // Type now includes topographicSignature: string
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

interface DocumentListProps {
  documents: ArchiveDocumentSearchResult[]; // Use search result which includes resolved signatures
  onEdit: (doc: ArchiveDocument) => void; // Pass base type for editing simplicity
  onDisable: (docId: number) => void;
  // Added handlers for preview and opening units
  onPreview: (doc: ArchiveDocumentSearchResult) => void;
  onOpenUnit: (doc: ArchiveDocumentSearchResult) => void;
}

// Temporary type assertion if backend type is missing resolved signatures
type ArchiveDocumentSearchResultWithResolved = ArchiveDocumentSearchResult & {
    // resolvedTopographicSignatures?: string[]; // Removed - no longer resolved array
    resolvedDescriptiveSignatures?: string[];
};


const DocumentList: React.FC<DocumentListProps> = ({ documents, onEdit, onDisable, onPreview, onOpenUnit }) => {
  const { user, preferredLanguage } = useAuth(); // Get preferredLanguage

  const canModify = (docOwnerId: number) => {
      // --- UPDATED: Allow employees to edit/disable ---
      return user?.role === 'admin' || user?.role === 'employee';
      // Previous logic (owner or admin):
      // return user?.role === 'admin' || user?.userId === docOwnerId;
  };

  // Handle click action based on item type
  const handleClick = (doc: ArchiveDocumentSearchResult) => {
      if (doc.type === 'unit') {
          onOpenUnit(doc);
      } else {
          onPreview(doc); // Preview document by default
      }
  };

  if (documents.length === 0) {
    return null;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                     {/* Use translated headers */}
                    <TableHead className='w-[50px]'>{t('typeLabel', preferredLanguage)}</TableHead>
                    <TableHead>{t('titleLabel', preferredLanguage)}</TableHead>
                    <TableHead>{t('archiveCreatorLabel', preferredLanguage)}</TableHead> {/* TODO: Add archiveCreatorLabel */}
                    <TableHead>{t('archiveCreationDateLabel', preferredLanguage)}</TableHead> {/* TODO: Add archiveCreationDateLabel */}
                    <TableHead className='max-w-[200px]'>{t('archiveTopoSigLabel', preferredLanguage)}</TableHead> {/* TODO: Add archiveTopoSigLabel */}
                    <TableHead className='max-w-[200px]'>{t('archiveDescSigLabel', preferredLanguage)}</TableHead> {/* TODO: Add archiveDescSigLabel */}
                    <TableHead className="text-right w-[130px]">{t('actionsLabel', preferredLanguage)}</TableHead> {/* Increased width */}
                </TableRow>
            </TableHeader>
            <TableBody>
                {documents.map((doc) => {
                    const docWithResolved = doc as ArchiveDocumentSearchResultWithResolved;
                    // --- UPDATED: Check uses new logic ---
                    const canUserModify = canModify(doc.ownerUserId);
                    const isUnit = doc.type === 'unit';

                    return (
                        // Make entire row clickable, but stop propagation for buttons
                        <TableRow
                           key={doc.archiveDocumentId}
                           onClick={() => handleClick(doc)}
                           className='cursor-pointer hover:bg-muted/50 transition-colors'
                            // TODO: Translate titles
                           title={isUnit ? `Open Unit "${doc.title}"` : `Preview Document "${doc.title}"`}
                        >
                            <TableCell className='text-center'>
                                {isUnit
                                    ? <Folder className='h-4 w-4 text-blue-600 inline-block'/>
                                    : <FileText className='h-4 w-4 text-green-600 inline-block'/>}
                            </TableCell>
                            <TableCell className="font-medium">{doc.title}</TableCell>
                            <TableCell className="text-sm">{doc.creator}</TableCell>
                            <TableCell className="text-sm">{doc.creationDate}</TableCell>
                             {/* --- UPDATED: Display topographic signature string --- */}
                              {/* Use translated placeholder */}
                             <TableCell className='font-mono text-xs truncate' title={doc.topographicSignature || ''}>
                                 {doc.topographicSignature || <i className='text-muted-foreground not-italic'>{t('noneLabel', preferredLanguage)}</i>}
                             </TableCell>
                            {/* --- UPDATED: Display multiple descriptive signatures --- */}
                              {/* Use translated placeholder */}
                            <TableCell className='font-mono text-xs' title={docWithResolved.resolvedDescriptiveSignatures?.join('\n') || ''}>
                                {(docWithResolved.resolvedDescriptiveSignatures && docWithResolved.resolvedDescriptiveSignatures.length > 0)
                                    ? (
                                        <div className="flex flex-col">
                                            {docWithResolved.resolvedDescriptiveSignatures.map((sig, index) => (
                                                <span key={index} className="truncate block">{sig}</span>
                                            ))}
                                        </div>
                                      )
                                     : <i className='text-muted-foreground not-italic'>{t('noneLabel', preferredLanguage)}</i>
                                }
                            </TableCell>
                            <TableCell className="text-right space-x-1">
                                {/* Use translated titles */}
                                {/* Preview Button (only for documents) */}
                                {!isUnit && (
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onPreview(doc); }} title={t('previewButton', preferredLanguage)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                )}
                                {/* Edit Button (always available if permissions allow) */}
                                {canUserModify && (
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(doc); }} title={t('editButton', preferredLanguage)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                )}
                                {/* Disable Button (always available if permissions allow) */}
                                {canUserModify && (
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDisable(doc.archiveDocumentId!); }} title={t('disableButton', preferredLanguage)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                )}
                                {/* Read-only indicator */}
                                {/* TODO: Translate "Read-only" */}
                                {!canUserModify && (
                                    <span className="text-xs text-muted-foreground italic pr-2">Read-only</span>
                                )}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </div>
  );
};

export default DocumentList;