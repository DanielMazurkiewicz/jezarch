import { Component, createSignal, createEffect, Show, JSX } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { createSignatureComponentFormSchema, CreateSignatureComponentFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SignatureComponent, CreateSignatureComponentInput, UpdateSignatureComponentInput, SignatureComponentIndexType } from '../../../../backend/src/functionalities/signature/component/models';

import { Button } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/Select';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import styles from './ComponentForm.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

interface ComponentFormProps {
    componentToEdit: SignatureComponent | null;
    onSave: () => void;
}

const ComponentForm: Component<ComponentFormProps> = (props) => {
    const [authState] = useAuth();
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);

    // Form state signals
    const [name, setName] = createSignal('');
    const [description, setDescription] = createSignal<string | null>(null);
    const [indexType, setIndexType] = createSignal<SignatureComponentIndexType>('dec');
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof CreateSignatureComponentFormData, string>>>({});

    // REMOVED hasErrors check

    // Effect to update form state when componentToEdit changes
    createEffect(() => {
        const currentEdit = props.componentToEdit;
        setName(currentEdit?.name ?? '');
        setDescription(currentEdit?.description ?? null);
        setIndexType(currentEdit?.index_type ?? 'dec');
        setApiError(null);
        setFormErrors({});
        setIsSubmitting(false);
    });

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = { name: name(), description: description(), index_type: indexType() };
        const result = createSignatureComponentFormSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof CreateSignatureComponentFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof CreateSignatureComponentFormData] = err.message;
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

        try {
            if (props.componentToEdit?.signatureComponentId) {
                // Update logic
                const updatePayload: UpdateSignatureComponentInput = {};
                if (name() !== props.componentToEdit.name) updatePayload.name = name();
                if ((description() ?? null) !== (props.componentToEdit.description ?? null)) {
                    updatePayload.description = description() || null;
                }
                if (indexType() !== props.componentToEdit.index_type) updatePayload.index_type = indexType();

                if (Object.keys(updatePayload).length > 0) {
                    await api.updateSignatureComponent(props.componentToEdit.signatureComponentId, updatePayload, token);
                } else {
                    console.log("No changes detected for component update.");
                }
            } else {
                // Create logic
                const createPayload: CreateSignatureComponentInput = {
                    name: name(),
                    description: description() || undefined,
                    index_type: indexType(),
                };
                await api.createSignatureComponent(createPayload, token);
            }
            props.onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save component';
            setApiError(msg);
            console.error("Save Component Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} class={styles.componentFormContainer}>
            <Show when={apiError()}><ErrorDisplay message={apiError() ?? 'Unknown API error'} /></Show> {/* Ensure message */}
            <Show when={isSubmitting()}><div class={styles.loadingOverlay}><LoadingSpinner /></div></Show>

            {/* Name Input */}
            <div class={styles.formGroup}>
                <FormLabel for="comp-name" required invalid={!!formErrors().name}>Component Name</FormLabel>
                <Input
                    id="comp-name"
                    value={name()}
                    // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setName(e.currentTarget.value); }}
                    required
                    aria-invalid={!!formErrors().name}
                    aria-errormessage="comp-name-error"
                 />
                <Show when={formErrors().name}><p id="comp-name-error" class={styles.errorMessage}>{formErrors().name}</p></Show>
            </div>

            {/* Description Textarea */}
            <div class={styles.formGroup}>
                <FormLabel for="comp-desc" invalid={!!formErrors().description}>Description (Optional)</FormLabel>
                <Textarea
                    id="comp-desc"
                    value={description() ?? ''}
                    // --- FIX: Removed validateForm() call ---
                    onInput={(e) => { setDescription(e.currentTarget.value || null); }}
                    aria-invalid={!!formErrors().description}
                    aria-errormessage="comp-desc-error"
                    rows={3}
                />
                <Show when={formErrors().description}><p id="comp-desc-error" class={styles.errorMessage}>{formErrors().description}</p></Show>
            </div>

            {/* Index Type Select */}
            <div class={styles.formGroup}>
                 <FormLabel for="comp-index-type" required invalid={!!formErrors().index_type}>Index Formatting</FormLabel>
                 <Select
                     id="comp-index-type"
                     value={indexType()}
                     // --- FIX: Removed validateForm() call ---
                     onChange={(value) => { setIndexType(value as SignatureComponentIndexType); }}
                     disabled={isSubmitting()}
                     aria-invalid={!!formErrors().index_type}
                     aria-errormessage="comp-index-type-error"
                     placeholder="Select index type..."
                 >
                     {/* FIX: Add SelectValue inside SelectTrigger */}
                     <SelectTrigger>
                          <SelectValue />
                      </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="dec">Decimal (1, 2, 3...)</SelectItem>
                         <SelectItem value="roman">Roman (I, II, III...)</SelectItem>
                         <SelectItem value="small_char">Lowercase Letters (a, b, c...)</SelectItem>
                         <SelectItem value="capital_char">Uppercase Letters (A, B, C...)</SelectItem>
                     </SelectContent>
                 </Select>
                 <Show when={formErrors().index_type}><p id="comp-index-type-error" class={styles.errorMessage}>{formErrors().index_type}</p></Show>
             </div>

            <div class={styles.formActions}>
                 {/* --- FIX: Simplified disabled check --- */}
                <Button type="submit" disabled={isSubmitting()}>
                     <Show when={isSubmitting()} fallback={props.componentToEdit ? 'Update Component' : 'Create Component'}>
                        <LoadingSpinner size="sm" class={styles.iconMargin}/> Saving...
                    </Show>
                </Button>
            </div>
        </form>
    );
};

export default ComponentForm;