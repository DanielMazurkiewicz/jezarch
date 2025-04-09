import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, FileText, Folder } from 'lucide-react'; // Icons
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/hooks/useAuth';

interface DocumentListProps {
  documents: ArchiveDocument[];
  onEdit: (doc: ArchiveDocument) => void;
  onDisable: (docId: number) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ documents, onEdit, onDisable }) => {
  const { user } = useAuth();

  const canModify = (docOwnerId: number) => {
      return user?.role === 'admin' || user?.userId === docOwnerId;
  };

  if (documents.length === 0) {
    return <p className="text-muted-foreground text-center">No documents or units found.</p>;
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[50px]'>Type</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Creator</TableHead>
            <TableHead>Creation Date</TableHead>
            <TableHead>Topographic Sig (1st)</TableHead> {/* Show first path */}
            <TableHead className="text-right w-[100px]">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.map((doc) => (
            <TableRow key={doc.archiveDocumentId}>
              <TableCell className='text-center' title={doc.type === 'unit' ? 'Unit' : 'Document'}> {/* Add title here */}
                  {doc.type === 'unit' ? <Folder className='h-4 w-4 text-blue-600'/> : <FileText className='h-4 w-4 text-green-600'/>}
               </TableCell>
              <TableCell className="font-medium">{doc.title}</TableCell>
              <TableCell>{doc.creator}</TableCell>
              <TableCell>{doc.creationDate}</TableCell>
              <TableCell className='font-mono text-xs'>
                  {/* Display first topographic signature path - simplified */}
                  {doc.topographicSignatureElementIds?.[0]?.join(' / ') || <i className='text-muted-foreground'>None</i>}
               </TableCell>
              <TableCell className="text-right space-x-1">
                 {canModify(doc.ownerUserId) && (
                     <>
                         <Button variant="ghost" size="icon" onClick={() => onEdit(doc)} title="Edit Document/Unit">
                            <Edit className="h-4 w-4" />
                         </Button>
                         <Button variant="ghost" size="icon" onClick={() => onDisable(doc.archiveDocumentId!)} title="Disable Document/Unit">
                            <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                     </>
                 )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default DocumentList;