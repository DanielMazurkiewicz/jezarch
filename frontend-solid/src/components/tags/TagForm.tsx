import { Component, createSignal, createEffect, JSX } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { tagFormSchema, TagFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';

import { Button } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import styles from './TagForm.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';
import { Show } from 'solid-js';

interface TagFormProps {
    tagToEdit: Tag | null;
    onSave: () => void; // Callback after successful save
}

const TagForm: Component<TagFormProps> = (props) => {
    const [authState] = useAuth();
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);

    // Form state signals
    const [name, setName] = createSignal('');
    const [description, setDescription] = createSignal<string | null>(null);
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof TagFormData, string>>>({});

    // REMOVED hasErrors check

    // Effect to update form state when tagToEdit changes
    createEffect(() => {
        const currentEdit = props.tagToEdit;
        setName(currentEdit?.name ?? '');
        setDescription(currentEdit?.description ?? null);
        setApiError(null);
        setFormErrors({});
        setIsSubmitting(false);
    });

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = { name: name(), description: description() };
        const result = tagFormSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof TagFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof TagFormData] = err.message;
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

        const payload = {
            name: name(),
            description: description() || undefined, // Send undefined if empty/null
        };

        try {
            if (props.tagToEdit?.tagId) {
                await api.updateTag(props.tagToEdit.tagId, payload, token);
            } else {
                await api.createTag(payload, token);
            }
            props.onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save tag';
            setApiError(msg);
            console.error("Save Tag Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class={styles.tagFormContainer}>
            <Show when={apiError()}>
                {(err) => <ErrorDisplay message={err()} /> }
            </Show>

            <Show when={isSubmitting()}>
                <div class={styles.loadingOverlay}>
                    <LoadingSpinner />
                </div>
            </Show>

            {/* Name Input */}
            <div class={styles.formGroup}>
                <FormLabel for="tag-name" required invalid={!!formErrors().name}>Tag Name</FormLabel>
                <Input
                    id="tag-name"
                    value={name()}
                     // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setName(e.currentTarget.value); }}
                    required
                    aria-invalid={!!formErrors().name}
                    aria-errormessage="tag-name-error"
                />
                <Show when={formErrors().name}><p id="tag-name-error" class={styles.errorMessage}>{formErrors().name}</p></Show>
            </div>

            {/* Description Textarea */}
            <div class={styles.formGroup}>
                <FormLabel for="tag-description" invalid={!!formErrors().description}>Description (Optional)</FormLabel>
                <Textarea
                    id="tag-description"
                    value={description() ?? ''}
                     // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setDescription(e.currentTarget.value || null); }}
                    aria-invalid={!!formErrors().description}
                    aria-errormessage="tag-description-error"
                    rows={3}
                />
                <Show when={formErrors().description}><p id="tag-description-error" class={styles.errorMessage}>{formErrors().description}</p></Show>
            </div>

            <div class={styles.formActions}>
                 {/* --- FIX: Simplified disabled check --- */}
                <Button type="submit" disabled={isSubmitting()}>
                     <Show when={isSubmitting()} fallback={props.tagToEdit ? 'Update Tag' : 'Create Tag'}>
                        <LoadingSpinner size="sm" class={styles.iconMargin}/> Saving...
                    </Show>
                </Button>
            </div>
        </form>
    );
};

export default TagForm;