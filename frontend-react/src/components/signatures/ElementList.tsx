import React from 'react'; // Import React
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2 } from 'lucide-react';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import { useAuth } from '@/hooks/useAuth'; // Needed if actions depend on role
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility

interface ElementListProps {
  elements: SignatureElementSearchResult[]; // Use search result type which includes parents
  onEdit: (element: SignatureElement) => void;
  onDelete: (elementId: number) => void;
}

// Wrap the functional component definition with React.memo
const ElementList: React.FC<ElementListProps> = React.memo(({ elements, onEdit, onDelete }) => {
  const { user, preferredLanguage } = useAuth(); // Get preferredLanguage
  // Determine if the current user can modify elements (e.g., admin or potentially regular user)
  // TODO: Define actual permissions logic if needed
  const canModify = user?.role === 'admin' || user?.role === 'employee'; // Allow admin and employees

  // Return null if list is empty (parent handles empty message)
  if (elements.length === 0) {
    return null;
  }

  console.log("Rendering ElementList"); // Add console log for debugging renders

  return (
    // Wrap in div for border and overflow
    <div className="border rounded-lg overflow-hidden">
        <Table>
            <TableHeader>
                <TableRow>
                    {/* Use translated headers */}
                    <TableHead className="w-[80px] text-center">{t('elementIndexLabel', preferredLanguage).split(' (')[0]}</TableHead> {/* Get only "Index" part */}
                    <TableHead>{t('elementNameLabel', preferredLanguage)}</TableHead>
                    <TableHead>{t('elementDescriptionLabel', preferredLanguage)}</TableHead>
                    {/* REMOVED Parents Header */}
                    {/* Actions column if user can modify */}
                    {canModify && <TableHead className="text-right w-[100px]">{t('actionsLabel', preferredLanguage)}</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {elements.map((element) => (
                    <TableRow key={element.signatureElementId}>
                        {/* Display index or placeholder */}
                        <TableCell className="font-mono text-center text-sm">
                             {/* TODO: Translate "Auto" */}
                            {element.index || <i className='text-muted-foreground not-italic'>Auto</i>}
                        </TableCell>
                        <TableCell className="font-medium">{element.name}</TableCell>
                        {/* Truncate description, show placeholder */}
                         {/* TODO: Translate "None" */}
                        <TableCell className='text-sm text-muted-foreground max-w-xs truncate' title={element.description || ''}>
                            {element.description || <i className='not-italic'>None</i>}
                        </TableCell>
                        {/* REMOVED Parents Cell */}
                        {/* Action Buttons */}
                        {canModify && (
                            <TableCell className="text-right space-x-1">
                                 {/* Use translated titles */}
                                <Button variant="ghost" size="icon" onClick={() => onEdit(element)} title={t('elementEditButtonTooltip', preferredLanguage)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => onDelete(element.signatureElementId!)} title={t('elementDeleteButtonTooltip', preferredLanguage)}>
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
}); // Close React.memo wrapper

// Explicitly set display name for easier debugging
ElementList.displayName = 'ElementList';

export default ElementList;