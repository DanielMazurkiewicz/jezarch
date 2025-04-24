import { Component, For, Show } from 'solid-js';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/shared/Icon';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { useAuth } from '@/context/AuthContext';
import { formatDate } from '@/lib/utils'; // Import date formatter
import styles from './NoteList.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface NoteListProps {
    notes: NoteWithDetails[];
    onEdit: (note: NoteWithDetails) => void;
    onDelete: (noteId: number) => void;
    onPreview: (note: NoteWithDetails) => void;
}

const NoteList: Component<NoteListProps> = (props) => {
    const [authState] = useAuth();
    const isAdmin = () => authState.user?.role === 'admin';
    const currentUserId = () => authState.user?.userId;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead style={{ width: '150px' }}>Author</TableHead>
                    <TableHead style={{ width: '120px' }}>Modified</TableHead>
                    <TableHead style={{ width: '100px' }}>Status</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead class={styles.actionsCell}>Actions</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                <For each={props.notes}>
                    {(note) => {
                        const isOwner = () => note.ownerUserId === currentUserId();
                        const canDelete = () => isOwner() || isAdmin();
                        // Edit is allowed if owner or if note is shared (backend verifies further)
                        const canEdit = () => isOwner() || note.shared;

                        return (
                            <TableRow>
                                <TableCell
                                    class={styles.noteTitleCell}
                                    onClick={() => props.onPreview(note)}
                                    title={`Preview "${note.title}"`}
                                >
                                    {note.title}
                                </TableCell>
                                <TableCell class={styles.authorCell} title={note.ownerLogin}>
                                    {/* Use a conditional color based on ownership */}
                                    <Icon name="User" class={styles.authorIcon} style={{ color: isOwner() ? 'var(--color-primary)' : undefined }} />
                                    <span class={isOwner() ? styles.ownerText : undefined}>
                                        {note.ownerLogin ?? 'Unknown'}
                                    </span>
                                </TableCell>
                                <TableCell>{formatDate(note.modifiedOn)}</TableCell>
                                <TableCell>
                                    {note.shared
                                        ? <Badge variant="outline">Shared</Badge>
                                        : <Badge variant="secondary">Private</Badge>
                                    }
                                </TableCell>
                                <TableCell class={styles.tagsCell}>
                                    <div class={styles.tagsContainer}>
                                        <For each={note.tags?.slice(0, 3)}>
                                            {(tag) => <Badge variant='secondary'>{tag.name}</Badge>}
                                        </For>
                                        <Show when={(note.tags?.length ?? 0) > 3}>
                                            <Badge variant='outline'>+{(note.tags?.length ?? 0) - 3} more</Badge>
                                        </Show>
                                        <Show when={!note.tags || note.tags.length === 0}>
                                            <span class={styles.noTagsText}>No tags</span>
                                        </Show>
                                    </div>
                                </TableCell>
                                <TableCell class={styles.actionsCell}>
                                     <Show when={canEdit()} fallback={<span class={styles.readOnlyText}>Read-only</span>}>
                                        <Button variant="ghost" size="icon" onClick={() => props.onEdit(note)} title="Edit Note">
                                            <Icon name="Edit" size="1rem" />
                                        </Button>
                                        <Show when={canDelete()}>
                                            <Button variant="ghost" size="icon" onClick={() => props.onDelete(note.noteId!)} title="Delete Note">
                                                <Icon name="Trash2" size="1rem" class={styles.textDestructive} />
                                            </Button>
                                        </Show>
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

export default NoteList;