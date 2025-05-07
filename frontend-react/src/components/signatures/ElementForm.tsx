import React, { useEffect, useState } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; // Added SubmitHandler
import { zodResolver } from '@hookform/resolvers/zod';
import { elementFormSchema } from '@/lib/zodSchemas'; // Use correct schema import, rely on inference for useForm
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import ElementSelector from './ElementSelector'; // Corrected import path
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { SignatureElement, CreateSignatureElementInput, UpdateSignatureElementInput } from '../../../../backend/src/functionalities/signature/element/models'; // Import backend input types
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { toast } from "sonner";
import { cn } from '@/lib/utils'; // Import cn
import { Badge } from '@/components/ui/badge'; // Import Badge
import { z } from 'zod'; // Import z for inferring type in onSubmit
import { t } from '@/translations/utils'; // Import translation utility

// Infer the form data type directly from the schema
type ElementFormData = z.infer<typeof elementFormSchema>;

interface ElementFormProps {
    elementToEdit: SignatureElement | null;
    currentComponent: SignatureComponent;
    // Modified onSave signature to pass back the saved element or null
    onSave: (savedElement: SignatureElement | null) => void;
}

const ElementForm: React.FC<ElementFormProps> = ({ elementToEdit, currentComponent, onSave }) => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
    const [isLoading, setIsLoading] = useState(false); // For save operation
    const [isFetchingDetails, setIsFetchingDetails] = useState(false); // For loading parents
    const [error, setError] = useState<string | null>(null);
    const [selectedParentIds, setSelectedParentIds] = useState<number[]>([]);


    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm({ // Remove explicit type here
        resolver: zodResolver(elementFormSchema),
        defaultValues: {
            name: '',
            description: '',
            index: '', // Use empty string as default for nullable string
            parentIds: [],
        },
    });

     // Fetch parent IDs and populate form when editing
     useEffect(() => {
        const fetchParentsAndPopulate = async () => {
            if (elementToEdit?.signatureElementId && token) {
                 setIsFetchingDetails(true);
                 setError(null);
                try {
                    // Fetch element details including parent IDs
                    const fullElement = await api.getSignatureElementById(elementToEdit.signatureElementId, ['parents'], token);
                    const parentIds = fullElement.parentElements?.map(p => p.signatureElementId!) ?? [];

                    reset({
                         name: fullElement.name || '',
                         description: fullElement.description || '',
                         index: fullElement.index || '', // Use fetched index
                         parentIds: parentIds, // Populate RHF state too
                     });
                    setSelectedParentIds(parentIds); // Sync local state for selector
                } catch (err: any) {
                    const msg = err.message || t('elementLoadDetailsError', preferredLanguage); // Use translated error
                    setError(msg);
                    toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
                    console.error("Fetch Element Parents Error:", err);
                     reset({
                         name: elementToEdit?.name || '',
                         description: elementToEdit?.description || '',
                         index: elementToEdit?.index || '',
                         parentIds: [],
                     });
                     setSelectedParentIds([]);
                } finally {
                    setIsFetchingDetails(false);
                }

            } else {
                reset({ name: '', description: '', index: '', parentIds: [] });
                setSelectedParentIds([]); setError(null); setIsFetchingDetails(false);
            }
        };
        fetchParentsAndPopulate();
     }, [elementToEdit, reset, token, preferredLanguage]); // Add preferredLanguage


     // Update RHF's parentIds when the selector state changes (for validation)
     useEffect(() => {
        setValue('parentIds', selectedParentIds);
     }, [selectedParentIds, setValue]);

    // Use the inferred type for 'data'
    // Renamed from onSubmit to avoid conflict with form prop, though not strictly necessary here
    const handleFormSubmit: SubmitHandler<ElementFormData> = async (data) => {
        if (!token || !currentComponent.signatureComponentId) {
            setError(t('componentContextMissingError', preferredLanguage)); // Use translated error
            return;
        }
        setIsLoading(true);
        setError(null);
        let savedElementResult: SignatureElement | null = null; // To store the result

        // Prepare payloads based on backend input types
        const basePayload = {
             name: data.name,
             description: data.description ?? undefined, // Send undefined if null/empty
             // Send index only if it's not an empty string, otherwise let backend auto-generate
             index: data.index?.trim() ? data.index.trim() : undefined,
             parentIds: selectedParentIds,
        };

        const createPayload: CreateSignatureElementInput = {
            ...basePayload,
            signatureComponentId: currentComponent.signatureComponentId!,
        };

        const updatePayload: UpdateSignatureElementInput = {
            // Only send fields that might have changed
            ...(data.name !== elementToEdit?.name && { name: data.name }),
            ...(data.description !== elementToEdit?.description && { description: data.description ?? null }), // send null to clear
            ...(data.index !== elementToEdit?.index && { index: data.index?.trim() ? data.index.trim() : null }), // send null to clear override
            // parentIds are always sent for update to handle additions/removals
            parentIds: selectedParentIds,
        };


        try {
            if (elementToEdit?.signatureElementId) {
                 // Check if there are any actual changes to update (excluding parentIds which are always sent)
                 const hasCoreChanges = Object.keys(updatePayload).some(key => key !== 'parentIds');
                 // Fetch original parent IDs to compare accurately - ensure this await is inside the try block
                 let originalParentIds: number[] = [];
                 if (token) { // Check token before API call
                    originalParentIds = elementToEdit.parentElements?.map(p => p.signatureElementId!) ??
                                            (await api.getSignatureElementById(elementToEdit.signatureElementId, ['parents'], token))
                                             .parentElements?.map(p => p.signatureElementId!) ?? [];
                 }


                 if (hasCoreChanges || JSON.stringify(selectedParentIds.sort()) !== JSON.stringify(originalParentIds.sort())) {
                     savedElementResult = await api.updateSignatureElement(elementToEdit.signatureElementId, updatePayload, token);
                 } else {
                     console.log("No changes detected for element update.");
                     toast.info(t('elementNoChangesDetected', preferredLanguage)); // Use translated info message
                     // Pass back the original element if no changes were made but save was clicked
                     savedElementResult = elementToEdit;
                 }
            } else {
                 savedElementResult = await api.createSignatureElement(createPayload, token);
            }
            onSave(savedElementResult); // Trigger success callback with the result
        } catch (err: any) {
            const msg = err.message || t('elementSaveFailedError', preferredLanguage);
            setError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            console.error("Save Element Error:", err);
            onSave(null); // Indicate save failed / pass null
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingDetails) {
        return <div className='flex justify-center items-center p-10'><LoadingSpinner /></div>;
    }

    return (
        // Use handleSubmit here for validation, but not directly on the form tag
        <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 relative">
            {error && <ErrorDisplay message={error} className="mb-4"/>}
            {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}

            {/* Display Current Component Info */}
            <div className='text-sm p-2 bg-muted rounded border'> {t('elementListComponentHeader', preferredLanguage)}: <Badge variant="secondary">{currentComponent.name}</Badge> ({t('componentBadgeIndexType', preferredLanguage, { type: currentComponent.index_type })}) </div>

            {/* Form Fields */}
            <div className="grid gap-1.5">
                 {/* Use translated label */}
                <Label htmlFor="elem-name">{t('elementNameLabel', preferredLanguage)} {t('requiredFieldIndicator', preferredLanguage)}</Label>
                <Input id="elem-name" {...register('name')} aria-invalid={!!errors.name} className={cn(errors.name && "border-destructive")} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="grid gap-1.5">
                 {/* Use translated label */}
                <Label htmlFor="elem-description">{t('elementDescriptionLabel', preferredLanguage)} {t('optionalLabel', preferredLanguage)}</Label>
                <Textarea id="elem-description" {...register('description')} rows={3} aria-invalid={!!errors.description} className={cn(errors.description && "border-destructive")} />
                {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>
            <div className="grid gap-1.5">
                 {/* Use translated label and placeholder */}
                <Label htmlFor="elem-index">{t('elementIndexLabel', preferredLanguage)}</Label>
                <Input id="elem-index" {...register('index')} placeholder={t('elementIndexPlaceholder', preferredLanguage, { type: currentComponent.index_type })} aria-invalid={!!errors.index} className={cn(errors.index && "border-destructive")} />
                <p className='text-xs text-muted-foreground'>{t('elementIndexHint', preferredLanguage)}</p>
                {errors.index && <p className="text-xs text-destructive">{errors.index.message}</p>}
            </div>
            <div className="grid gap-1.5">
                 {/* Pass translated label */}
                <ElementSelector
                    selectedElementIds={selectedParentIds}
                    onChange={setSelectedParentIds}
                    currentElementId={elementToEdit?.signatureElementId}
                    currentComponentId={currentComponent?.signatureComponentId}
                    label={t('elementParentElementsLabel', preferredLanguage)}
                />
                <input type="hidden" {...register('parentIds')} />
                {errors.parentIds && <p className="text-xs text-destructive">{typeof errors.parentIds.message === 'string' ? errors.parentIds.message : 'Invalid parent selection'}</p>}
            </div>
            {/* Use translated button text */}
            <Button
                type="button"
                onClick={handleSubmit(handleFormSubmit)}
                disabled={isLoading || isFetchingDetails}
                className="mt-2 justify-self-start"
            >
                {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (elementToEdit ? t('editButton', preferredLanguage) : t('createButton', preferredLanguage))} {t('elementSingularLabel', preferredLanguage)} {/* TODO: Add elementSingularLabel */}
            </Button>
        </div>
    );
};

export default ElementForm;
