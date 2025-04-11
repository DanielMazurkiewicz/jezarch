import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ListRestart } from 'lucide-react';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface ComponentListProps {
    components: SignatureComponent[];
    selectedComponentId: number | null;
    onEdit: (component: SignatureComponent) => void;
    onDelete: (componentId: number) => void;
    onSelect: (component: SignatureComponent | null) => void; // Allow deselection
    onReindex: (componentId: number) => void;
}

const ComponentList: React.FC<ComponentListProps> = ({
    components, selectedComponentId, onEdit, onDelete, onSelect, onReindex
}) => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // Handle row click for selection/deselection
    const handleRowClick = (component: SignatureComponent) => {
        if (selectedComponentId === component.signatureComponentId) {
            onSelect(null); // Deselect if clicking the already selected row
        } else {
            onSelect(component); // Select the clicked row
        }
    };

    // Map index types to readable labels
    const indexTypeLabels: Record<string, string> = {
        dec: 'Decimal (1, 2)',
        roman: 'Roman (I, II)',
        small_char: 'Letters (a, b)',
        capital_char: 'Capital Letters (A, B)'
    };

    // Return null if list is empty (parent handles empty message)
    if (components.length === 0) {
        return null;
    }

    return (
        // Wrap in div for border and overflow
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Index Type</TableHead>
                        {/* Header for element count */}
                        <TableHead className='text-center w-[100px]'>Elements</TableHead>
                        {/* Actions column header always present, content conditional */}
                        <TableHead className="text-right w-[150px]">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {components.map((component) => (
                        <TableRow
                            key={component.signatureComponentId}
                            onClick={() => handleRowClick(component)}
                            // Apply styles for hover, selection, and cursor
                            className={cn(
                                "cursor-pointer hover:bg-muted/50 transition-colors",
                                selectedComponentId === component.signatureComponentId && "bg-muted hover:bg-muted" // Highlight selected row
                            )}
                            aria-selected={selectedComponentId === component.signatureComponentId}
                        >
                            <TableCell className="font-medium">{component.name}</TableCell>
                            {/* Truncate description, show placeholder */}
                            <TableCell className='text-sm text-muted-foreground max-w-xs truncate' title={component.description || ''}>
                                {component.description || <i className='not-italic'>None</i>}
                            </TableCell>
                            {/* Display index type as a badge */}
                            <TableCell><Badge variant="outline">{indexTypeLabels[component.index_type] || component.index_type}</Badge></TableCell>
                            {/* Display element count */}
                            <TableCell className="text-center">{component.index_count ?? 0}</TableCell>
                            {/* Actions Cell always present, content conditional */}
                            <TableCell className="text-right space-x-1">
                                {isAdmin ? (
                                    // Use fragment for admin buttons
                                    <>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onReindex(component.signatureComponentId!); }} title="Re-index Elements">
                                            <ListRestart className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(component); }} title="Edit Component">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(component.signatureComponentId!); }} title="Delete Component">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </>
                                ) : (
                                    // Render nothing or a placeholder if not admin
                                    // Using null is fine here, or a placeholder span if preferred for layout consistency
                                    null
                                    // Example placeholder: <span className="text-xs text-muted-foreground italic">No actions</span>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default ComponentList;