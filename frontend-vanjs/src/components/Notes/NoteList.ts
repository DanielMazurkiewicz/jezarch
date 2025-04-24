import van, { State } from "vanjs-core"; // Import State
import { authStore } from "@/state/authStore";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge"; // Assuming Badge component exists
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import themeVars
import type { NoteWithDetails } from "../../../../backend/src/functionalities/note/models";

const { div, span } = van.tags;

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const clickableCellStyle = style([styles.cursorPointer, { ':hover': { color: themeVars.color.primary, textDecoration: 'underline' } }]);
const authorCellStyle = style([styles.flex, styles.itemsCenter, styles.gap1]);
const tagContainerStyle = style([styles.flex, styles.flexWrap, styles.gap1, { maxWidth: '200px' }]);
const tagBadgeStyle = style([styles.textXs, styles.fontNormal]);
const actionCellStyle = style([styles.textRight, styles.spaceX1]);

// --- Helper ---
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString();
    } catch (e) { return "Error"; }
};

// --- Component Props ---
interface NoteListProps {
    notes: NoteWithDetails[]; // Expect plain array
    onEdit: (note: NoteWithDetails) => void;
    onDelete: (noteId: number) => void;
    onPreview: (note: NoteWithDetails) => void;
}

// --- Component ---
const NoteList = ({ notes, onEdit, onDelete, onPreview }: NoteListProps) => {
    const { user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    if (notes.length === 0) {
        return null; // Parent handles empty state
    }

    return Table(
        TableHeader(
            TableRow(
                TableHead("Title"),
                TableHead({ class: "w-[150px]" }, "Author"),
                TableHead({ class: "w-[120px]" }, "Modified"),
                TableHead({ class: "w-[100px]" }, "Status"),
                TableHead("Tags"),
                TableHead({ class: actionCellStyle }, "Actions")
            )
        ),
        TableBody(
            notes.map((note) => {
                // Derive states needed within the loop
                const isOwner = van.derive(() => note.ownerUserId === user.val?.userId);
                const canDelete = van.derive(() => isOwner.val || isAdmin.val);

                return TableRow({ key: note.noteId },
                    TableCell({
                        class: `${styles.fontMedium} ${clickableCellStyle}`,
                        onclick: () => onPreview(note),
                        title: `Click to preview "${note.title}"`
                    }, note.title),
                    TableCell({ class: styles.textSm }, // Author
                        div({ class: authorCellStyle, title: note.ownerLogin ?? 'Unknown' },
                            () => isOwner.val // Reactive icon based on ownership
                                ? icons.UserIcon({ class: `${styles.h3} ${styles.w3} ${styles.textPrimary}` })
                                : icons.UserIcon({ class: `${styles.h3} ${styles.w3} ${styles.textMutedForeground}` }),
                            span({ class: () => isOwner.val ? styles.fontMedium : styles.textMutedForeground }, note.ownerLogin ?? 'Unknown')
                        )
                    ),
                    TableCell({ class: styles.textSm }, formatDate(note.modifiedOn)),
                    TableCell( // Status Badge
                        note.shared ? Badge({ variant: "outline" }, "Shared") : Badge({ variant: "secondary" }, "Private")
                    ),
                    TableCell( // Tags
                        div({ class: tagContainerStyle },
                            (note.tags?.slice(0, 3) ?? []).map(tag =>
                                Badge({ key: tag.tagId, variant: 'secondary', class: tagBadgeStyle }, tag.name)
                            ),
                            (note.tags?.length ?? 0) > 3 && Badge({ variant: 'outline', class: tagBadgeStyle }, `+${note.tags!.length - 3} more`),
                            (!note.tags || note.tags.length === 0) && span({ class: `${styles.textXs} ${styles.italic} ${styles.textMutedForeground}` }, 'No tags')
                        )
                    ),
                    TableCell({ class: actionCellStyle }, // Actions
                        Button({ variant: "ghost", size: "icon", onclick: () => onEdit(note), title: "Edit Note" },
                            icons.EditIcon({ class: `${styles.h4} ${styles.w4}` })
                        ),
                        // Conditionally render delete button based on derived state
                        () => canDelete.val ? Button({ variant: "ghost", size: "icon", onclick: () => onDelete(note.noteId!), title: "Delete Note" },
                            icons.Trash2Icon({ class: `${styles.h4} ${styles.w4} ${styles.textDestructive}` })
                        ) : span({ class: `${styles.inlineBlock} ${styles.w9} ${styles.h9}` }) // Placeholder for alignment
                    )
                ); // End TableRow
            }) // End map
        ) // End TableBody
    ); // End Table
};

export default NoteList;