import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Link } from "@/lib/router"; // Use VanJS Link
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { themeVars } from "@/styles/theme.css"; // Import themeVars
import type { ArchiveDocument, ArchiveDocumentSearchResult } from "../../../../backend/src/functionalities/archive/document/models";

const { div, span, p, ul, li, strong, a, h4 } = van.tags; // Added h4

// --- Styles ---
const dialogContentStyle = style({ maxWidth: '48rem' }); // max-w-3xl
const headerDescStyle = style([styles.spaceY1, styles.pt1, styles.textLeft]); // Added spaceY1
const tagContainerStyle = style([styles.flex, styles.flexWrap, styles.gap1, styles.pt1, styles.itemsCenter]);
const tagBadgeStyle = style([styles.textXs, styles.fontNormal]);
const sigContainerStyle = style([styles.flex, styles.flexWrap, styles.gap1, styles.pt1, styles.itemsCenter]);
const sigBadgeStyle = style([styles.fontMono, styles.textXs]);
const strongStyle = style([styles.pr1]); // mr-1
const scrollAreaStyle = style([styles.maxH60vh, styles.my4, styles.spaceY4, styles.pr3, styles.borderT, styles.borderB, styles.py4, styles.overflowYAuto]); // Added maxH60vh, my4
const sectionTitleStyle = style([styles.fontSemibold, styles.mb1, styles.textBase]); // Added mb1
const detailListStyle = style([styles.listDisc, { listStylePosition: 'inside' }, styles.textSm, styles.spaceY0]); // Added listDisc, spaceY0
const detailItemStyle = style({}); // Add specific li styles if needed
const detailTextStyle = style([styles.textSm, styles.spaceY1]); // Added spaceY1
const linkStyle = style([styles.textPrimary, { ':hover': { textDecoration: 'underline' }, wordBreak: 'break-all' }]);
const footerStyle = style([styles.gap2, { // Added gap2
    '@media': { 'screen and (min-width: 640px)': { justifyContent: 'space-between', flexDirection: 'row' } } // sm:justify-between, sm:flex-row
}]);
const footerLeftStyle = style({});
const footerRightStyle = style([styles.flex, styles.gap2]);
const disableButtonStyle = style([styles.borderDestructive, styles.textDestructive, {
    ':hover': { backgroundColor: themeVars.color.destructive + '1a', color: themeVars.color.destructive } // bg-destructive/10 approx color themeVars.color.destructive
}]);

// --- Helper ---
const formatDate = (dateInput: Date | string | undefined | null): string => {
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        return isNaN(date.getTime()) ? "Invalid Date" : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return "Error"; }
};

// --- Component Props ---
interface DocumentPreviewDialogProps {
    isOpen: State<boolean>; // Pass state object directly
    onOpenChange: (isOpen: boolean) => void;
    document: ArchiveDocumentSearchResult | null; // Use search result type
    onEdit: (doc: ArchiveDocument) => void; // Base type ok if edit form uses it
    onDisable: (docId: number) => void;
    parentUnitTitle?: string | null; // Optional parent title
}

