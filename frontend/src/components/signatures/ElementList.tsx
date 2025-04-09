import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import { useAuth } from '@/hooks/useAuth';

interface ElementListProps {
  elements: SignatureElement[];
  onEdit: (element: SignatureElement) => void;
  onDelete: (elementId: number) => void;
}

const ElementList: React.FC<ElementListProps> = ({ elements, onEdit, onDelete }) => {
  const { user } = useAuth();
  // Decide if non-admins can edit/delete elements
  const canModify = user?.role === 'admin' || true; // Example: Allow regular users too

  if (elements.length === 0) {
    return <p className="text-muted-foreground text-center py-4">No elements found for this component.</p>;
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Index</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Description</TableHead>
            {canModify && <TableHead className="text-right w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {elements.map((element) => (
            <TableRow key={element.signatureElementId}>
              <TableCell className="font-mono text-center">{element.index || <i className='text-muted-foreground'>N/A</i>}</TableCell>
              <TableCell className="font-medium">{element.name}</TableCell>
              <TableCell className='text-sm text-muted-foreground'>{element.description || <i>None</i>}</TableCell>
              {canModify && (
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(element)} title="Edit Element">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(element.signatureElementId!)} title="Delete Element">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default ElementList;