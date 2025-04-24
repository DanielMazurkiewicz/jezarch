import { Component, For, Show } from 'solid-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/shared/Icon';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import { useAuth } from '@/context/AuthContext';
import styles from './ElementList.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface ElementListProps {
    elements: SignatureElementSearchResult[];
    onEdit: (element: SignatureElement) => void; // Pass base type for editing
    onDelete: (elementId: number) => void;
}

const ElementList: Component<ElementListProps> = (props) => {
    const [authState] = useAuth();
    // Assume only admin can modify signature structure
    const isAdmin = () => authState.user?.role === 'admin';

    return (
        <Table class={styles.elementListTable}>
            <TableHeader>
                <TableRow>
                    <TableHead style={{ width: '80px', "text-align": 'center' }}>Index</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    {/* Actions only shown to admin */}
                    <TableHead class={styles.actionsCell}>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <For each={props.elements}>
                    {(element) => (
                        <TableRow>
                            <TableCell class={styles.indexCell}>
                                {element.index || <i class={styles.indexAutoText}>Auto</i>}
                            </TableCell>
                            <TableCell class="font-medium">{element.name}</TableCell>
                            <TableCell class={styles.descriptionCell} title={element.description || ''}>
                                <span class={!element.description ? styles.noDescriptionText : undefined}>
                                    {element.description || 'None'}
                                </span>
                            </TableCell>
                            <TableCell class={styles.actionsCell}>
                                <Show when={isAdmin()} fallback={<span class={styles.readOnlyText}>Read-only</span>}>
                                    {/* Ensure the full element is passed to onEdit */}
                                    <Button variant="ghost" size="icon" onClick={() => props.onEdit(element as SignatureElement)} title="Edit Element">
                                        <Icon name="Edit" size="1rem" />
                                    </Button>
                                    <Button variant="ghost" size="icon" onClick={() => props.onDelete(element.signatureElementId!)} title="Delete Element">
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

export default ElementList;