import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit, Trash2 } from 'lucide-react';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { t } from '@/translations/utils';
import { useAuth } from '@/hooks/useAuth';

interface NotePreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    note: NoteWithDetails | null;
    onEdit: (note: NoteWithDetails) => void;
    onDelete: (noteId: number) => void;
}

// --- Date Formatter (Copied from NotesPage) ---
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A"; // TODO: Translate N/A if needed
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            console.error("formatDate received invalid date input:", dateInput);
            return "Invalid Date"; // TODO: Translate "Invalid Date"
        }
        // Use locale string for date formatting
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Error"; // TODO: Translate "Error"
    }
};
// ------------------------------------------------

const NotePreviewDialog: React.FC<NotePreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    note: previewingNote,
    onEdit,
    onDelete,
}) => {
    const { user, preferredLanguage } = useAuth();

    if (!previewingNote) {
        return null;
    }

    const isOwner = user?.userId === previewingNote.ownerUserId;
    const isAdmin = user?.role === 'admin';
    const canModify = isOwner || isAdmin;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader className='max-h-[35vh] overflow-y-auto'>
                    <DialogTitle>{previewingNote.title}</DialogTitle>
                    <DialogDescription>
                        {t('notesPreviewBy', preferredLanguage)} {previewingNote.ownerLogin ?? t('unknown', preferredLanguage)} {t('notesPreviewOn', preferredLanguage)} {formatDate(previewingNote.createdOn)}
                        {previewingNote.shared ? <Badge variant="outline" className='ml-2'>{t('notesSharedBadge', preferredLanguage)}</Badge> : null}
                    </DialogDescription>
                    {/* Display Tags */}
                    {previewingNote.tags && previewingNote.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                            {previewingNote.tags.map(tag => (
                                <Badge key={tag.tagId} variant="secondary" className="text-xs font-normal">{tag.name}</Badge>
                            ))}
                        </div>
                    )}
                </DialogHeader>
                {/* Make content scrollable */}
                <ScrollArea type="always" className="min-h-0 flex-1 my-4">
                    {/* Use pre-wrap to preserve whitespace and line breaks */}
                    <pre className="text-sm whitespace-pre-wrap font-sans p-1">
                       {previewingNote.content || <i className="text-muted-foreground">{t('notesNoContentPlaceholder', preferredLanguage)}</i>}
                    </pre>
                </ScrollArea>
                <DialogFooter className='gap-2 sm:justify-between pt-4'>
                    <div>
                        {canModify && (
                            <Button
                                variant="outline"
                                className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive"
                                size="sm"
                                onClick={() => { onOpenChange(false); onDelete(previewingNote.noteId!); }}
                            >
                                <Trash2 className='h-4 w-4 mr-2'/> {t('deleteButton', preferredLanguage)}
                            </Button>
                        )}
                    </div>
                    <div className='flex gap-2'>
                        {canModify && (
                            <Button variant="secondary" size="sm" onClick={() => { onOpenChange(false); onEdit(previewingNote); }}>
                                <Edit className='h-4 w-4 mr-2'/> {t('editButton', preferredLanguage)}
                            </Button>
                        )}
                        <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>{t('closeButton', preferredLanguage)}</Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NotePreviewDialog;