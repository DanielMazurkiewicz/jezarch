import van, { State } from "vanjs-core"; // Added State
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { elementFormSchema, ElementFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge"; // Import Badge
import ElementSelector from "./ElementSelector"; // Use the specific ElementSelector
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { SignatureElement, CreateSignatureElementInput, UpdateSignatureElementInput } from "../../../../backend/src/functionalities/signature/element/models";
import type { SignatureComponent } from "../../../../backend/src/functionalities/signature/component/models";
// Remove toast

const { form, div, p } = van.tags;

// --- Styles ---
const formStyle = style([styles.grid, styles.gap4, styles.py4, styles.relative, { maxHeight: '70vh', overflowY: 'auto', paddingRight: styles.pr2 }]); // Added pr2 style directly
const fieldStyle = style([styles.grid, styles.gap1]);
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const loadingOverlayStyle = style([styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z10, styles.roundedMd, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]);
const componentInfoStyle = style([styles.textSm, styles.p2, styles.bgMuted, styles.roundedMd, styles.border]);
const indexHelpTextStyle = style([styles.textXs, styles.textMutedForeground]);

// --- Component Props ---
interface ElementFormProps {
    elementToEdit: SignatureElement | null;
    currentComponent: SignatureComponent; // Expect plain object
    onSave: (savedElement: SignatureElement | null) => void;
}

// --- Component ---
const ElementForm = ({ elementToEdit, currentComponent, onSave }: ElementFormProps) => {
    const { token } = authStore;

    // --- State ---
    const isLoading = van.state(false); // For save operation
    const isFetchingDetails = van.state(!!elementToEdit); // Loading parents if editing
    const error = van.state<string | null>(null);
    // Form Fields
    const name = van.state("");
    const description = van.state("");
    const index = van.state(""); // Index override
    const selectedParentIds = van.state<number[]>([]); // State for ElementSelector
    const formErrors = van.state<Partial<Record<keyof ElementFormData, string>>>({});

    // --- Fetch Parent IDs on Edit ---
    van.derive(() => { // Replaced effect with derive
        token.val; // Depend on token
        const currentElement = elementToEdit; // Use prop directly in derive closure

        if (currentElement?.signatureElementId && token.val) {
            // Avoid re-fetching if already loading for this specific element
            if (isFetchingDetails.val) return;

            isFetchingDetails.val = true; error.val = null;
            api.getSignatureElementById(currentElement.signatureElementId, ['parents'], token.val)
                .then(fullElement => {
                    // Check if the component context is still the same (user might have navigated away)
                    if (elementToEdit?.signatureElementId === fullElement.signatureElementId) {
                        name.val = fullElement.name || "";
                        description.val = fullElement.description || "";
                        index.val = fullElement.index || "";
                        selectedParentIds.val = fullElement.parentElements?.map(p => p.signatureElementId!) ?? [];
                        formErrors.val = {}; // Clear errors
                    }
                })
                .catch(err => {
                     if (elementToEdit?.signatureElementId === currentElement.signatureElementId) {
                        const msg = err.message || "Failed to load element details";
                        error.val = msg; console.error("ElementForm: Fetch Details Error:", err);
                        // Reset to potentially stale data or empty on error? Keep current values for now.
                        // name.val = currentElement?.name || "";
                        // description.val = currentElement?.description || "";
                        // index.val = currentElement?.index || "";
                        // selectedParentIds.val = []; // Reset parents on error
                    }
                })
                .finally(() => {
                     if (elementToEdit?.signatureElementId === currentElement.signatureElementId) {
                        isFetchingDetails.val = false;
                     }
                });
        } else if (!currentElement) {
            // Reset for create mode only if elementToEdit is null
            name.val = ""; description.val = ""; index.val = ""; selectedParentIds.val = [];
            formErrors.val = {}; error.val = null; isFetchingDetails.val = false;
        }
    });



    // --- Form Handling ---
    const resolver = zodResolver(elementFormSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val || !currentComponent?.signatureComponentId) {
            error.val = "Component context or authentication is missing."; return;
        }
        isLoading.val = true; error.val = null; formErrors.val = {};
        let savedElementResult: SignatureElement | null = null;

        const formData: ElementFormData = {
            name: name.val,
            description: description.val || null,
            index: index.val || null, // Ensure null if empty for Zod
            parentIds: selectedParentIds.val, // Use state directly
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            isLoading.val = false; return;
        }

        const data = validationResult.data;

        const basePayload = {
             name: data.name,
             description: data.description ?? undefined, // API expects undefined
             index: data.index?.trim() ? data.index.trim() : undefined, // API expects undefined for auto-index
             parentIds: selectedParentIds.val, // Always send current selection
        };

        try {
            if (elementToEdit?.signatureElementId) {
                // --- Update ---
                const updatePayload: UpdateSignatureElementInput = {};
                if (basePayload.name !== elementToEdit.name) updatePayload.name = basePayload.name;
                if ((basePayload.description ?? '') !== (elementToEdit.description ?? '')) updatePayload.description = basePayload.description ?? null; // Send null to clear
                if ((basePayload.index ?? '') !== (elementToEdit.index ?? '')) updatePayload.index = basePayload.index ?? null; // Send null to clear override

                 // Compare current parent IDs with initial parent IDs (need to fetch initial ones properly)
                // For now, always include parentIds in the update payload if editing
                updatePayload.parentIds = basePayload.parentIds;

                // Check if anything actually changed (excluding parents comparison complexity for now)
                const hasCoreChanges = updatePayload.name !== undefined || updatePayload.description !== undefined || updatePayload.index !== undefined;
                // TODO: Add check for parentIds change if needed

                // Always attempt update if core fields changed OR if editing (to sync parents)
                 if (hasCoreChanges || true) { // Assuming we always want to sync parents on edit submit
                     savedElementResult = await api.updateSignatureElement(elementToEdit.signatureElementId, updatePayload, token.val);
                 } else {
                     console.log("No changes detected for element update.");
                     savedElementResult = elementToEdit; // Return original if no API call made
                 }

            } else {
                // --- Create ---
                 const createPayload: CreateSignatureElementInput = {
                    ...basePayload,
                    signatureComponentId: currentComponent.signatureComponentId!,
                 };
                 savedElementResult = await api.createSignatureElement(createPayload, token.val);
            }
            onSave(savedElementResult); // Pass result (or null on fail)
        } catch (err: any) {
            const msg = err.message || 'Failed to save element';
            error.val = msg; alert(`Error: ${msg}`); console.error("Save Element Error:", err);
            onSave(null); // Indicate failure
        } finally {
            isLoading.val = false;
        }
    };

    // Clear errors on input change
    van.derive(() => { name.val; description.val; index.val; selectedParentIds.val; formErrors.val = {}; error.val = null; });


    // --- Render ---
     if (isFetchingDetails.val) {
         return div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.itemsCenter} ${styles.p10}` }, LoadingSpinner({})); // Added p10, Pass empty props
     }

    return form({ class: formStyle, onsubmit: handleSubmit },
        // Loading Overlay for saving
        () => isLoading.val ? div({ class: loadingOverlayStyle }, LoadingSpinner({})) : null, // Pass empty props
        // Global Error Display
        () => error.val ? ErrorDisplay({ message: error.val, class: styles.mb4 }) : null, // Added mb4

        // Component Info
        div({ class: componentInfoStyle }, "Component: ", Badge({ variant: "secondary" }, currentComponent.name), ` (${currentComponent.index_type})`),

        // Name Field
        div({ class: fieldStyle },
            Label({ for: "elem-name" }, "Element Name *"),
            Input({ id: "elem-name", value: name, oninput: (e: Event) => name.val = (e.target as HTMLInputElement).value, 'aria-invalid': () => !!formErrors.val.name, class: () => formErrors.val.name ? styles.borderDestructive : '' }),
            () => formErrors.val.name ? p({ class: errorMsgStyle }, formErrors.val.name) : null
        ),
        // Description Field
        div({ class: fieldStyle },
            Label({ for: "elem-description" }, "Description (Optional)"),
            Textarea({ id: "elem-description", value: description, oninput: (e: Event) => description.val = (e.target as HTMLTextAreaElement).value, rows: 3, 'aria-invalid': () => !!formErrors.val.description, class: () => formErrors.val.description ? styles.borderDestructive : '' }),
            () => formErrors.val.description ? p({ class: errorMsgStyle }, formErrors.val.description) : null
        ),
        // Index Field
        div({ class: fieldStyle },
            Label({ for: "elem-index" }, "Index (Optional - Override Auto-Index)"),
            Input({ id: "elem-index", value: index, oninput: (e: Event) => index.val = (e.target as HTMLInputElement).value, placeholder: `Auto (${currentComponent.index_type})`, 'aria-invalid': () => !!formErrors.val.index, class: () => formErrors.val.index ? styles.borderDestructive : '' }),
            p({ class: indexHelpTextStyle }, "Leave empty for automatic index based on component type and parents."),
            () => formErrors.val.index ? p({ class: errorMsgStyle }, formErrors.val.index) : null
        ),
        // Parent Selector
        div({ class: fieldStyle },
            ElementSelector({
                selectedElementIds: selectedParentIds, // Pass state
                onChange: (ids) => selectedParentIds.val = ids, // Update state
                currentElementId: elementToEdit?.signatureElementId,
                currentComponentId: currentComponent?.signatureComponentId, // Pass current component ID
                label: "Parent Elements (Optional)"
            }),
             () => formErrors.val.parentIds ? p({ class: errorMsgStyle }, typeof formErrors.val.parentIds === 'string' ? formErrors.val.parentIds : 'Invalid parent selection') : null
        ),
        // Submit Button
        Button({ type: "submit", disabled: () => isLoading.val || isFetchingDetails.val, class: `${styles.mt2} ${styles.justifySelfStart}` }, // Added mt2, justifySelfStart
            () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
            () => elementToEdit ? 'Update Element' : 'Create Element'
        )
    );
};

export default ElementForm;