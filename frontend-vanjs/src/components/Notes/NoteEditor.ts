import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { noteFormSchema, NoteFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox"; // Assuming Checkbox component
import TagSelector from "@/components/Shared/TagSelector";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import type { NoteInput, NoteWithDetails } from "../../../../backend/src/functionalities/note/models";

const { form, div, p } = van.tags;

// --- Styles ---
const formStyle = style([styles.grid, styles.gap4, styles.py4, styles.relative]);
const fieldStyle = style([styles.grid, styles.gap1]);
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const loadingOverlayStyle = style([styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z10, styles.roundedMd, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]);
const checkboxContainerStyle = style([styles.flex, styles.itemsCenter, styles.spaceX2, styles.pt2]);
const disabledLabelStyle = style([styles.cursorNotAllowed, styles.opacity70]);

// --- Component Props ---
interface NoteEditorProps {
    noteToEdit: NoteWithDetails | null;
    onSave: () => void;
}

// --- Component ---
const NoteEditor = ({ noteToEdit, onSave }: NoteEditorProps) => {
    const { token, user } = authStore;

    // --- Local State ---
    const isLoading = van.state(false); // For save operation
    const isFetchingDetails = van.state(!!noteToEdit); // For initial load if editing
    const error = van.state<string | null>(null);
    const title = van.state("");
    const content = van.state("");
    const shared = van.state(false);
    const selectedTagIds = van.state<number[]>([]); // State for TagSelector
    const formErrors = van.state<Partial<Record<keyof NoteFormData, string>>>({});

    // Permissions derived state
    const isOwner = van.derive(() => noteToEdit ? noteToEdit.ownerUserId === user.val?.userId : false);
    const isAdmin = van.derive(() => user.val?.role === 'admin');
    const canChangeShared = van.derive(() => noteToEdit ? (isOwner.val || isAdmin.val) : true); // Can always set on create

    // --- Fetch Details on Edit ---
    van.effect(() => {
        if (noteToEdit?.noteId && token.val) {
            isFetchingDetails.val = true;
            error.val = null;
            api.getNoteById(noteToEdit.noteId, token.val)
                .then(fullNote => {
                    title.val = fullNote.title || "";
                    content.val = fullNote.content || "";
                    shared.val = Boolean(fullNote.shared);
                    selectedTagIds.val = fullNote.tags?.map(t => t.tagId!) ?? [];
                    formErrors.val = {}; // Clear errors after successful load
                })
                .catch(err => {
                    const msg = err.message || "Failed to load note details";
                    error.val = msg;
                    console.error("NoteEditor: Fetch Details Error:", err);
                    // Reset to potentially stale/empty on error
                    title.val = noteToEdit?.title || "";
                    content.val = noteToEdit?.content || "";
                    shared.val = Boolean(noteToEdit?.shared);
                    selectedTagIds.val = noteToEdit?.tags?.map(t => t.tagId!) ?? [];
                })
                .finally(() => isFetchingDetails.val = false);
        } else {
            // Reset for creation
            title.val = "";
            content.val = "";
            shared.val = false;
            selectedTagIds.val = [];
            formErrors.val = {};
            error.val = null;
            isFetchingDetails.val = false;
        }
    });

    // --- Form Handling ---
    const resolver = zodResolver(noteFormSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val) { error.val = "Authentication required."; return; }
        isLoading.val = true;
        error.val = null;
        formErrors.val = {};

        const formData: NoteFormData = {
            title: title.val,
            content: content.val || null, // Ensure null if empty
            shared: shared.val,
            tagIds: selectedTagIds.val, // Use state directly
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            isLoading.val = false;
            return;
        }

        const payload: NoteInput = {
             ...validationResult.data,
             content: validationResult.data.content ?? '', // API needs string or ''
             shared: Boolean(validationResult.data.shared), // Ensure boolean
             tagIds: selectedTagIds.val, // Pass selected IDs
        };

        // Backend enforces shared permission, UI disables checkbox

        try {
            if (noteToEdit?.noteId) {
                await api.updateNote(noteToEdit.noteId, payload, token.val);
            } else {
                await api.createNote(payload, token.val);
            }
            onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save note';
            error.val = msg;
            console.error("Save Note Error:", err);
        } finally {
            isLoading.val = false;
        }
    };

     // Clear errors when inputs change
     van.derive(() => { title.val; content.val; shared.val; selectedTagIds.val; formErrors.val = {}; error.val = null; });


    // --- Render ---
    return form({ class: formStyle, onsubmit: handleSubmit },
        // Overlays
        () => isLoading.val ? div({ class: loadingOverlayStyle }, LoadingSpinner()) : null,
        () => isFetchingDetails.val ? div({ class: loadingOverlayStyle }, LoadingSpinner()) : null, // Also show spinner when fetching
        // Global Error
        () => error.val ? ErrorDisplay({ message: error.val, class: styles.mb4 }) : null,

        // Title Field
        div({ class: fieldStyle },
            Label({ for: "title" }, "Title"),
            Input({
                id: "title", value: title, oninput: (e: Event) => title.val = (e.target as HTMLInputElement).value,
                'aria-invalid': () => !!formErrors.val.title, class: () => formErrors.val.title ? styles.borderDestructive : ''
            }),
            () => formErrors.val.title ? p({ class: errorMsgStyle }, formErrors.val.title) : null
        ),

        // Content Field
        div({ class: fieldStyle },
            Label({ for: "content" }, "Content"),
            Textarea({
                id: "content", value: content, oninput: (e: Event) => content.val = (e.target as HTMLTextAreaElement).value, rows: 6,
                 'aria-invalid': () => !!formErrors.val.content, class: () => formErrors.val.content ? styles.borderDestructive : ''
            }),
             () => formErrors.val.content ? p({ class: errorMsgStyle }, formErrors.val.content) : null
        ),

        // Tag Selector
        div({ class: fieldStyle },
            Label({ for: "tags" }, "Tags"),
            // Pass the VanJS state directly to TagSelector
            TagSelector({ selectedTagIds: selectedTagIds, onChange: (ids) => selectedTagIds.val = ids }),
             // Hidden input for RHF validation linking (if needed, though zodResolver works on data object)
             // () => formErrors.val.tagIds ? p({ class: errorMsgStyle }, formErrors.val.tagIds) : null // Display tag errors if any
        ),

        // Shared Checkbox
        div({ class: checkboxContainerStyle },
            Checkbox({ // Use Checkbox component
                id: "shared",
                // Bind checked state directly
                checked: shared,
                // Update state on change
                onCheckedChange: (isChecked) => shared.val = isChecked,
                // Disable based on derived permission state
                disabled: () => !canChangeShared.val,
                 'aria-invalid': () => !!formErrors.val.shared,
                 class: () => formErrors.val.shared ? styles.borderDestructive : '', // Optional invalid style
                 title: () => canChangeShared.val ? undefined : "Only the owner or an admin can change the shared status"
            }),
            Label({
                for: "shared",
                // Apply disabled style to label based on permission state
                class: () => `${styles.fontNormal} ${canChangeShared.val ? styles.cursorPointer : disabledLabelStyle}`
            }, "Share this note publicly")
        ),
         () => formErrors.val.shared ? p({ class: errorMsgStyle }, formErrors.val.shared) : null,

        // Submit Button
        Button({ type: "submit", disabled: () => isLoading.val || isFetchingDetails.val, class: `${styles.mt4} ${styles.justifySelfStart}` },
            () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
            () => noteToEdit ? 'Update Note' : 'Create Note'
        )
    );
};

export default NoteEditor;