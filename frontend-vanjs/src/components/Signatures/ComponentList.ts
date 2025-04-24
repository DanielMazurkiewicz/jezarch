import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import themeVars
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";

const { div, span, i } = van.tags;

// --- Styles ---
const listContainerStyle = style([styles.border, styles.roundedLg, styles.overflowHidden]);
const clickableRowStyle = style([styles.cursorPointer, {
     ':hover': { backgroundColor: themeVars.color.muted } // Use theme var
}]);
const nameCellStyle = style([styles.fontMedium, styles.flex, styles.itemsCenter, styles.gap2]);
const descCellStyle = style([styles.textSm, styles.textMutedForeground, styles.truncate, { maxWidth: '20rem' }]); // max-w-xs approx
const actionCellStyle = style([styles.textRight, styles.spaceX1]); // Added spaceX1

// --- Helper ---
const indexTypeLabels: Record<string, string> = {
    dec: 'Decimal (1, 2)',
    roman: 'Roman (I, II)',
    small_char: 'Letters (a, b)',
    capital_char: 'Capital Letters (A, B)'
};

// --- Component Props ---
interface ComponentListProps {
    components: SignatureComponent[]; // Expect plain array
    onEdit: (component: SignatureComponent) => void;
    onDelete: (componentId: number) => void;
    onOpen: (component: SignatureComponent) => void;
    onReindex: (componentId: number) => void;
}

// --- Component ---
const ComponentList = ({ components, onEdit, onDelete, onOpen, onReindex }: ComponentListProps) => {
    const { user } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    if (components.length === 0) {
        return null; // Parent handles empty message
    }

    return div({ class: listContainerStyle },
        Table(
            TableHeader(
                TableRow(
                    TableHead("Name"),
                    TableHead("Description"),
                    TableHead("Index Type"),
                    TableHead({ class: `${styles.textCenter} w-[100px]` }, "Elements"),
                    () => isAdmin.val ? TableHead({ class: `${actionCellStyle} w-[150px]` }, "Actions") : null // Conditionally render header
                )
            ),
            TableBody(
                components.map((component) =>
                    TableRow({
                        key: component.signatureComponentId,
                        class: clickableRowStyle,
                        onclick: () => onOpen(component), // Open on row click
                        },
                        TableCell({ class: nameCellStyle },
                            icons.FolderOpenIcon({ class: `${styles.h4} ${styles.w4} ${styles.textMutedForeground} ${styles.flexShrink0}` }), // Pass class
                            component.name
                        ),
                        TableCell({ class: descCellStyle, title: component.description || '' },
                            component.description || i({ class: styles.notItalic }, "None")
                        ),
                        TableCell(Badge({ variant: "outline" }, indexTypeLabels[component.index_type] || component.index_type)),
                        TableCell({ class: styles.textCenter }, component.index_count ?? 0),
                        // Actions Cell (Conditionally rendered)
                        () => isAdmin.val ? TableCell({ class: actionCellStyle },
                             // Use stopPropagation on button clicks to prevent row click handler
                            Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onReindex(component.signatureComponentId!); }, title: "Re-index Elements" },
                                icons.ListRestartIcon({ class: `${styles.h4} ${styles.w4}` }) // Pass class
                            ),
                            Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onEdit(component); }, title: "Edit Component" },
                                icons.EditIcon({ class: `${styles.h4} ${styles.w4}` }) // Pass class
                            ),
                            Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onDelete(component.signatureComponentId!); }, title: "Delete Component" },
                                icons.Trash2Icon({ class: `${styles.h4} ${styles.w4} ${styles.textDestructive}` }) // Pass class
                            )
                        ) : TableCell({}, '') // Render empty cell if not admin to maintain column structure (pass empty props and empty child)
                    ) // End TableRow
                ) // End map
            ) // End TableBody
        ) // End Table
    ); // End Container Div
};

export default ComponentList;
