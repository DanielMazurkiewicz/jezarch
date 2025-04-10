import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge'; // Only used if showing tags/status badges
import { Edit, Trash2, FileText, Folder } from 'lucide-react'; // Icons
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface DocumentListProps {
  documents: ArchiveDocumentSearchResult[]; // Use search result which includes resolved signatures
  onEdit: (doc: ArchiveDocument) => void; // Pass base type for editing simplicity
  onDisable: (docId: number) => void; // Changed from onDelete
}

// Temporary type assertion if backend type is missing resolved signatures
type ArchiveDocumentSearchResultWithResolved = ArchiveDocumentSearchResult & {
    resolvedTopographicSignatures?: string[];
    resolvedDescriptiveSignatures?: string[];
};


const DocumentList: React.FC<DocumentListProps> = ({ documents, onEdit, onDisable }) => {
  const { user } = useAuth();

  // Check if the current user can modify a specific document (owner or admin)
  const canModify = (docOwnerId: number) => {
      return user?.role === 'admin' || user?.userId === docOwnerId;
  };

  // Return null if list is empty (parent handles empty message)
  if (documents.length === 0) {
    return null;
  }

  return (
    // Wrap in div for border and overflow
    <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    {/* Type Icon */}
                    <TableHead className='w-[50px]'>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Date</TableHead>
                    {/* Show first Topographic Signature Path */}
                    <TableHead className='max-w-[200px]'>Topographic Sig</TableHead>
                     {/* Show first Descriptive Signature Path */}
                    <TableHead className='max-w-[200px]'>Descriptive Sig</TableHead>
                    {/* Actions Column */}
                    <TableHead className="text-right w-[100px]">Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {documents.map((doc) => {
                    // Use type assertion if necessary
                    const docWithResolved = doc as ArchiveDocumentSearchResultWithResolved;
                    const isOwnerOrAdmin = canModify(doc.ownerUserId);
                    return (
                        <TableRow key={doc.archiveDocumentId}>
                            {/* Type Icon */}
                            <TableCell className='text-center' title={doc.type === 'unit' ? 'Unit' : 'Document'}>
                                {doc.type === 'unit'
                                    ? <Folder className='h-4 w-4 text-blue-600 inline-block'/>
                                    : <FileText className='h-4 w-4 text-green-600 inline-block'/>}
                            </TableCell>
                            {/* Title, Creator, Date */}
                            <TableCell className="font-medium">{doc.title}</TableCell>
                            <TableCell className="text-sm">{doc.creator}</TableCell>
                            <TableCell className="text-sm">{doc.creationDate}</TableCell>
                            {/* Topographic Signature (first path) */}
                            <TableCell className='font-mono text-xs truncate' title={docWithResolved.resolvedTopographicSignatures?.[0] || ''}>
                                {(docWithResolved.resolvedTopographicSignatures?.[0])
                                    ? docWithResolved.resolvedTopographicSignatures[0]
                                    : <i className='text-muted-foreground not-italic'>None</i>
                                }
                            </TableCell>
                             {/* Descriptive Signature (first path) */}
                             <TableCell className='font-mono text-xs truncate' title={docWithResolved.resolvedDescriptiveSignatures?.[0] || ''}>
                                {(docWithResolved.resolvedDescriptiveSignatures?.[0])
                                    ? docWithResolved.resolvedDescriptiveSignatures[0]
                                    : <i className='text-muted-foreground not-italic'>None</i>
                                }
                            </TableCell>
                            {/* Actions */}
                            <TableCell className="text-right space-x-1">
                                {isOwnerOrAdmin ? (
                                    // Use React Fragment <>...</> for multiple elements in the 'true' branch
                                    <>
                                        <Button variant="ghost" size="icon" onClick={() => onEdit(doc)} title="Edit Item">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        {/* Disable Button - uses Trash icon but performs disable action */}
                                        <Button variant="ghost" size="icon" onClick={() => onDisable(doc.archiveDocumentId!)} title="Disable Item">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </>
                                ) : (
                                    // Single element for the 'false' branch
                                    <span className="text-xs text-muted-foreground italic">Read-only</span>
                                )}
                            </TableCell> {/* Closing TableCell */}
                        </TableRow> // Closing TableRow
                    );
                })} {/* Closing map */}
            </TableBody> {/* Closing TableBody */}
        </Table> {/* Closing Table */}
    </div> // Closing div
  );
};

export default DocumentList;