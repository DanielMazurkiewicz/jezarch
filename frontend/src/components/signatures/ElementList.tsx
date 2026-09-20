import React from 'react'; // Import React
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, Eye, ChevronRight } from 'lucide-react';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { useAuth } from '@/hooks/useAuth'; // Needed if actions depend on role
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility

interface ElementListProps {
  elements: SignatureElementSearchResult[]; // Use search result type which includes parents
  onEdit: (element: SignatureElement) => void;
  onDelete: (elementId: number) => void;
  onPreview: (element: SignatureElement) => void;
  // When provided, element names become clickable to drill into their children
  onViewChildren?: (element: SignatureElement) => void;
  // When provided, an extra "Component" column is shown (children may span components)
  componentsById?: Map<number, SignatureComponent>;
}

// Wrap the functional component definition with React.memo
const ElementList: React.FC<ElementListProps> = React.memo(({ elements, onEdit, onDelete, onPreview, onViewChildren, componentsById }) => {
  const { user, preferredLanguage } = useAuth(); // Get preferredLanguage
  // Determine if the current user can modify elements (e.g., admin or potentially regular user)
  const canModify = user?.role === 'admin' || user?.role === 'employee'; // Allow admin and employees

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
                    {/* Use translated headers */}
                    <TableHead className="w-[80px] text-center">{t('elementIndexShortLabel', preferredLanguage)}</TableHead>
                    <TableHead>{t('elementNameLabel', preferredLanguage)}</TableHead>
                    {componentsById && <TableHead>{t('elementListComponentHeader', preferredLanguage)}</TableHead>}
                    <TableHead>{t('elementDescriptionLabel', preferredLanguage)}</TableHead>
                    {/* Actions column if user can modify */}
                    {canModify && <TableHead className="text-right w-[100px]">{t('actionsLabel', preferredLanguage)}</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {elements.map((element) => {
                    const component = componentsById?.get(element.signatureComponentId);
                    const childCount = typeof element.childCount === 'number' ? element.childCount : 0;
                    return (
                        <TableRow key={element.signatureElementId}>
                            {/* Display index or placeholder */}
                            <TableCell className="font-mono text-center text-sm">
                                {element.index || <i className='text-muted-foreground not-italic'>{t('elementIndexAuto', preferredLanguage)}</i>}
                            </TableCell>
                            {/* Name — clickable when drilling into children is supported */}
                            <TableCell className="font-medium">
                                {onViewChildren ? (
                                    <button
                                        type="button"
                                        onClick={() => onViewChildren(element)}
                                        className={cn(
                                            "inline-flex items-center gap-1.5 cursor-pointer hover:text-primary hover:underline underline-offset-2",
                                            childCount > 0 && "text-primary"
                                        )}
                                        title={t('viewChildrenTooltip', preferredLanguage)}
                                    >
                                        <span>{element.name}</span>
                                        {childCount > 0 && (
                                            <Badge variant="secondary" className="h-4 px-1.5 text-[10px] tabular-nums">{childCount}</Badge>
                                        )}
                                        <ChevronRight className={cn("h-3.5 w-3.5", childCount > 0 ? "opacity-80" : "opacity-40")} />
                                    </button>
                                ) : (
                                    element.name
                                )}
                            </TableCell>
                            {/* Component column (only when children may span components) */}
                            {componentsById && (
                                <TableCell className="text-sm">
                                    {component ? (
                                        <Badge variant="outline" className="text-xs">{component.name}</Badge>
                                    ) : (
                                        <i className='not-italic text-muted-foreground'>{t('notAvailableAbbr', preferredLanguage)}</i>
                                    )}
                                </TableCell>
                            )}
                            {/* Truncate description, show placeholder */}
                            <TableCell className='text-sm text-muted-foreground max-w-xs truncate' title={element.description || ''}>
                                {element.description || <i className='not-italic'>{t('noneLabel', preferredLanguage)}</i>}
                            </TableCell>
                            {/* Action Buttons */}
                            {canModify && (
                                <TableCell className="text-right space-x-1">
                                     {/* Use translated titles */}
                                    <Button variant="ghost" size="icon" onClick={() => onPreview(element)} title={t('previewButton', preferredLanguage)}>
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onEdit(element)} title={t('elementEditButtonTooltip', preferredLanguage)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => onDelete(element.signatureElementId!)} title={t('elementDeleteButtonTooltip', preferredLanguage)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            )}
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    </div>
  );
}); // Close React.memo wrapper

// Explicitly set display name for easier debugging
ElementList.displayName = 'ElementList';

export default ElementList;
