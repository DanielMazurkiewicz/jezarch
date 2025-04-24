import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { Button } from "@/components/ui/Button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/Table";
import { Badge } from "@/components/ui/Badge";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import themeVars
import type { ArchiveDocument, ArchiveDocumentSearchResult } from "../../../../backend/src/functionalities/archive/document/models";

const { div, span, i } = van.tags;

// --- Styles ---
const listContainerStyle = style([styles.border, styles.roundedLg, styles.overflowHidden]);
const clickableRowStyle = style([styles.cursorPointer, {
    ':hover': { backgroundColor: themeVars.color.muted } // Use theme var
}]);
const typeCellStyle = style([styles.textCenter]);
const sigCellStyle = style([styles.fontMono, styles.textXs, styles.truncate, { maxWidth: '200px' }]);
const actionCellStyle = style([styles.textRight, styles.spaceX1, { minWidth: '130px' }]); // Added spaceX1

// --- Component Props ---
interface DocumentListProps {
    documents: ArchiveDocumentSearchResult[]; // Expect plain array with resolved sigs
    onEdit: (doc: ArchiveDocument) => void;
    onDisable: (docId: number) => void;
    onPreview: (doc: ArchiveDocumentSearchResult) => void;
    onOpenUnit: (doc: ArchiveDocumentSearchResult) => void;
}

// --- Component ---
const DocumentList = ({ documents, onEdit, onDisable, onPreview, onOpenUnit }: DocumentListProps) => {
    const { user } = authStore;

    // Derive permission check
    const canModify = (docOwnerId: number) => {
        const currentUser = user.val; // Read state value inside derive/render
        return currentUser?.role === 'admin' || currentUser?.userId === docOwnerId;
    };

    if (documents.length === 0) {
        return null; // Parent handles empty state
    }

    return div({ class: listContainerStyle },
        Table(
            TableHeader(
                TableRow(
                    TableHead({ class: 'w-[50px]' }, "Type"),
                    TableHead("Title"),
                    TableHead("Creator"),
                    TableHead("Date"),
                    TableHead({ class: sigCellStyle }, "Topographic Sig"), // Removed maxWidth access here
                    TableHead({ class: sigCellStyle }, "Descriptive Sig"), // Removed maxWidth access here
                    TableHead({ class: actionCellStyle }, "Actions")
                )
            ),
            TableBody(
                documents.map((doc) => {
                    // Resolve states inside map for each row
                    const isOwnerOrAdmin = van.derive(() => canModify(doc.ownerUserId));
                    const isUnit = doc.type === 'unit';
                    const topoSigDisplay = doc.resolvedTopographicSignatures?.[0] || null;
                    const descSigDisplay = doc.resolvedDescriptiveSignatures?.[0] || null;

                    const handleRowClick = () => {
                        if (isUnit) onOpenUnit(doc); else onPreview(doc);
                    };

                    return TableRow({
                        key: doc.archiveDocumentId,
                        class: clickableRowStyle,
                        onclick: handleRowClick,
                        title: isUnit ? `Open Unit "${doc.title}"` : `Preview Document "${doc.title}"`
                        },
                        TableCell({ class: typeCellStyle },
                            isUnit
                                ? icons.FolderIcon({ class: `${styles.h4} ${styles.w4} text-blue-600 ${styles.inlineBlock}` }) // Added class
                                : icons.FileTextIcon({ class: `${styles.h4} ${styles.w4} text-green-600 ${styles.inlineBlock}` }) // Added class
                        ),
                        TableCell({ class: styles.fontMedium }, doc.title),
                        TableCell({ class: styles.textSm }, doc.creator),
                        TableCell({ class: styles.textSm }, doc.creationDate),
                        TableCell({ class: sigCellStyle, title: topoSigDisplay ?? '' },
                            topoSigDisplay ?? i({ class: `${styles.textMutedForeground} ${styles.notItalic}` }, "None")
                        ),
                        TableCell({ class: sigCellStyle, title: descSigDisplay ?? '' },
                            descSigDisplay ?? i({ class: `${styles.textMutedForeground} ${styles.notItalic}` }, "None")
                        ),
                        TableCell({ class: actionCellStyle },
                             // Preview Button (only for documents)
                            !isUnit ? Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onPreview(doc); }, title: "Preview Document" },
                                icons.EyeIcon({ class: `${styles.h4} ${styles.w4}` }) // Added class
                            ) : span({class: `${styles.w9} ${styles.inlineBlock}`}), // Added w9, inlineBlock
                             // Edit Button (conditionally rendered)
                            () => isOwnerOrAdmin.val ? Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onEdit(doc); }, title: "Edit Item" },
                                icons.EditIcon({ class: `${styles.h4} ${styles.w4}` }) // Added class
                            ) : null,
                             // Disable Button (conditionally rendered)
                            () => isOwnerOrAdmin.val ? Button({ variant: "ghost", size: "icon", onclick: (e: Event) => { e.stopPropagation(); onDisable(doc.archiveDocumentId!); }, title: "Disable Item" },
                                icons.Trash2Icon({ class: `${styles.h4} ${styles.w4} ${styles.textDestructive}` }) // Added class
                            ) : null,
                            // Read-only indicator
                             () => !isOwnerOrAdmin.val ? span({ class: `${styles.textXs} ${styles.textMutedForeground} ${styles.italic} ${styles.pr2}` }, "Read-only") : null
                        ) // End Actions Cell
                    ); // End TableRow
                }) // End map
            ) // End TableBody
        ) // End Table
    ); // End Container Div
};

export default DocumentList;