import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import { useAuth } from '@/hooks/useAuth'; // Needed if actions depend on role

interface ElementListProps {
  elements: SignatureElementSearchResult[]; // Use search result type which includes parents
  onEdit: (element: SignatureElement) => void;
  onDelete: (elementId: number) => void;
}

const ElementList: React.FC<ElementListProps> = ({ elements, onEdit, onDelete }) => {
  const { user } = useAuth();
  // Determine if the current user can modify elements (e.g., admin or potentially regular user)
  const canModify = user?.role === 'admin' || true; // Allow regular users for now

  // Return null if list is empty (parent handles empty message)
  if (elements.length === 0) {
    return null;
  }

  return (
    // Wrap in div for border and overflow
    <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    {/* Align index center */}
                    <TableHead className="w-[80px] text-center">Index</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Parents</TableHead>
                    {/* Actions column if user can modify */}
                    {canModify && <TableHead className="text-right w-[100px]">Actions</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {elements.map((element) => (
                    <TableRow key={element.signatureElementId}>
                        {/* Display index or placeholder */}
                        <TableCell className="font-mono text-center text-sm">
                            {element.index || <i className='text-muted-foreground not-italic'>Auto</i>}
                        </TableCell>
                        <TableCell className="font-medium">{element.name}</TableCell>
                        {/* Truncate description, show placeholder */}
                        <TableCell className='text-sm text-muted-foreground max-w-xs truncate' title={element.description || ''}>
                            {element.description || <i className='not-italic'>None</i>}
                        </TableCell>
                        {/* Display Parent Badges */}
                        <TableCell>
                            <div className='flex flex-wrap gap-1 max-w-[250px]'>
                                {/* Show first few parents */}
                                {element.parentElements?.slice(0, 3).map(parent => (
                                    <Badge key={parent.signatureElementId} variant='secondary' className='text-xs font-normal'>
                                        {parent.index ? `[${parent.index}] ` : ''}{parent.name}
                                    </Badge>
                                ))}
                                {/* Indicate if more parents exist */}
                                {element.parentElements && element.parentElements.length > 3 && (
                                    <Badge variant='outline' className='text-xs font-normal'>+{element.parentElements.length - 3} more</Badge>
                                )}
                                {/* Placeholder if no parents */}
                                {(!element.parentElements || element.parentElements.length === 0) && (
                                    <span className='text-xs italic text-muted-foreground'>No parents</span>
                                )}
                            </div>
                        </TableCell>
                        {/* Action Buttons */}
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