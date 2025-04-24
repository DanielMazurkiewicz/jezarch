import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge"; // Use Badge for displaying parents? (Optional)
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { SignatureElement, SignatureElementSearchResult } from "../../../../backend/src/functionalities/signature/element/models";

const { div, span, i } = van.tags;

// --- Styles ---
const listContainerStyle = style([styles.border, styles.roundedLg, styles.overflowHidden]);
const indexCellStyle = style([styles.fontMono, styles.textCenter, styles.textSm]);
const descCellStyle = style([styles.textSm, styles.textMutedForeground, styles.truncate, { maxWidth: '20rem' }]); // max-w-xs approx
const actionCellStyle = style([styles.textRight, styles.spaceX1]); // Added spaceX1
// Optional styles for parent badges
const parentBadgeContainerStyle = style([styles.flex, styles.flexWrap, styles.gap1]);
const parentBadgeStyle = style([styles.textXs, styles.fontNormal]);


// --- Component Props ---
interface ElementListProps {
    elements: SignatureElementSearchResult[]; // Expect plain array with parents resolved
    onEdit: (element: SignatureElement) => void; // Pass base type for editing simplicity if form needs it
    onDelete: (elementId: number) => void;
}

// --- Component ---
const ElementList = ({ elements, onEdit, onDelete }: ElementListProps) => {
    const { user } = authStore;
    // Allow modification by default, or restrict based on role if needed
    const canModify = van.derive(() => user.val?.role === 'admin' || true);

    if (elements.length === 0) {
        return null; // Parent handles empty message
    }

    console.log("Rendering ElementList with elements:", elements); // Debug log

    return div({ class: listContainerStyle },
        Table(
            TableHeader(
                TableRow(
                    TableHead({ class: `w-[80px] ${styles.textCenter}` }, "Index"),
                    TableHead("Name"),
                    TableHead("Description"),
                    // Optionally add Parents column back if needed
                    // TableHead("Parents"),
                    () => canModify.val ? TableHead({ class: `${actionCellStyle} w-[100px]` }, "Actions") : null
                )
            ),
            TableBody(
                elements.map((element) =>
                    TableRow({ key: element.signatureElementId },
                        TableCell({ class: indexCellStyle },
                            element.index || i({ class: styles.notItalic }, "Auto")
                        ),
                        TableCell({ class: styles.fontMedium }, element.name),
                        TableCell({ class: descCellStyle, title: element.description || '' },
                            element.description || i({ class: styles.notItalic }, "None")
                        ),
                        // Removed Parent Cell - info might be shown in a detail view/modal instead
                        // TableCell({ class: parentBadgeContainerStyle },
                        //     element.parentNames && element.parentNames.length > 0
                        //         ? element.parentNames.map((name, idx) => Badge({ key: idx, variant: "secondary", class: parentBadgeStyle }, name))
                        //         : i({ class: `${styles.notItalic} ${styles.textXs}` }, "None")
                        // ),
                        // Actions Cell (Conditionally rendered)
                        () => canModify.val ? TableCell({ class: actionCellStyle },
                            Button({ variant: "ghost", size: "icon", onclick: () => onEdit(element), title: "Edit Element" },
                                icons.EditIcon({ class: `${styles.h4} ${styles.w4}` }) // Pass class
                            ),
                            Button({ variant: "ghost", size: "icon", onclick: () => onDelete(element.signatureElementId!), title: "Delete Element" },
                                icons.Trash2Icon({ class: `${styles.h4} ${styles.w4} ${styles.textDestructive}` }) // Pass class
                            )
                        ) : TableCell({}, '') // Pass empty props and child for empty cell
                    ) // End TableRow
                ) // End map
            ) // End TableBody
        ) // End Table
    ); // End Container Div
};

export default ElementList;