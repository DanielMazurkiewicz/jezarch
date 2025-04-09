import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { elementFormSchema, ElementFormData } from '@/lib/zodSchemas'; // Use correct schema import
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

interface ElementFormProps {
    elementToEdit: SignatureElement | null;
    currentComponent: SignatureComponent;
    onSave: () => void; // Success callback
}

const ElementForm: React.FC<ElementFormProps> = ({ elementToEdit, currentComponent, onSave }) => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false); // For save operation
    const [isFetchingDetails, setIsFetchingDetails] = useState(false); // For loading parents
    const [error, setError] = useState<string | null>(null);
    const [selectedParentIds, setSelectedParentIds] = useState<number[]>([]);


    const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<ElementFormData>({
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
                    const msg = err.message || "Failed to load element details";
                    setError(msg); toast.error(msg); console.error("Fetch Element Parents Error:", err);
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
     }, [elementToEdit, reset, token]);


     // Update RHF's parentIds when the selector state changes (for validation)
     useEffect(() => {
        setValue('parentIds', selectedParentIds);
     }, [selectedParentIds, setValue]);


    const onSubmit = async (data: ElementFormData) => {
        if (!token || !currentComponent.signatureComponentId) {
            setError("Component context is missing.");
            return;
        }
        setIsLoading(true);
        setError(null);

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
                 if (hasCoreChanges || JSON.stringify(selectedParentIds) !== JSON.stringify(elementToEdit.parentElements?.map(p => p.signatureElementId) ?? [])) {
                     await api.updateSignatureElement(elementToEdit.signatureElementId, updatePayload, token);
                 } else {
                     console.log("No changes detected for element update.");
                 }
            } else {
                await api.createSignatureElement(createPayload, token);
            }
            onSave();
        } catch (err: any) {
            const msg = err.message || 'Failed to save element';
            setError(msg); toast.error(`Error: ${msg}`); console.error("Save Element Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetchingDetails) {
        return <div className='flex justify-center items-center p-10'><LoadingSpinner /></div>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2 relative">
            {error && <ErrorDisplay message={error} />}
            {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10'><LoadingSpinner/></div>}

            <div className='text-sm p-2 bg-muted rounded'> Component: <span className='font-semibold'>{currentComponent.name}</span> ({currentComponent.index_type}) </div>
            <div className="grid gap-2"> <Label htmlFor="elem-name">Element Name</Label> <Input id="elem-name" {...register('name')} aria-invalid={errors.name ? "true" : "false"} /> {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>} </div>
            <div className="grid gap-2"> <Label htmlFor="elem-description">Description (Optional)</Label> <Textarea id="elem-description" {...register('description')} rows={3} aria-invalid={errors.description ? "true" : "false"} /> {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>} </div>
            <div className="grid gap-2"> <Label htmlFor="elem-index">Index (Optional - Override Auto-Index)</Label> <Input id="elem-index" {...register('index')} placeholder={`Auto (${currentComponent.index_type})`} aria-invalid={errors.index ? "true" : "false"} /> <p className='text-xs text-muted-foreground'>Leave empty for automatic index.</p> {errors.index && <p className="text-xs text-destructive">{errors.index.message}</p>} </div>
            <div className="grid gap-2"> <ElementSelector selectedElementIds={selectedParentIds} onChange={setSelectedParentIds} currentElementId={elementToEdit?.signatureElementId} currentComponentId={currentComponent?.signatureComponentId} label="Parent Elements (Optional)" /> <input type="hidden" {...register('parentIds')} /> {errors.parentIds && <p className="text-xs text-destructive">{typeof errors.parentIds.message === 'string' ? errors.parentIds.message : 'Invalid parent selection'}</p>} </div>
            <Button type="submit" disabled={isLoading || isFetchingDetails} className="mt-2"> {isLoading ? <LoadingSpinner size="sm" /> : (elementToEdit ? 'Update Element' : 'Create Element')} </Button>
        </form>
    );
};

export default ElementForm;