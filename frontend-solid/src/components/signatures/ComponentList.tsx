import { Component, For, Show } from 'solid-js';
import { useNavigate } from '@solidjs/router';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/shared/Icon';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { useAuth } from '@/context/AuthContext';
import styles from './ComponentList.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface ComponentListProps {
    components: SignatureComponent[];
    onEdit: (component: SignatureComponent) => void;
    onDelete: (componentId: number) => void;
    onReindex: (componentId: number) => void;
}

const ComponentList: Component<ComponentListProps> = (props) => {
    const [authState] = useAuth();
    const navigate = useNavigate();
    const isAdmin = () => authState.user?.role === 'admin';

    const handleRowClick = (component: SignatureComponent) => {
        navigate(`/signatures/${component.signatureComponentId}/elements`);
    };

    // Map index types to readable labels
    const indexTypeLabels: Record<string, string> = {
        dec: 'Decimal (1, 2)',
        roman: 'Roman (I, II)',
        small_char: 'Letters (a, b)',
        capital_char: 'Capitals (A, B)' // Shortened for space
    };

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Index Type</TableHead>
                    <TableHead class={styles.indexCountCell}>Elements</TableHead>
                    {/* Actions only shown to admin */}
                    <TableHead class={styles.actionsCell}>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <For each={props.components}>
                    {(component) => (
                        <TableRow
                            onClick={() => handleRowClick(component)}
                            class={styles.clickableRow}
                            title={`Open elements for "${component.name}"`}
                        >
                            <TableCell class={styles.componentNameCell}>
                                <Icon name="Folder" class={styles.componentIcon} />
                                {component.name}
                            </TableCell>
                            <TableCell class={styles.descriptionCell} title={component.description || ''}>
                                <span class={!component.description ? styles.noDescriptionText : undefined}>
                                    {component.description || 'None'}
                                </span>
                            </TableCell>
                            <TableCell><Badge variant="outline">{indexTypeLabels[component.index_type] || component.index_type}</Badge></TableCell>
                            <TableCell class={styles.indexCountCell}>{component.index_count ?? 0}</TableCell>
                            <TableCell class={styles.actionsCell}>
                                <Show when={isAdmin()} fallback={<span class={styles.readOnlyText}>Read-only</span>}>
                                     <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onReindex(component.signatureComponentId!); }} title="Re-index Elements">
                                        <Icon name="ListRestart" size="1rem" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onEdit(component); }} title="Edit Component">
                                        <Icon name="Edit" size="1rem" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onDelete(component.signatureComponentId!); }} title="Delete Component">
                                        <Icon name="Trash2" size="1rem" class={styles.textDestructive} />
                                    </Button>
                                </Show>
                            </TableCell>
                        </TableRow>
                    )}
                </For>
            </TableBody>
        </Table>
    );
};

export default ComponentList;