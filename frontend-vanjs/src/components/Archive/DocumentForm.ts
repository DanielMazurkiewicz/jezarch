import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { createArchiveDocumentFormSchema, CreateArchiveDocumentFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import TagSelector from "@/components/Shared/TagSelector";
import SignatureSelector from "@/components/Shared/SignatureSelector"; // Assuming this exists now
import UnitSelector from "./UnitSelector";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { ArchiveDocument, ArchiveDocumentType, CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from "../../../../backend/src/functionalities/archive/document/models";

const { form, div, p, fieldset, legend, span } = van.tags;

// --- Styles ---
const formStyle = style([styles.spaceY6, styles.relative, styles.p1, styles.pr3]);
const loadingOverlayStyle = style([styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z20, styles.roundedMd, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]);
const cardContentGridStyle = style([styles.grid, styles.gapX4, styles.gapY3, { // Added gapX4, gapY3
    gap: `${themeVars.spacing.md} ${themeVars.spacing.lg}`, // Example row/col gap
    '@media': { 'screen and (min-width: 768px)': { gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' } } // md:grid-cols-2
}]);
const gridItemStyle = style([styles.grid, styles.gap1]); // gap-1.5 approx
const fullWidthGridItemStyle = style([gridItemStyle, {
     '@media': { 'screen and (min-width: 768px)': { gridColumn: 'span 2 / span 2' } } // md:col-span-2
}]);
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const checkboxContainerStyle = style([styles.flex, styles.itemsCenter, styles.spaceX2, styles.pt1]);
const stickyFooterStyle = style([styles.sticky, styles.bottom0, styles.bgBackground, styles.pb1, styles.pt2, styles.flex, styles.justifyStart]); // Added bottom0

// --- Component Props ---
interface DocumentFormProps {
    docToEdit: ArchiveDocument | null; // Plain object
    onSave: () => void; // Simple callback
    forceType?: ArchiveDocumentType;
    forcedParentId?: number;
    forcedParentTitle?: string;
    // Removed onTypeChange, handle title outside if needed
}

// --- Component ---
const DocumentForm = ({
    docToEdit,
    onSave,
    forceType,
    forcedParentId,
    forcedParentTitle,
}: DocumentFormProps) => {
    const { token } = authStore;

    // --- State ---
    const isLoading = van.state(false); // For save operation
    const isFetchingDetails = van.state(!!docToEdit);
    const error = van.state<string | null>(null);
    const formErrors = van.state<Partial<Record<keyof CreateArchiveDocumentFormData, string>>>({});

    // Form Fields States
    const type = van.state<ArchiveDocumentType>(forceType ?? docToEdit?.type ?? 'document');
    const selectedParentUnitId = van.state<number | null>(forcedParentId ?? docToEdit?.parentUnitArchiveDocumentId ?? null); // State for UnitSelector
    const title = van.state(docToEdit?.title || "");
    const creator = van.state(docToEdit?.creator || "");
    const creationDate = van.state(docToEdit?.creationDate || "");
    const numberOfPages = van.state(docToEdit?.numberOfPages?.toString() || ""); // Store as string for input
    const documentType = van.state(docToEdit?.documentType || "");
    const dimensions = van.state(docToEdit?.dimensions || "");
    const binding = van.state(docToEdit?.binding || "");
    const condition = van.state(docToEdit?.condition || "");
    const documentLanguage = van.state(docToEdit?.documentLanguage || "");
    const contentDescription = van.state(docToEdit?.contentDescription || "");
    const remarks = van.state(docToEdit?.remarks || "");
    const accessLevel = van.state(docToEdit?.accessLevel || "");
    const accessConditions = van.state(docToEdit?.accessConditions || "");
    const additionalInformation = van.state(docToEdit?.additionalInformation || "");
    const relatedDocumentsReferences = van.state(docToEdit?.relatedDocumentsReferences || "");
    const isDigitized = van.state(Boolean(docToEdit?.isDigitized));
    const digitizedVersionLink = van.state(docToEdit?.digitizedVersionLink || "");
    const selectedTagIds = van.state<number[]>(docToEdit?.tags?.map(t => t.tagId!) ?? []);
    // Signature States (expecting State<number[][]> for SignatureSelector)
    const topographicSignatures = van.state<number[][]>(docToEdit?.topographicSignatureElementIds ?? []);
    const descriptiveSignatures = van.state<number[][]>(docToEdit?.descriptiveSignatureElementIds ?? []);

    // --- Fetch Full Details on Edit ---
    // Replace effect with derived approach if possible, or ensure it runs only once on edit
    // For simplicity, keep effect but ensure it resets state correctly for create mode
    van.derive(() => { // Changed to derive, but might need careful dependency management
        token.val; // Depend on token
        const currentDocId = docToEdit?.archiveDocumentId; // Use prop directly

        if (currentDocId && token.val) {
            // If currently fetching, don't start another fetch
            if (isFetchingDetails.val) return;

            isFetchingDetails.val = true; error.val = null;
            api.getArchiveDocumentById(currentDocId, token.val)
                .then(fullDoc => {
                    // Only update states if the fetched doc ID matches the current one
                    if (docToEdit?.archiveDocumentId === fullDoc.archiveDocumentId) {
                        type.val = forceType ?? fullDoc.type ?? 'document';
                        selectedParentUnitId.val = forcedParentId ?? fullDoc.parentUnitArchiveDocumentId ?? null;
                        title.val = fullDoc.title ?? '';
                        creator.val = fullDoc.creator ?? '';
                        creationDate.val = fullDoc.creationDate ?? '';
                        numberOfPages.val = fullDoc.numberOfPages?.toString() ?? '';
                        documentType.val = fullDoc.documentType ?? '';
                        dimensions.val = fullDoc.dimensions ?? '';
                        binding.val = fullDoc.binding ?? '';
                        condition.val = fullDoc.condition ?? '';
                        documentLanguage.val = fullDoc.documentLanguage ?? '';
                        contentDescription.val = fullDoc.contentDescription ?? '';
                        remarks.val = fullDoc.remarks ?? '';
                        accessLevel.val = fullDoc.accessLevel ?? '';
                        accessConditions.val = fullDoc.accessConditions ?? '';
                        additionalInformation.val = fullDoc.additionalInformation ?? '';
                        relatedDocumentsReferences.val = fullDoc.relatedDocumentsReferences ?? '';
                        isDigitized.val = Boolean(fullDoc.isDigitized);
                        digitizedVersionLink.val = fullDoc.digitizedVersionLink ?? '';
                        selectedTagIds.val = fullDoc.tags?.map(t => t.tagId!) ?? [];
                        topographicSignatures.val = fullDoc.topographicSignatureElementIds ?? [];
                        descriptiveSignatures.val = fullDoc.descriptiveSignatureElementIds ?? [];
                        formErrors.val = {}; // Clear errors
                    }
                })
                .catch(err => {
                     // Only set error if it corresponds to the current doc being edited
                    if (docToEdit?.archiveDocumentId === currentDocId) {
                        error.val = `Failed to load full document details: ${err.message}`;
                        console.error("DocForm Load Error:", err);
                        // Keep initially passed values on error? Or reset? Resetting is safer.
                        name.val = docToEdit?.name || "";
                        // ... reset other fields based on docToEdit or defaults
                    }
                })
                .finally(() => {
                    // Only stop fetching if the ID matches
                     if (docToEdit?.archiveDocumentId === currentDocId) {
                         isFetchingDetails.val = false;
                     }
                });
        } else if (!currentDocId) {
             // Reset for create mode if docToEdit is null/undefined
            type.val = forceType ?? 'document';
            selectedParentUnitId.val = forcedParentId ?? null;
            title.val = ''; creator.val = ''; creationDate.val = ''; numberOfPages.val = '';
            documentType.val = ''; dimensions.val = ''; binding.val = ''; condition.val = '';
            documentLanguage.val = ''; contentDescription.val = ''; remarks.val = '';
            accessLevel.val = ''; accessConditions.val = ''; additionalInformation.val = '';
            relatedDocumentsReferences.val = ''; isDigitized.val = false; digitizedVersionLink.val = '';
            selectedTagIds.val = []; topographicSignatures.val = []; descriptiveSignatures.val = [];
            formErrors.val = {}; error.val = null; isFetchingDetails.val = false;
        }
    });


    // --- Form Handling ---
    const resolver = zodResolver(createArchiveDocumentFormSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val) { error.val = "Authentication required."; return; }
        isLoading.val = true; error.val = null; formErrors.val = {};

        // Construct form data object from states
        const formData: CreateArchiveDocumentFormData = {
            parentUnitArchiveDocumentId: selectedParentUnitId.val, // Use state directly
            type: type.val,
            title: title.val,
            creator: creator.val,
            creationDate: creationDate.val,
            numberOfPages: numberOfPages.val || null, // Convert empty string to null
            documentType: documentType.val || null,
            dimensions: dimensions.val || null,
            binding: binding.val || null,
            condition: condition.val || null,
            documentLanguage: documentLanguage.val || null,
            contentDescription: contentDescription.val || null,
            remarks: remarks.val || null,
            accessLevel: accessLevel.val || null,
            accessConditions: accessConditions.val || null,
            additionalInformation: additionalInformation.val || null,
            relatedDocumentsReferences: relatedDocumentsReferences.val || null,
            isDigitized: isDigitized.val,
            digitizedVersionLink: digitizedVersionLink.val || null,
            tagIds: selectedTagIds.val, // Use state
            topographicSignatureElementIds: topographicSignatures.val, // Use state
            descriptiveSignatureElementIds: descriptiveSignatures.val, // Use state
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            error.val = "Validation failed. Please check the fields.";
            isLoading.val = false;
            return;
        }

        const data = validationResult.data;
        const finalParentId = forcedParentId !== undefined ? forcedParentId : selectedParentUnitId.val;

        // Prepare payload (handle undefined for optional fields in API)
        const apiPayload = {
            title: data.title,
            creator: data.creator,
            creationDate: data.creationDate,
            parentUnitArchiveDocumentId: finalParentId ?? undefined,
            numberOfPages: data.numberOfPages ? parseInt(data.numberOfPages, 10) : undefined, // Parse number for API
            documentType: data.documentType ?? undefined,
            dimensions: data.dimensions ?? undefined,
            binding: data.binding ?? undefined,
            condition: data.condition ?? undefined,
            documentLanguage: data.documentLanguage ?? undefined,
            contentDescription: data.contentDescription ?? undefined,
            remarks: data.remarks ?? undefined,
            accessLevel: data.accessLevel ?? undefined,
            accessConditions: data.accessConditions ?? undefined,
            additionalInformation: data.additionalInformation ?? undefined,
            relatedDocumentsReferences: data.relatedDocumentsReferences ?? undefined,
            isDigitized: data.isDigitized,
            digitizedVersionLink: data.digitizedVersionLink ?? undefined,
            tagIds: selectedTagIds.val, // Use state value
            topographicSignatureElementIds: topographicSignatures.val, // Use state value
            descriptiveSignatureElementIds: descriptiveSignatures.val, // Use state value
        };


        try {
            if (docToEdit?.archiveDocumentId) {
                // --- Update ---
                // Construct Update payload (only include changed fields, API might handle this)
                const updatePayload: UpdateArchiveDocumentInput = { ...apiPayload }; // Start with all
                // TODO: Refine updatePayload to only send changed fields if necessary, requires comparing with docToEdit
                await api.updateArchiveDocument(docToEdit.archiveDocumentId, updatePayload, token.val);

            } else {
                // --- Create ---
                const createPayload: CreateArchiveDocumentInput = {
                    ...apiPayload,
                    type: type.val, // Add type for creation
                };
                await api.createArchiveDocument(createPayload, token.val);
            }
            onSave(); // Call success callback
        } catch (err: any) {
            error.val = err.message || 'Failed to save item';
            console.error("Save Document Error:", err);
        } finally {
            isLoading.val = false;
        }
    };

    // --- Render ---
     if (isFetchingDetails.val) {
         return div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.itemsCenter} ${styles.p10}` }, LoadingSpinner({})); // Pass empty props
     }

    // Helper for grid items
    const GridItem = (itemProps: object, ...itemChildren: VanChild[]) => {
        const { class: itemClass = '', ...restItem } = itemProps as any; // Basic type assertion
        return div({ class: `${gridItemStyle} ${itemClass}`.trim(), ...restItem }, itemChildren);
    }

    return form({ class: formStyle, onsubmit: handleSubmit },
        // Loading Overlay
        () => isLoading.val ? div({ class: loadingOverlayStyle }, LoadingSpinner({})) : null, // Pass empty props
        // Global Error
        () => error.val ? ErrorDisplay({ message: error.val, class: `${styles.mb4} ${styles.sticky} ${styles.top0} ${styles.z10}` /* Sticky error? */}) : null, // Added mb4

        // --- Basic Information ---
        Card(
            CardHeader(CardTitle({ class: styles.textLg }, 'Basic Information')),
            CardContent({ class: cardContentGridStyle },
                GridItem({} as any, // Type select
                    Label({ for: "doc-type" }, "Type *"),
                    Select({
                        id: 'doc-type', value: type, // Bind state
                        onchange: (e: Event) => type.val = (e.target as HTMLSelectElement).value as ArchiveDocumentType,
                        disabled: !!forceType, // Disable if type is forced
                        options: [{ value: "document", label: "Document" }, { value: "unit", label: "Unit" }],
                         'aria-invalid': () => !!formErrors.val.type, class: () => formErrors.val.type ? styles.borderDestructive : ''
                    }),
                    () => formErrors.val.type ? p({ class: errorMsgStyle }, formErrors.val.type) : null
                ),
                // Parent Unit Selector (conditional)
                () => (type.val === 'document' && forcedParentId === undefined) ? GridItem({} as any,
                    Label({ for: "doc-parent" }, "Parent Unit (Optional)"),
                    // Pass state and handler to UnitSelector
                    UnitSelector({ selectedUnitId: selectedParentUnitId, onChange: (id) => selectedParentUnitId.val = id, currentDocumentId: docToEdit?.archiveDocumentId })
                ) : null,
                // Display Forced Parent Unit
                () => (type.val === 'document' && forcedParentId !== undefined) ? GridItem({} as any,
                    Label("Parent Unit"),
                    Input({ value: forcedParentTitle ? `"${forcedParentTitle}" (Set by context)` : `ID: ${forcedParentId} (Set by context)`, disabled: true, class: styles.textMutedForeground })
                ) : null,
                // Title
                GridItem({ class: fullWidthGridItemStyle } as any,
                    Label({ for: "doc-title" }, "Title *"),
                    Input({ id: "doc-title", value: title, oninput: (e:Event)=> title.val = (e.target as HTMLInputElement).value, 'aria-invalid': () => !!formErrors.val.title, class: () => formErrors.val.title ? styles.borderDestructive : '' }), // Bind state
                     () => formErrors.val.title ? p({ class: errorMsgStyle }, formErrors.val.title) : null
                ),
                // Creator
                GridItem({} as any,
                    Label({ for: "doc-creator" }, "Creator *"),
                    Input({ id: "doc-creator", value: creator, oninput: (e:Event)=> creator.val = (e.target as HTMLInputElement).value, 'aria-invalid': () => !!formErrors.val.creator, class: () => formErrors.val.creator ? styles.borderDestructive : '' }), // Bind state
                     () => formErrors.val.creator ? p({ class: errorMsgStyle }, formErrors.val.creator) : null
                ),
                // Creation Date
                GridItem({} as any,
                    Label({ for: "doc-creationDate" }, "Creation Date *"),
                    Input({ id: "doc-creationDate", value: creationDate, oninput: (e:Event)=> creationDate.val = (e.target as HTMLInputElement).value, placeholder: "e.g., 2023-10-26, ca. 1950", 'aria-invalid': () => !!formErrors.val.creationDate, class: () => formErrors.val.creationDate ? styles.borderDestructive : '' }), // Bind state
                     () => formErrors.val.creationDate ? p({ class: errorMsgStyle }, formErrors.val.creationDate) : null
                ),
            )
        ), // End Basic Info Card

        // --- Physical Description ---
        Card(
            CardHeader(CardTitle({ class: styles.textLg }, 'Physical Description')),
            CardContent({ class: cardContentGridStyle },
                GridItem({} as any, Label({ for: "doc-pages" }, "Number of Pages"), Input({ id: "doc-pages", value: numberOfPages, oninput: (e:Event)=> numberOfPages.val = (e.target as HTMLInputElement).value })), // Bind state
                GridItem({} as any, Label({ for: "doc-docType" }, "Document Type"), Input({ id: "doc-docType", value: documentType, oninput: (e:Event)=> documentType.val = (e.target as HTMLInputElement).value, placeholder: "e.g., Letter, Report" })), // Bind state
                GridItem({} as any, Label({ for: "doc-dimensions" }, "Dimensions"), Input({ id: "doc-dimensions", value: dimensions, oninput: (e:Event)=> dimensions.val = (e.target as HTMLInputElement).value, placeholder: "e.g., 21x30 cm" })), // Bind state
                GridItem({} as any, Label({ for: "doc-binding" }, "Binding"), Input({ id: "doc-binding", value: binding, oninput: (e:Event)=> binding.val = (e.target as HTMLInputElement).value, placeholder: "e.g., Bound volume" })), // Bind state
                GridItem({ class: fullWidthGridItemStyle } as any, Label({ for: "doc-condition" }, "Condition"), Input({ id: "doc-condition", value: condition, oninput: (e:Event)=> condition.val = (e.target as HTMLInputElement).value, placeholder: "e.g., Good, Fragile" })), // Bind state
            )
        ),

         // --- Content & Context ---
         Card(
            CardHeader(CardTitle({ class: styles.textLg }, 'Content & Context')),
             CardContent({ class: `${styles.grid} ${styles.gap3}` }, // Single column grid
                GridItem({} as any, Label({ for: "doc-language" }, "Document Language"), Input({ id: "doc-language", value: documentLanguage, oninput: (e:Event)=> documentLanguage.val = (e.target as HTMLInputElement).value, placeholder: "e.g., English, German" })), // Bind state
                GridItem({} as any, Label({ for: "doc-contentDesc" }, "Content Description"), Textarea({ id: "doc-contentDesc", value: contentDescription, oninput: (e:Event)=> contentDescription.val = (e.target as HTMLTextAreaElement).value, rows: 4, placeholder: "Summary..." })), // Bind state
                GridItem({} as any, Label({ for: "doc-remarks" }, "Remarks"), Textarea({ id: "doc-remarks", value: remarks, oninput: (e:Event)=> remarks.val = (e.target as HTMLTextAreaElement).value, rows: 2, placeholder: "Additional remarks..." })), // Bind state
                GridItem({} as any, Label({ for: "doc-related" }, "Related Docs Refs"), Textarea({ id: "doc-related", value: relatedDocumentsReferences, oninput: (e:Event)=> relatedDocumentsReferences.val = (e.target as HTMLTextAreaElement).value, rows: 2, placeholder: "Links or references..." })), // Bind state
                GridItem({} as any, Label({ for: "doc-additionalInfo" }, "Additional Info"), Textarea({ id: "doc-additionalInfo", value: additionalInformation, oninput: (e:Event)=> additionalInformation.val = (e.target as HTMLTextAreaElement).value, rows: 2, placeholder: "Other relevant info..." })), // Bind state
             )
         ),

         // --- Access & Digitization ---
        Card(
            CardHeader(CardTitle({ class: styles.textLg }, 'Access & Digitization')),
            CardContent({ class: cardContentGridStyle },
                GridItem({} as any, Label({ for: "doc-accessLevel" }, "Access Level"), Input({ id: "doc-accessLevel", value: accessLevel, oninput: (e:Event)=> accessLevel.val = (e.target as HTMLInputElement).value, placeholder: "e.g., Public, Restricted" })), // Bind state
                GridItem({} as any, Label({ for: "doc-accessCond" }, "Access Conditions"), Input({ id: "doc-accessCond", value: accessConditions, oninput: (e:Event)=> accessConditions.val = (e.target as HTMLInputElement).value, placeholder: "e.g., Requires permission" })), // Bind state
                GridItem({ class: `${checkboxContainerStyle} ${fullWidthGridItemStyle}` } as any,
                    Checkbox({ // Use Checkbox component
                        id: "doc-digitized",
                        checked: isDigitized, // Bind state
                        onCheckedChange: (checked: boolean) => isDigitized.val = checked // Update state
                    }),
                    Label({ for: "doc-digitized", class: styles.fontNormal }, "Is Digitized?")
                ),
                // Conditional URL input
                () => isDigitized.val ? GridItem({ class: fullWidthGridItemStyle } as any,
                    Label({ for: "doc-digitizedLink" }, "Digitized Version Link"),
                    Input({
                        id: "doc-digitizedLink", type: "url", value: digitizedVersionLink, oninput: (e:Event)=> digitizedVersionLink.val = (e.target as HTMLInputElement).value, placeholder: "https://...", // Bind state
                         'aria-invalid': () => !!formErrors.val.digitizedVersionLink, class: () => formErrors.val.digitizedVersionLink ? styles.borderDestructive : ''
                    }),
                     () => formErrors.val.digitizedVersionLink ? p({ class: errorMsgStyle }, formErrors.val.digitizedVersionLink) : null
                ) : null
            )
        ),

        // --- Indexing ---
        Card(
            CardHeader(CardTitle({ class: styles.textLg }, 'Indexing')),
             CardContent({ class: `${styles.grid} ${styles.gap4} items-start` }, // Single column grid
                // Use SignatureSelector components (passing state)
                SignatureSelector({ label: "Topographic Signatures", signatures: topographicSignatures, onChange: (sigs) => topographicSignatures.val = sigs }),
                SignatureSelector({ label: "Descriptive Signatures", signatures: descriptiveSignatures, onChange: (sigs) => descriptiveSignatures.val = sigs }),
                 // Validation messages (if SignatureSelector doesn't handle internally)
                 // () => formErrors.val.topographicSignatureElementIds ? p(...) : null,
                 // () => formErrors.val.descriptiveSignatureElementIds ? p(...) : null,

                // Tag Selector
                GridItem({} as any,
                    Label("Tags"),
                    TagSelector({ selectedTagIds: selectedTagIds, onChange: (ids) => selectedTagIds.val = ids })
                    // Validation message
                    // () => formErrors.val.tagIds ? p(...) : null,
                ),
             )
        ),

        // Submit button (Sticky Footer)
        div({ class: stickyFooterStyle },
            Button({ type: "submit", disabled: () => isLoading.val || isFetchingDetails.val },
                () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
                () => docToEdit ? 'Update Item' : 'Create Item'
            )
        )
    ); // End Form
};

export default DocumentForm;
