import van, { State } from "vanjs-core"; // Import State
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
// Use simple div for scroll area, style it
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { NoteWithDetails } from "../../../../backend/src/functionalities/note/models";

const { div, pre, span } = van.tags; // Added span

// --- Minimal Type Definitions ---
type PropValue = string | number | boolean | null | undefined | Function | object;
type PropValueOrDerived = PropValue | State<PropValue>;
interface VanTag<ElementType extends Element = HTMLElement> {
    [key: string]: PropValueOrDerived | any;
    class?: PropValueOrDerived;
    style?: PropValueOrDerived;
}

// --- Styles ---
const scrollAreaStyle = style([
    styles.maxH60vh, // max-h-[60vh] approx
    styles.overflowYAuto,
    styles.my4, // margin top/bottom
    styles.pr3, // padding right for scrollbar space
    styles.borderT, // Add borders
    styles.borderB,
    styles.py4, // Padding inside scroll area
]);

const contentStyle = style([
    styles.textSm,
    styles.whitespacePreWrap, // Preserve whitespace
    // fontFamily: styles.fontMono, // Removed fontFamily access
    // Use string directly if needed:
    { fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }
]);

const tagContainerStyle = style([styles.flex, styles.flexWrap, styles.gap1, styles.pt2]);
const tagBadgeStyle = style([styles.textXs, styles.fontNormal]);

// --- Helper --- (Copied from NoteList)
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) { return "Error"; }
};

// --- Component Props ---
interface NotePreviewDialogProps {
    isOpen: State<boolean>; // Expect VanJS state
    onOpenChange: (isOpen: boolean) => void; // Callback to update state
    note: NoteWithDetails | null; // Plain object is fine
}

// --- Component ---
const NotePreviewDialog = ({ isOpen, onOpenChange, note }: NotePreviewDialogProps) => {

    // This component doesn't render anything if note is null,
    // but we derive the content reactively based on the note prop.
    return Dialog({ open: isOpen, onOpenChange: onOpenChange }, // Bind state
        // Conditionally render DialogContent inside function based on isOpen state value AND note
        () => (isOpen.val && note) ? DialogContent({}, // Pass empty props if no class needed
            DialogHeader(
                DialogTitle(note.title),
                DialogDescription(
                    `By ${note.ownerLogin ?? 'Unknown'} on ${formatDate(note.createdOn)}`,
                    note.shared ? Badge({ variant: "outline", class: styles.ml2 }, "Shared") : null // ml-2 for spacing
                ),
                // Display Tags
                (note.tags && note.tags.length > 0) ? div({ class: tagContainerStyle },
                    note.tags.map(tag =>
                        Badge({ key: tag.tagId, variant: "secondary", class: tagBadgeStyle }, tag.name)
                    )
                ) : null
            ),
            // Scrollable content area
            div({ class: scrollAreaStyle },
                pre({ class: contentStyle }, note.content || span({ class: styles.italic }, "No content."))
            ),
            DialogFooter(
                Button({ variant: "outline", onclick: () => onOpenChange(false) }, "Close")
                // Optional Edit Button Placeholder
                // Button({ onclick: () => { onOpenChange(false); /* call edit handler */ } }, "Edit")
            )
        ) : null // Render nothing if not open or no note
    );
};

export default NotePreviewDialog;