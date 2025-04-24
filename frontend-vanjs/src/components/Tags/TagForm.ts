import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { tagFormSchema, TagFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea"; // Assuming Textarea component
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";

const { form, div, p } = van.tags;

// --- Styles ---
const formStyle = style([styles.grid, styles.gap4, styles.py4, styles.relative]);
const fieldStyle = style([styles.grid, styles.gap1]); // gap-1.5 equivalent
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const loadingOverlayStyle = style([
    styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z10, styles.roundedMd,
    { backgroundColor: 'rgba(255, 255, 255, 0.7)', } // Example overlay color
]);

// --- Component Props ---
interface TagFormProps {
    tagToEdit: Tag | null; // Accept plain object
    onSave: () => void;
}

// --- Component ---
const TagForm = ({ tagToEdit, onSave }: TagFormProps) => {
    const { token } = authStore;

    // --- Local State ---
    const isLoading = van.state(false);
    const error = van.state<string | null>(null);
    const name = van.state(tagToEdit?.name || "");
    const description = van.state(tagToEdit?.description || "");
    const formErrors = van.state<Partial<Record<keyof TagFormData, string>>>({});

    // --- Form Handling ---
    const resolver = zodResolver(tagFormSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val) {
            error.val = "Authentication required.";
            return;
        }
        isLoading.val = true;
        error.val = null;
        formErrors.val = {};

        const formData: TagFormData = {
            name: name.val,
            description: description.val || null, // Ensure null if empty
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            isLoading.val = false;
            return;
        }

        const payload = validationResult.data;
        // Correctly handle optional description for the API
        const apiPayload = {
            name: payload.name,
            description: payload.description ?? undefined // Pass undefined if null/empty
        };

        try {
            if (tagToEdit?.tagId) {
                await api.updateTag(tagToEdit.tagId, apiPayload, token.val);
            } else {
                await api.createTag(apiPayload, token.val);
            }
            onSave(); // Call parent callback on success
        } catch (err: any) {
            error.val = err.message || 'Failed to save tag';
            console.error("Save Tag Error:", err);
        } finally {
            isLoading.val = false;
        }
    };

    // Clear errors when inputs change
    van.derive(() => { name.val; description.val; formErrors.val = {}; error.val = null; });

    // --- Render ---
    return form({ class: formStyle, onsubmit: handleSubmit },
        // Loading Overlay
        () => isLoading.val ? div({ class: loadingOverlayStyle }, LoadingSpinner({})) : null, // Pass empty props
        // Global Error
        () => error.val ? ErrorDisplay({ message: error.val, class: styles.mb4 }) : null, // Added mb4

        // Name Field
        div({ class: fieldStyle },
            Label({ for: "tag-name" }, "Tag Name"),
            Input({
                id: "tag-name",
                value: name,
                oninput: (e: Event) => name.val = (e.target as HTMLInputElement).value,
                'aria-invalid': () => !!formErrors.val.name,
                class: () => formErrors.val.name ? styles.borderDestructive : ''
            }),
            () => formErrors.val.name ? p({ class: errorMsgStyle }, formErrors.val.name) : null
        ),

        // Description Field
        div({ class: fieldStyle },
            Label({ for: "tag-description" }, "Description (Optional)"),
            Textarea({ // Use Textarea component
                id: "tag-description",
                rows: 3,
                value: description,
                oninput: (e: Event) => description.val = (e.target as HTMLTextAreaElement).value,
                'aria-invalid': () => !!formErrors.val.description,
                 class: () => formErrors.val.description ? styles.borderDestructive : ''
            }),
             () => formErrors.val.description ? p({ class: errorMsgStyle }, formErrors.val.description) : null
        ),

        // Submit Button
        Button({ type: "submit", disabled: isLoading, class: `${styles.mt2} ${styles.justifySelfStart}` }, // Added mt2, justifySelfStart
            () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
            () => tagToEdit ? 'Update Tag' : 'Create Tag'
        )
    );
};

export default TagForm;