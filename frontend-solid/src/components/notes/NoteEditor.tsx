import { Component, createSignal, createEffect, Show, createMemo, JSX } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { noteFormSchema, NoteFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { NoteInput, NoteWithDetails } from '../../../../backend/src/functionalities/note/models';

import { Button } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import { Checkbox } from '@/components/ui/Checkbox';
import TagSelector from '@/components/shared/TagSelector';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import styles from './NoteEditor.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

interface NoteEditorProps {
    noteToEdit: NoteWithDetails | null;
    onSave: () => void; // Callback after successful save
}

const NoteEditor: Component<NoteEditorProps> = (props) => {
    const [authState] = useAuth();
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);

    // Form state signals
    const [title, setTitle] = createSignal('');
    const [content, setContent] = createSignal<string | null>(null);
    const [shared, setShared] = createSignal(false);
    const [selectedTagIds, setSelectedTagIds] = createSignal<number[]>([]); // TagSelector manages this
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof NoteFormData, string>>>({});

    // REMOVED hasErrors check

    // Sync form state when noteToEdit prop changes
    createEffect(() => {
        const note = props.noteToEdit;
        setTitle(note?.title ?? '');
        setContent(note?.content ?? null);
        setShared(note?.shared ?? false);
        setSelectedTagIds(note?.tags?.map(t => t.tagId!) ?? []);
        setApiError(null); // Clear errors when switching notes
        setFormErrors({}); // Clear validation errors
        setIsSubmitting(false); // Reset submitting state
    });

    const canEditShared = createMemo(() => {
         const note = props.noteToEdit;
         const user = authState.user;
         if (!user) return false;
         if (user.role === 'admin') return true;
         if (!note) return true; // Creating new note
         return note.ownerUserId === user.userId;
    });

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = {
            title: title(),
            content: content(),
            shared: shared(),
            tagIds: selectedTagIds(),
        };
        const result = noteFormSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof NoteFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof NoteFormData] = err.message;
                }
            });
            setFormErrors(errors);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const token = authState.token;
        if (!token || !validateForm()) { // Validate on submit
            setApiError("Authentication required or form invalid.");
            return;
        }
        setApiError(null);
        setIsSubmitting(true);

        const payload: Partial<NoteInput> & Pick<NoteInput, 'title' | 'tagIds'> = {
            title: title(),
            content: content() ?? '', // Use nullish coalescing
            tagIds: selectedTagIds(), // Use tag IDs from the TagSelector state
        };
        if (canEditShared()) {
            payload.shared = shared() ?? false;
        }

        try {
            if (props.noteToEdit?.noteId) {
                await api.updateNote(props.noteToEdit.noteId, payload as NoteInput, token);
            } else {
                await api.createNote(payload as NoteInput, token);
            }
            props.onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save note';
            setApiError(msg);
            console.error("Save Note Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class={styles.noteEditorContainer}>
            <Show when={apiError()}>
                {(err) => <ErrorDisplay message={err()} />}
            </Show>
            <Show when={isSubmitting()}>
                <div class={styles.loadingOverlay}><LoadingSpinner /></div>
            </Show>

            {/* Title Input */}
            <div class={styles.formGroup}>
                <FormLabel for="note-title" required invalid={!!formErrors().title}>Title</FormLabel>
                <Input
                    id="note-title"
                    value={title()}
                    // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setTitle(e.currentTarget.value); }}
                    required
                    aria-invalid={!!formErrors().title}
                    aria-errormessage="note-title-error"
                />
                <Show when={formErrors().title}><p id="note-title-error" class={styles.errorMessage}>{formErrors().title}</p></Show>
            </div>

            {/* Content Textarea */}
            <div class={styles.formGroup}>
                <FormLabel for="note-content" invalid={!!formErrors().content}>Content</FormLabel>
                <Textarea
                    id="note-content"
                    value={content() ?? ''}
                    // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setContent(e.currentTarget.value || null); }}
                    aria-invalid={!!formErrors().content}
                    aria-errormessage="note-content-error"
                    rows={8}
                />
                <Show when={formErrors().content}><p id="note-content-error" class={styles.errorMessage}>{formErrors().content}</p></Show>
            </div>

            {/* Tag Selector */}
            <div class={styles.formGroup}>
                 <FormLabel>Tags</FormLabel>
                 <TagSelector
                     selectedTagIds={selectedTagIds()}
                     onChange={setSelectedTagIds} // Directly use the signal setter
                     disabled={isSubmitting()}
                 />
                 {/* Direct form error for tags (if schema had it) */}
                 <Show when={formErrors().tagIds}><p class={styles.errorMessage}>{formErrors().tagIds}</p></Show>
             </div>

            {/* Shared Checkbox */}
            <div class={styles.sharedCheckboxContainer}>
                <Checkbox
                    id="note-shared"
                    checked={shared()}
                    // --- FIX: Removed validateForm() call ---
                    onCheckedChange={(checked) => setShared(!!checked)} // Ensure boolean
                    disabled={!canEditShared() || isSubmitting()}
                    aria-invalid={!!formErrors().shared}
                    aria-errormessage="note-shared-error"
                />
                 <FormLabel for="note-shared" class={styles.checkboxLabel}>Share this note publicly</FormLabel>
            </div>
            {/* Show error for shared field if any */}
            <Show when={formErrors().shared}><p id="note-shared-error" class={styles.errorMessage}>{formErrors().shared}</p></Show>

            <div class={styles.formActions}>
                 {/* --- FIX: Simplified disabled check --- */}
                <Button type="submit" disabled={isSubmitting()}>
                     <Show when={isSubmitting()} fallback={props.noteToEdit ? 'Update Note' : 'Create Note'}>
                        <LoadingSpinner size="sm" class={styles.iconMargin}/> Saving...
                    </Show>
                </Button>
            </div>
        </form>
    );
};

export default NoteEditor;