import { Component, Show, For } from 'solid-js'; // Added For
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { formatDate } from '@/lib/utils';
import styles from './NotePreviewDialog.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

interface NotePreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    note: NoteWithDetails | null;
    // onEdit?: (note: NoteWithDetails) => void; // Optional edit callback
}

const NotePreviewDialog: Component<NotePreviewDialogProps> = (props) => {

    return (
        // Dialog manages its own open state via props.isOpen and props.onOpenChange
        <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
            {/* Content only renders when props.note is available */}
            <Show when={props.note}>
                {(note) => ( // note() is the accessor
                    <DialogContent class={styles.previewDialogContent} size="md">
                        <DialogHeader class={styles.previewDialogHeader}>
                            <DialogTitle class={styles.previewDialogTitle}>{note().title}</DialogTitle>
                            <DialogDescription class={styles.previewDialogDescription}>
                                By {note().ownerLogin ?? 'Unknown'} on {formatDate(note().createdOn)}
                                <Show when={note().shared}>
                                     <Badge variant="outline" style={{ "margin-left": '0.5rem' }}>Shared</Badge>
                                </Show>
                            </DialogDescription>
                             {/* Display Tags */}
                            <Show when={note().tags && note().tags!.length > 0}>
                                <div class={styles.tagsContainer}>
                                    <For each={note().tags}>
                                        {(tag) => <Badge variant="secondary">{tag.name}</Badge>}
                                    </For>
                                </div>
                            </Show>
                        </DialogHeader>

                         {/* Scrollable Content */}
                         <DialogBody> {/* Wrap content in DialogBody */}
                            <pre class={styles.noteContent}>
                                {note().content || <i class={styles.noContentText}>No content.</i>}
                            </pre>
                         </DialogBody>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => props.onOpenChange(false)}>Close</Button>
                             {/* Optional Edit Button */}
                             {/* <Show when={props.onEdit}>
                                 <Button onClick={() => { props.onOpenChange(false); props.onEdit!(note()); }}>Edit</Button>
                             </Show> */}
                        </DialogFooter>
                    </DialogContent>
                )}
            </Show>
        </Dialog>
    );
};

export default NotePreviewDialog;