// --- Component ---
const DocumentPreviewDialog = ({
    isOpen,
    onOpenChange,
    document: previewingDocProp, // Rename prop to avoid conflict
    onEdit,
    onDisable,
    parentUnitTitle,
}: DocumentPreviewDialogProps) => {
    const { user } = authStore;

    // Use the prop directly inside derived states/render logic
    const previewingDoc = previewingDocProp; // For clarity inside the component

    // Derive values reactively based on previewingDoc prop
    const isOwnerOrAdmin = van.derive(() => {
        const doc = previewingDoc; // Use the variable holding the current doc object
        const currentUser = user.val;
        return !!doc && (currentUser?.role === 'admin' || currentUser?.userId === doc.ownerUserId);
    });

    const handleEditClick = () => {
        if (!previewingDoc) return;
        onOpenChange(false);
        onEdit(previewingDoc as ArchiveDocument); // Cast if needed
    };

    const handleDisableClick = () => {
        if (!previewingDoc) return;
        onDisable(previewingDoc.archiveDocumentId!);
        // Optionally close dialog within onDisable logic if needed
    };

    // Conditional rendering wrapper for the dialog content
    return Dialog({ open: isOpen, onOpenChange: onOpenChange }, // Bind state
        // Conditionally render DialogContent based on isOpen state value AND previewingDoc
        () => (isOpen.val && previewingDoc) ? DialogContent({ class: dialogContentStyle },
            DialogHeader(
                DialogTitle({ class: `${styles.flex} ${styles.itemsCenter} ${styles.gap2}` },
                    previewingDoc.type === 'unit'
                        ? icons.FolderIcon({ class: `${styles.h5} ${styles.w5} text-blue-600` }) // Pass class
                        : icons.FileTextIcon({ class: `${styles.h5} ${styles.w5} text-green-600` }), // Pass class
                    previewingDoc.title
                ),
                DialogDescription({ class: headerDescStyle },
                    p(strong("Creator:"), ` ${previewingDoc.creator}`),
                    p(strong("Date:"), ` ${previewingDoc.creationDate}`),
                    previewingDoc.parentUnitArchiveDocumentId && p(
                        strong("Parent Unit: "),
                        Link({ to: `/archive?unitId=${previewingDoc.parentUnitArchiveDocumentId}`, class: `${styles.textPrimary} hover:${styles.underline}`, onclick: () => onOpenChange(false) },
                            parentUnitTitle || `ID ${previewingDoc.parentUnitArchiveDocumentId}`
                        )
                    ),
                    p(strong("Owner:"), ` ${previewingDoc.ownerLogin ?? 'N/A'} (ID: ${previewingDoc.ownerUserId})`),
                    // Tags (conditionally rendered)
                    (previewingDoc.tags && previewingDoc.tags.length > 0) && div({ class: tagContainerStyle },
                        strong({ class: strongStyle }, "Tags:"),
                        previewingDoc.tags.map(tag =>
                            Badge({ key: tag.tagId, variant: "secondary", class: tagBadgeStyle }, tag.name)
                        )
                    ),
                    // Signatures (conditionally rendered)
                    (previewingDoc.resolvedTopographicSignatures && previewingDoc.resolvedTopographicSignatures.length > 0) && div({ class: sigContainerStyle },
                        strong({ class: strongStyle }, "Topo Sigs:"),
                        previewingDoc.resolvedTopographicSignatures.map((sig: string, idx: number) => // Add types
                            Badge({ key: `topo-${idx}`, variant: "outline", class: sigBadgeStyle }, sig)
                        )
                    ),
                    (previewingDoc.resolvedDescriptiveSignatures && previewingDoc.resolvedDescriptiveSignatures.length > 0) && div({ class: sigContainerStyle },
                        strong({ class: strongStyle }, "Desc Sigs:"),
                        previewingDoc.resolvedDescriptiveSignatures.map((sig: string, idx: number) => // Add types
                            Badge({ key: `desc-${idx}`, variant: "outline", class: sigBadgeStyle }, sig)
                        )
                    )
                ) // End DialogDescription
            ), // End DialogHeader

            // Scrollable Content Area
            div({ class: scrollAreaStyle },
                // Content Description
                previewingDoc.contentDescription && div(
                    h4({ class: sectionTitleStyle }, 'Content Description'),
                    p({ class: styles.textSm }, previewingDoc.contentDescription) // Removed pre-wrap, assuming normal text
                ),
                // Physical Details
                (previewingDoc.numberOfPages || previewingDoc.documentType || previewingDoc.dimensions || previewingDoc.binding || previewingDoc.condition || previewingDoc.documentLanguage) && div(
                    h4({ class: sectionTitleStyle }, 'Physical Details'),
                    ul({ class: detailListStyle },
                       previewingDoc.numberOfPages && li(detailItemStyle, `Pages: ${previewingDoc.numberOfPages}`),
                       previewingDoc.documentType && li(detailItemStyle, `Type: ${previewingDoc.documentType}`),
                       previewingDoc.dimensions && li(detailItemStyle, `Dimensions: ${previewingDoc.dimensions}`),
                       previewingDoc.binding && li(detailItemStyle, `Binding: ${previewingDoc.binding}`),
                       previewingDoc.condition && li(detailItemStyle, `Condition: ${previewingDoc.condition}`),
                       previewingDoc.documentLanguage && li(detailItemStyle, `Language: ${previewingDoc.documentLanguage}`),
                    )
                ),
                // Other Details
                 (previewingDoc.remarks || previewingDoc.accessLevel || previewingDoc.additionalInformation || previewingDoc.relatedDocumentsReferences || previewingDoc.isDigitized !== null) && div(
                    h4({ class: sectionTitleStyle }, 'Other Details'),
                    div({ class: detailTextStyle },
                        previewingDoc.remarks && p(strong("Remarks:"), ` ${previewingDoc.remarks}`),
                        previewingDoc.accessLevel && p(strong("Access:"), ` ${previewingDoc.accessLevel}${previewingDoc.accessConditions ? ` (${previewingDoc.accessConditions})` : ''}`),
                        previewingDoc.additionalInformation && p(strong("Additional Info:"), ` ${previewingDoc.additionalInformation}`),
                        previewingDoc.relatedDocumentsReferences && p(strong("Related Docs:"), ` ${previewingDoc.relatedDocumentsReferences}`),
                         previewingDoc.isDigitized !== null && p(
                            strong("Digitized:"),
                            ` ${previewingDoc.isDigitized ? 'Yes' : 'No'}`,
                             previewingDoc.isDigitized && previewingDoc.digitizedVersionLink ? [' - Link: ', a({ href: previewingDoc.digitizedVersionLink, target: "_blank", rel: "noopener noreferrer", class: linkStyle }, previewingDoc.digitizedVersionLink)] : null
                        )
                    )
                 ) // End Other Details section div
            ), // End Scroll Area

            // Dialog Footer
            DialogFooter({ class: footerStyle },
                // Left side (Disable button)
                div({ class: footerLeftStyle },
                     () => isOwnerOrAdmin.val ? Button({ variant: "outline", class: disableButtonStyle, size: "sm", onclick: handleDisableClick },
                         icons.Trash2Icon({ class: `${styles.h4} ${styles.w4} ${styles.mr2}` }), " Disable Item" // Pass class
                     ) : null
                ),
                // Right side (Edit/Close)
                div({ class: footerRightStyle },
                     () => isOwnerOrAdmin.val ? Button({ variant: "secondary", size: "sm", onclick: handleEditClick },
                         icons.EditIcon({ class: `${styles.h4} ${styles.w4} ${styles.mr2}` }), " Edit" // Pass class
                     ) : null,
                    Button({ variant: "outline", size: "sm", onclick: () => onOpenChange(false) }, "Close")
                )
            ) // End Footer
        ) : null // End DialogContent conditional
    ); // End Dialog
};

export default DocumentPreviewDialog;