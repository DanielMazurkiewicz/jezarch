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

    const handleRowClick = (component: SignatureComponent) => {
        if (selectedComponentId === component.signatureComponentId) {
            onSelect(null); // Deselect if clicking the selected one again
        } else {
            onSelect(component);
        }
    };

    const indexTypeLabels: Record<string, string> = {
        dec: 'Decimal (1, 2)',
        roman: 'Roman (I, II)',
        small_char: 'Letters (a, b)',
        capital_char: 'Capital Letters (A, B)'
    };

    if (components.length === 0) {
        return <p className="text-muted-foreground text-center">No components found. {isAdmin ? "Create one!" : ""}</p>;
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Index Type</TableHead>
                        <TableHead>Element Count</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {components.map((component) => (
                        <TableRow
                            key={component.signatureComponentId}
                            onClick={() => handleRowClick(component)}
                            className={cn(
                                "cursor-pointer hover:bg-muted/50",
                                selectedComponentId === component.signatureComponentId && "bg-muted"
                            )}
                        >
                            <TableCell className="font-medium">{component.name}</TableCell>
                            <TableCell className='text-sm text-muted-foreground'>{component.description || <i>None</i>}</TableCell>
                            <TableCell><Badge variant="outline">{indexTypeLabels[component.index_type] || component.index_type}</Badge></TableCell>
                            <TableCell className="text-center">{component.index_count}</TableCell>
                            {isAdmin && (
                                <TableCell className="text-right space-x-1">
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onReindex(component.signatureComponentId!); }} title="Re-index Elements">
                                        <ListRestart className="h-4 w-4" />
                                     </Button>
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onEdit(component); }} title="Edit Component">
                                        <Edit className="h-4 w-4" />
                                     </Button>
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(component.signatureComponentId!); }} title="Delete Component">
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

export default ComponentList;