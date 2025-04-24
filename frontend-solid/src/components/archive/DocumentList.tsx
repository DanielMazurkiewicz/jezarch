import { Component, For, Show } from 'solid-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/shared/Icon';
import type { ArchiveDocument, ArchiveDocumentSearchResult } from '../../../../backend/src/functionalities/archive/document/models';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import styles from './DocumentList.module.css'; // Import CSS Module (Typed)

interface DocumentListProps {
    documents: ArchiveDocumentSearchResult[];
    onEdit: (doc: ArchiveDocument) => void;
    onDisable: (docId: number) => void;
    onPreview: (doc: ArchiveDocumentSearchResult) => void;
    onOpenUnit: (doc: ArchiveDocumentSearchResult) => void;
}

// Type assertion helper if needed (backend types might be out of sync)
type DocWithResolved = ArchiveDocumentSearchResult & {
    resolvedTopographicSignatures?: string[];
    resolvedDescriptiveSignatures?: string[];
};

const DocumentList: Component<DocumentListProps> = (props) => {
    const [authState] = useAuth();
    const currentUserId = () => authState.user?.userId;
    const isAdmin = () => authState.user?.role === 'admin';

    const canModify = (docOwnerId: number) => {
        return isAdmin() || currentUserId() === docOwnerId;
    };

    const handleClick = (doc: ArchiveDocumentSearchResult) => {
        if (doc.type === 'unit') {
            props.onOpenUnit(doc);
        } else {
            props.onPreview(doc); // Default to preview for documents
        }
    };

    return (
        // No outer div needed, Table handles its container
        <Table class={styles.documentListTable}>
            <TableHeader>
                <TableRow>
                    <TableHead class={styles.typeIconCell}>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Topographic Sig</TableHead>
                    <TableHead>Descriptive Sig</TableHead>
                    <TableHead class={cn(styles.actionsCell, styles.documentActionsCell)}>Actions</TableHead> {/* Combine styles */}
                </TableRow>
            </TableHeader>
            <TableBody>
                <For each={props.documents}>
                    {(doc) => {
                        const isUnit = doc.type === 'unit';
                        const isOwnerOrAdmin = () => canModify(doc.ownerUserId);
                        // Cast for potentially resolved signatures (use optional chaining)
                        const docResolved = doc as DocWithResolved;

                        return (
                            <TableRow
                                onClick={() => handleClick(doc)}
                                class={styles.clickableRow}
                                title={isUnit ? `Open Unit "${doc.title}"` : `Preview Document "${doc.title}"`}
                            >
                                <TableCell class={styles.typeIconCell}>
                                    <Icon
                                        name={isUnit ? 'Folder' : 'FileText'}
                                        class={styles.typeIcon}
                                        style={{ color: isUnit ? 'var(--color-primary)' : 'hsl(145 63% 40%)' }} // Use CSS variable or HSL
                                    />
                                </TableCell>
                                <TableCell class={styles.documentTitleCell}>{doc.title}</TableCell>
                                <TableCell class={styles.mutedTextCell}>{doc.creator}</TableCell>
                                <TableCell class={styles.mutedTextCell}>{doc.creationDate}</TableCell>
                                <TableCell class={styles.signatureCell} title={docResolved.resolvedTopographicSignatures?.[0] || ''}>
                                    {docResolved.resolvedTopographicSignatures?.[0] || <i class={styles.noSignatureText}>None</i>}
                                </TableCell>
                                <TableCell class={styles.signatureCell} title={docResolved.resolvedDescriptiveSignatures?.[0] || ''}>
                                     {docResolved.resolvedDescriptiveSignatures?.[0] || <i class={styles.noSignatureText}>None</i>}
                                </TableCell>
                                <TableCell class={cn(styles.actionsCell, styles.documentActionsCell)}> {/* Combine styles */}
                                     {/* Preview Button (only for documents) */}
                                     <Show when={!isUnit}>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onPreview(doc); }} title="Preview Document">
                                            <Icon name="Eye" size="1rem" />
                                        </Button>
                                    </Show>
                                    {/* Edit/Disable Buttons (if permissions allow) */}
                                    <Show when={isOwnerOrAdmin()}
                                        fallback={<span class={styles.readOnlyText}>Read-only</span>}
                                    >
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onEdit(doc as ArchiveDocument); }} title="Edit Item">
                                            <Icon name="Edit" size="1rem" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); props.onDisable(doc.archiveDocumentId!); }} title="Disable Item">
                                            <Icon name="Trash2" size="1rem" class={styles.textDestructive} /> {/* Use utility class */}
                                        </Button>
                                    </Show>
                                </TableCell>
                            </TableRow>
                        );
                    }}
                </For>
            </TableBody>
        </Table>
    );
};

export default DocumentList;