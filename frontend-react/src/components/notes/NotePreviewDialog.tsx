import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { t } from '@/translations/utils'; // Import translation utility
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to get language

interface NotePreviewDialogProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    note: NoteWithDetails | null;
}

// --- Date Formatter (Copied from NotesPage) ---
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) {
            console.error("formatDate received invalid date input:", dateInput);
            return "Invalid Date";
        }
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Error";
    }
};
// ------------------------------------------------

const NotePreviewDialog: React.FC<NotePreviewDialogProps> = ({
    isOpen,
    onOpenChange,
    note: previewingNote, // Renamed for clarity
}) => {
    const { preferredLanguage } = useAuth(); // Get preferredLanguage

    if (!previewingNote) {
        return null;
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{previewingNote.title}</DialogTitle>
                     {/* TODO: Translate "By", "on" */}
                    <DialogDescription>
                        By {previewingNote.ownerLogin ?? 'Unknown'} on {formatDate(previewingNote.createdOn)}
                         {/* TODO: Translate badge text */}
                        {previewingNote.shared ? <Badge variant="outline" className='ml-2'>Shared</Badge> : null}
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
                <ScrollArea className="max-h-[60vh] my-4">
                    {/* Use pre-wrap to preserve whitespace and line breaks */}
                    <pre className="text-sm whitespace-pre-wrap font-sans p-1">
                         {/* TODO: Translate placeholder */}
                       {previewingNote.content || <i className="text-muted-foreground">No content.</i>}
                    </pre>
                </ScrollArea>
                <DialogFooter>
                     {/* Use translated button text */}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>{t('closeButton', preferredLanguage)}</Button>
                    {/* Optional: Add Edit button here if needed */}
                    {/* <Button onClick={() => { onOpenChange(false); onEdit(previewingNote); }}>Edit</Button> */}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default NotePreviewDialog;