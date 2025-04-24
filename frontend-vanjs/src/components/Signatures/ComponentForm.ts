import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { createSignatureComponentFormSchema, CreateSignatureComponentFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select"; // Use basic Select
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { SignatureComponent, SignatureComponentIndexType, CreateSignatureComponentInput, UpdateSignatureComponentInput } from "../../../../backend/src/functionalities/signature/component/models";

const { form, div, p } = van.tags;

// --- Styles ---
const formStyle = style([styles.grid, styles.gap4, styles.py4, styles.relative]);
const fieldStyle = style([styles.grid, styles.gap1]);
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const loadingOverlayStyle = style([styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z10, styles.roundedMd, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]);

// --- Component Props ---
interface ComponentFormProps {
    componentToEdit: SignatureComponent | null;
    onSave: () => void;
}

// --- Component ---
const ComponentForm = ({ componentToEdit, onSave }: ComponentFormProps) => {
    const { token } = authStore;

    // --- State ---
    const isLoading = van.state(false);
    const error = van.state<string | null>(null);
    const name = van.state(componentToEdit?.name || "");
    const description = van.state(componentToEdit?.description || "");
    const index_type = van.state<SignatureComponentIndexType>(componentToEdit?.index_type || 'dec');
    const formErrors = van.state<Partial<Record<keyof CreateSignatureComponentFormData, string>>>({});

    // --- Form Logic ---
    const resolver = zodResolver(createSignatureComponentFormSchema);
    const indexTypeOptions = [
        { value: "dec", label: "Decimal (1, 2, 3...)" },
        { value: "roman", label: "Roman (I, II, III...)" },
        { value: "small_char", label: "Lowercase Letters (a, b, c...)" },
        { value: "capital_char", label: "Uppercase Letters (A, B, C...)" },
    ];

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val) { error.val = "Authentication required."; return; }
        isLoading.val = true; error.val = null; formErrors.val = {};

        const formData: CreateSignatureComponentFormData = {
            name: name.val,
            description: description.val || null, // Ensure null if empty
            index_type: index_type.val,
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            isLoading.val = false;
            return;
        }

        const validatedData = validationResult.data;

        try {
            if (componentToEdit?.signatureComponentId) {
                // --- Update Logic ---
                const updatePayload: UpdateSignatureComponentInput = {};
                if (validatedData.name !== componentToEdit.name) updatePayload.name = validatedData.name;
                if ((validatedData.description ?? '') !== (componentToEdit.description ?? '')) updatePayload.description = validatedData.description ?? null;
                if (validatedData.index_type !== componentToEdit.index_type) updatePayload.index_type = validatedData.index_type;

                if (Object.keys(updatePayload).length > 0) {
                    await api.updateSignatureComponent(componentToEdit.signatureComponentId, updatePayload, token.val);
                } else {
                    console.log("No changes detected for component update.");
                    // No API call needed, just close form
                }
            } else {
                // --- Create Logic ---
                const createPayload: CreateSignatureComponentInput = {
                    name: validatedData.name,
                    description: validatedData.description ?? undefined, // API expects undefined if null
                    index_type: validatedData.index_type
                };
                await api.createSignatureComponent(createPayload, token.val);
            }
            onSave(); // Call callback on success or no changes needed
        } catch (err: any) {
            error.val = err.message || 'Failed to save component';
            console.error("Save Component Error:", err);
        } finally {
            isLoading.val = false;
        }
    };

    // Clear errors on input change (using derive)
    van.derive(() => { name.val; description.val; index_type.val; formErrors.val = {}; error.val = null; });


    // --- Render ---
    return form({ class: formStyle, onsubmit: handleSubmit },
        // Loading Overlay
        () => isLoading.val ? div({ class: loadingOverlayStyle }, LoadingSpinner({})) : null, // Pass empty props
        // Global Error
        () => error.val ? ErrorDisplay({ message: error.val, class: styles.mb4 }) : null, // Added mb4

        // Name Field
        div({ class: fieldStyle },
            Label({ for: "comp-name" }, "Component Name *"),
            Input({
                id: "comp-name", value: name, oninput: (e: Event) => name.val = (e.target as HTMLInputElement).value,
                'aria-invalid': () => !!formErrors.val.name, class: () => formErrors.val.name ? styles.borderDestructive : ''
            }),
            () => formErrors.val.name ? p({ class: errorMsgStyle }, formErrors.val.name) : null
        ),

        // Description Field
        div({ class: fieldStyle },
            Label({ for: "comp-description" }, "Description (Optional)"),
            Textarea({
                id: "comp-description", value: description, oninput: (e: Event) => description.val = (e.target as HTMLTextAreaElement).value, rows: 3,
                 'aria-invalid': () => !!formErrors.val.description, class: () => formErrors.val.description ? styles.borderDestructive : ''
            }),
            () => formErrors.val.description ? p({ class: errorMsgStyle }, formErrors.val.description) : null
        ),

        // Index Type Select
        div({ class: fieldStyle },
            Label({ for: "comp-index-type" }, "Index Formatting *"),
            Select({ // Using the basic Select
                id: "comp-index-type",
                value: index_type, // Bind state
                onchange: (e: Event) => index_type.val = (e.target as HTMLSelectElement).value as SignatureComponentIndexType,
                options: indexTypeOptions,
                'aria-invalid': () => !!formErrors.val.index_type,
                 class: () => formErrors.val.index_type ? styles.borderDestructive : ''
            }),
            () => formErrors.val.index_type ? p({ class: errorMsgStyle }, formErrors.val.index_type) : null
        ),

        // Submit Button
        Button({ type: "submit", disabled: isLoading, class: `${styles.mt2} ${styles.justifySelfStart}` }, // Added mt2, justifySelfStart
            () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
            () => componentToEdit ? 'Update Component' : 'Create Component'
        )
    );
};

export default ComponentForm;