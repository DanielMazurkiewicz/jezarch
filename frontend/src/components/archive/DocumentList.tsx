import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, Folder, Eye } from 'lucide-react'; // Icons
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

interface DocumentListProps {
  documents: ArchiveDocumentSearchResult[]; // Use search result which includes resolved signatures
  onEdit: (doc: ArchiveDocument) => void; // Pass base type for editing simplicity
  onDisable: (docId: number) => void;
  onPreview: (doc: ArchiveDocumentSearchResult) => void;
  onOpenUnit: (doc: ArchiveDocumentSearchResult) => void;
}

// Temporary type assertion if backend type is missing resolved signatures
type ArchiveDocumentSearchResultWithResolved = ArchiveDocumentSearchResult & {
    resolvedDescriptiveSignatures?: string[];
};


const DocumentList: React.FC<DocumentListProps> = ({ documents, onEdit, onDisable, onPreview, onOpenUnit }) => {
  const { user, preferredLanguage } = useAuth(); // Get preferredLanguage

  const canModify = () => {
      // Only admin and employee can modify archive items
      return user?.role === 'admin' || user?.role === 'employee';
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
                    <TableHead className='w-[50px]'>{t('typeLabel', preferredLanguage)}</TableHead>
                    {/* Adjusted Title Header to allow more space and potentially guide wrapping */}
                    <TableHead className='max-w-sm md:max-w-md'>{t('titleLabel', preferredLanguage)}</TableHead>
                    {/* REMOVED CreatedBy/UpdatedBy Headers */}
                    <TableHead className='max-w-[200px]'>{t('archiveTopoSigLabel', preferredLanguage)}</TableHead>
                    <TableHead className='max-w-[200px]'>{t('archiveDescSigLabel', preferredLanguage)}</TableHead>
                    <TableHead className="text-right w-[130px]">{t('actionsLabel', preferredLanguage)}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {documents.map((doc) => {
                    const docWithResolved = doc as ArchiveDocumentSearchResultWithResolved;
                    const canUserModify = canModify(); // Check modification permission
                    const isUnit = doc.type === 'unit';

                    return (
                        <TableRow
                           key={doc.archiveDocumentId}
                           onClick={() => handleClick(doc)}
                           className='cursor-pointer hover:bg-muted/50 transition-colors'
                           title={isUnit ? t('archiveUnitOpenTitle', preferredLanguage, { title: doc.title }) : t('archiveDocumentPreviewTitle', preferredLanguage, { title: doc.title })}
                        >
                            <TableCell className='text-center'>
                                {isUnit
                                    ? <Folder className='h-4 w-4 text-blue-600 inline-block'/>
                                    : <FileText className='h-4 w-4 text-green-600 inline-block'/>}
                            </TableCell>
                            {/* Title cell: Allow wrapping and set max width */}
                            <TableCell className="font-medium max-w-sm md:max-w-md whitespace-normal break-words">{doc.title}</TableCell>
                            {/* REMOVED CreatedBy/UpdatedBy Cells */}
                             <TableCell className='font-mono text-xs truncate' title={doc.topographicSignature || ''}>
                                 {doc.topographicSignature || <i className='text-muted-foreground not-italic'>{t('noneLabel', preferredLanguage)}</i>}
                             </TableCell>
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
                                {!canUserModify && (
                                    <span className="text-xs text-muted-foreground italic pr-2">{t('readOnly', preferredLanguage)}</span>
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