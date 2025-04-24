import { Component, createSignal, createEffect, Show, JSX } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { elementFormSchema, ElementFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { SignatureElement, CreateSignatureElementInput, UpdateSignatureElementInput } from '../../../../backend/src/functionalities/signature/element/models';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';

import { Button } from '@/components/ui/Button';
import { Input, type InputProps } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import styles from './ElementForm.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';
import SignatureSelector from '@/components/shared/SignatureSelector';

interface ElementFormProps {
    elementToEdit: SignatureElement | null;
    currentComponent: SignatureComponent;
    onSave: (savedElement: SignatureElement | null) => void;
}

const ElementForm: Component<ElementFormProps> = (props) => {
    const [authState] = useAuth();
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);
    const [isLoadingDetails, setIsLoadingDetails] = createSignal(false);

    // Form state signals
    const [name, setName] = createSignal('');
    const [description, setDescription] = createSignal<string | null>(null);
    const [index, setIndex] = createSignal<string | null>(null); // Store as string or null
    const [selectedParentPaths, setSelectedParentPaths] = createSignal<number[][]>([]); // For SignatureSelector
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof ElementFormData, string>>>({});

    // REMOVED hasErrors check

    // Fetch parent paths and populate form/selector when editing
    createEffect(async () => {
        const element = props.elementToEdit;
        const token = authState.token;
        // Reset form state first
        setName(element?.name ?? '');
        setDescription(element?.description ?? null);
        setIndex(element?.index ?? null); // Use null for empty/auto index
        setSelectedParentPaths([]); // Reset parents initially
        setApiError(null);
        setFormErrors({});
        setIsSubmitting(false);

        if (element?.signatureElementId && token) {
            setIsLoadingDetails(true);
            try {
                // Fetch full details including parents
                const fullElement = await api.getSignatureElementById(element.signatureElementId, ['parents'], token);
                // Extract full parent paths (needs backend support or complex client logic)
                // Assuming backend provides `parentPaths` array on the full element for simplicity
                const parentPaths: number[][] = (fullElement as any).parentPaths || []; // Replace with actual fetch/construction logic
                setSelectedParentPaths(parentPaths);
                // Set other fields from fullElement if they differ (though unlikely if elementToEdit is already detailed)
                setName(fullElement.name);
                // --- FIX: Explicitly handle potential undefined by coercing to null ---
                setDescription(fullElement.description ?? null);
                setIndex(fullElement.index ?? null);
            } catch (err: any) {
                const msg = err.message || "Failed to load element details";
                setApiError(msg);
                console.error("Fetch Element Parents Error:", err);
                setSelectedParentPaths([]); // Reset on error
            } finally {
                setIsLoadingDetails(false);
            }
        } else {
            setIsLoadingDetails(false); // Ensure loading is false for create mode
        }
    });

     // Validation function
     const validateForm = (): boolean => {
         setFormErrors({}); // Clear previous errors
         const formData = {
             name: name(),
             description: description(),
             index: index(), // Pass current index state (string or null)
             // Pass parent IDs based on selector state for validation if needed
             parentIds: selectedParentPaths().map(path => path[path.length - 1]).filter(id => id !== undefined),
         };
         const result = elementFormSchema.safeParse(formData);
         if (!result.success) {
             const errors: Partial<Record<keyof ElementFormData, string>> = {};
             result.error.errors.forEach((err: ZodIssue) => {
                 if (err.path.length > 0) {
                    // Ensure path corresponds to ElementFormData keys
                    errors[err.path[0] as keyof ElementFormData] = err.message;
                 }
             });
             setFormErrors(errors);
             return false;
         }
         // No need to setFormErrors({}) here
         return true;
     };


    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        const token = authState.token;
        if (!token || !props.currentComponent?.signatureComponentId || !validateForm()) { // Validate on submit
            setApiError("Component context, authentication missing, or form invalid.");
            return;
        }
        setApiError(null);
        setIsSubmitting(true);
        let savedElement: SignatureElement | null = null;

        const immediateParentIds = selectedParentPaths().map(path => path[path.length - 1]).filter(id => id !== undefined);
        const finalIndex = index()?.trim() || null; // Set to null if empty or only whitespace

        try {
            const basePayload = {
                 name: name(),
                 description: description() || undefined,
                 index: finalIndex ?? undefined, // Send undefined if null
                 parentIds: immediateParentIds,
             };

            if (props.elementToEdit?.signatureElementId) {
                // Update logic
                const updatePayload: UpdateSignatureElementInput = { parentIds: immediateParentIds };
                let hasCoreChanges = false;
                if (name() !== props.elementToEdit.name) { updatePayload.name = name(); hasCoreChanges = true; }
                if ((description() ?? null) !== (props.elementToEdit.description ?? null)) { updatePayload.description = description() || null; hasCoreChanges = true; }
                if ((finalIndex ?? null) !== (props.elementToEdit.index ?? null)) { updatePayload.index = finalIndex ?? null; hasCoreChanges = true; }

                let originalParentIds = props.elementToEdit.parentElements?.map(p => p.signatureElementId!) ?? [];
                let parentsChanged = JSON.stringify(immediateParentIds.sort()) !== JSON.stringify(originalParentIds.sort());

                if (hasCoreChanges || parentsChanged) {
                     console.log("Updating element:", props.elementToEdit.signatureElementId, updatePayload);
                     savedElement = await api.updateSignatureElement(props.elementToEdit.signatureElementId, updatePayload, token);
                 } else {
                     console.log("No changes detected for element update.");
                     savedElement = props.elementToEdit;
                 }
            } else {
                 // Create logic
                 const createPayload: CreateSignatureElementInput = {
                     ...basePayload,
                     signatureComponentId: props.currentComponent.signatureComponentId!,
                 };
                 console.log("Creating element:", createPayload);
                 savedElement = await api.createSignatureElement(createPayload, token);
            }
            props.onSave(savedElement);
        } catch (err: any) {
            const msg = err.message || 'Failed to save element';
            setApiError(msg);
            console.error("Save Element Error:", err);
            props.onSave(null);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
         <div class={styles.elementFormContainer}>
             <Show when={isLoadingDetails()}>
                 <div class="flex justify-center p-10"><LoadingSpinner /></div>
             </Show>
             <Show when={!isLoadingDetails()}>
                <form onSubmit={handleSubmit} class={styles.elementFormInner}>
                    <Show when={apiError()}><ErrorDisplay message={apiError() ?? 'Unknown API error'} /></Show> {/* Ensure message */}
                    <Show when={isSubmitting()}><div class={styles.loadingOverlay}><LoadingSpinner /></div></Show>

                    <div class={styles.componentInfo}>
                         Component: <Badge variant="secondary">{props.currentComponent.name}</Badge> (Index: {props.currentComponent.index_type})
                    </div>

                    {/* Name Input */}
                    <div class={styles.formGroup}>
                        <FormLabel for="el-name" required invalid={!!formErrors().name}>Element Name</FormLabel>
                        <Input
                            id="el-name"
                            value={name()}
                            // --- FIX: Removed validateForm() call ---
                            onInput={(e) => { setName(e.currentTarget.value); }}
                            required
                            aria-invalid={!!formErrors().name}
                            aria-errormessage="el-name-error"
                        />
                        <Show when={formErrors().name}><p id="el-name-error" class={styles.errorMessage}>{formErrors().name}</p></Show>
                    </div>

                    {/* Description Textarea */}
                    <div class={styles.formGroup}>
                        <FormLabel for="el-desc" invalid={!!formErrors().description}>Description (Optional)</FormLabel>
                        <Textarea
                            id="el-desc"
                            value={description() ?? ''}
                            // --- FIX: Removed validateForm() call ---
                            onInput={(e) => { setDescription(e.currentTarget.value || null); }}
                            aria-invalid={!!formErrors().description}
                            aria-errormessage="el-desc-error"
                            rows={3}
                         />
                        <Show when={formErrors().description}><p id="el-desc-error" class={styles.errorMessage}>{formErrors().description}</p></Show>
                    </div>

                    {/* Index Input */}
                    <div class={styles.formGroup}>
                         <FormLabel for="el-index" invalid={!!formErrors().index}>Index (Optional - Override Auto)</FormLabel>
                         <Input
                            id="el-index"
                            type="text"
                            value={index() ?? ''}
                            // --- FIX: Removed validateForm() call ---
                            onInput={(e) => { setIndex(e.currentTarget.value || null); }}
                            placeholder={`Auto (${props.currentComponent.index_type})`}
                            aria-invalid={!!formErrors().index}
                            aria-errormessage="el-index-error"
                         />
                         <p class='text-xs text-muted-foreground'>Leave empty for automatic index based on parents.</p>
                         <Show when={formErrors().index}><p id="el-index-error" class={styles.errorMessage}>{formErrors().index}</p></Show>
                    </div>

                    {/* Parent Selector */}
                    <div class={styles.formGroup}>
                        <SignatureSelector
                            label="Parent Elements (Optional)"
                            signatures={selectedParentPaths()}
                            onChange={setSelectedParentPaths}
                            disabled={isSubmitting()}
                            // Pass current element ID to prevent self-selection if needed
                            // currentElementId={props.elementToEdit?.signatureElementId}
                        />
                         {/* Show validation error for parentIds if schema includes it */}
                         <Show when={formErrors().parentIds}><p class={styles.errorMessage}>{formErrors().parentIds}</p></Show>
                    </div>

                    <div class={styles.formActions}>
                         {/* --- FIX: Simplified disabled check --- */}
                        <Button type="submit" disabled={isSubmitting() || isLoadingDetails()}>
                             <Show when={isSubmitting()} fallback={props.elementToEdit ? 'Update Element' : 'Create Element'}>
                                <LoadingSpinner size="sm" class={styles.iconMargin}/> Saving...
                            </Show>
                        </Button>
                    </div>
                </form>
            </Show>
         </div>
    );
};

export default ElementForm;