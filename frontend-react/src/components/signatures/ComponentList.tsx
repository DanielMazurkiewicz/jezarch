import React from 'react'; // Import React
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ListRestart, FolderOpen } from 'lucide-react'; // Added FolderOpen icon
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

interface ComponentListProps {
    components: SignatureComponent[];
    onEdit: (component: SignatureComponent) => void;
    onDelete: (componentId: number) => void;
    // Renamed onSelect to onOpen for clarity
    onOpen: (component: SignatureComponent) => void;
    onReindex: (componentId: number) => void;
}

// Wrap the functional component definition with React.memo
const ComponentList: React.FC<ComponentListProps> = React.memo(({
    components, onEdit, onDelete, onOpen, onReindex // Updated prop name
}) => {
    const { user, preferredLanguage } = useAuth(); // Get preferredLanguage
    const isAdmin = user?.role === 'admin';

    // Handle row click to open the component's element page
    const handleRowClick = (component: SignatureComponent) => {
        onOpen(component);
    };

    // Map index types to readable labels using translations
    const getIndexTypeLabel = (type: SignatureComponent['index_type']): string => {
         switch(type) {
             case 'dec': return t('indexTypeDecimal', preferredLanguage);
             case 'roman': return t('indexTypeRoman', preferredLanguage);
             case 'small_char': return t('indexTypeLowerLetter', preferredLanguage);
             case 'capital_char': return t('indexTypeUpperLetter', preferredLanguage);
             default: return type;
         }
    };

    // Return null if list is empty (parent handles empty message)
    if (components.length === 0) {
        return null;
    }

    console.log("Rendering ComponentList"); // Add console log for debugging renders

    return (
        // Wrap in div for border and overflow
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                         {/* Use translated headers */}
                        <TableHead>{t('componentNameLabel', preferredLanguage)}</TableHead>
                        <TableHead>{t('componentDescriptionLabel', preferredLanguage)}</TableHead>
                        <TableHead>{t('componentIndexTypeLabel', preferredLanguage)}</TableHead>
                        <TableHead className='text-center w-[100px]'>{t('componentElementsCountLabel', preferredLanguage)}</TableHead>
                        {/* Actions column header always present, content conditional */}
                        <TableHead className="text-right w-[150px]">{t('actionsLabel', preferredLanguage)}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {components.map((component) => (
                        <TableRow
                            key={component.signatureComponentId}
                            onClick={() => handleRowClick(component)}
                            // Apply styles for hover and cursor, removed selection highlight
                            className={cn(
                                "cursor-pointer hover:bg-muted/50 transition-colors"
                            )}
                        >
                            <TableCell className="font-medium flex items-center gap-2">
                                <FolderOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                                {component.name}
                            </TableCell>
                             {/* Use translated placeholder */}
                             <TableCell className='text-sm text-muted-foreground max-w-xs truncate' title={component.description || ''}>
                                {component.description || <i className='not-italic'>{t('noDescription', preferredLanguage)}</i>} {/* TODO: Add noDescription */}
                            </TableCell>
                            <TableCell><Badge variant="outline">{getIndexTypeLabel(component.index_type)}</Badge></TableCell>
                            <TableCell className="text-center">{component.index_count ?? 0}</TableCell>
                            <TableCell className="text-right space-x-1">
                                {isAdmin ? (
                                    <>
                                         {/* Use translated titles */}
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onReindex(component.signatureComponentId!); }} title={t('reindexElementsButtonTooltip', preferredLanguage)}>
                                            <ListRestart className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(component); }} title={t('editComponentButtonTooltip', preferredLanguage)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(component.signatureComponentId!); }} title={t('deleteComponentButtonTooltip', preferredLanguage)}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </>
                                ) : (
                                     // Use translated read-only text
                                    <span className="text-xs text-muted-foreground italic">{t('readOnly', preferredLanguage)}</span> // TODO: Add readOnly
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
});

ComponentList.displayName = 'ComponentList';

export default ComponentList;