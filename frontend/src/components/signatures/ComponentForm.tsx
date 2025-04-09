import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSignatureComponentFormSchema, CreateSignatureComponentFormData } from '@/lib/zodSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
// Correctly import both Create and Update input types
import type { SignatureComponent, SignatureComponentIndexType, CreateSignatureComponentInput, UpdateSignatureComponentInput } from '../../../../backend/src/functionalities/signature/component/models';

interface ComponentFormProps {
  componentToEdit: SignatureComponent | null;
  onSave: () => void;
}

const ComponentForm: React.FC<ComponentFormProps> = ({ componentToEdit, onSave }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, control, formState: { errors } } = useForm<CreateSignatureComponentFormData>({
    resolver: zodResolver(createSignatureComponentFormSchema),
    defaultValues: { name: '', description: '', index_type: 'dec', },
  });

  useEffect(() => {
    if (componentToEdit) {
      reset({
        name: componentToEdit.name || '',
        description: componentToEdit.description || '',
        index_type: componentToEdit.index_type || 'dec',
      });
    } else {
      reset({ name: '', description: '', index_type: 'dec' });
    }
  }, [componentToEdit, reset]);

  const onSubmit = async (data: CreateSignatureComponentFormData) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      if (componentToEdit?.signatureComponentId) {
        const updatePayload: UpdateSignatureComponentInput = {};
        if (data.name !== componentToEdit.name) updatePayload.name = data.name;
        if (data.description !== componentToEdit.description) updatePayload.description = data.description ?? null;
        if (data.index_type !== componentToEdit.index_type) updatePayload.index_type = data.index_type;

        if (Object.keys(updatePayload).length > 0) {
             await api.updateSignatureComponent(componentToEdit.signatureComponentId, updatePayload, token);
        } else {
            console.log("No changes detected for component update.");
        }
      } else {
        // Correctly typed createPayload using the imported type
        const createPayload: CreateSignatureComponentInput = {
            name: data.name,
            description: data.description ?? undefined, // Backend expects string | undefined
            index_type: data.index_type
        };
        await api.createSignatureComponent(createPayload, token);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save component');
      console.error("Save Component Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 relative">
      {error && <ErrorDisplay message={error} />}
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}
      {/* Form fields remain the same */}
       <div className="grid gap-2"> <Label htmlFor="comp-name">Component Name</Label> <Input id="comp-name" {...register('name')} /> {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>} </div>
       <div className="grid gap-2"> <Label htmlFor="comp-description">Description (Optional)</Label> <Textarea id="comp-description" {...register('description')} rows={3} /> {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>} </div>
       <div className="grid gap-2"> <Label htmlFor="comp-index-type">Index Formatting</Label> <Controller control={control} name="index_type" render={({ field }) => ( <Select onValueChange={field.onChange} value={field.value}> <SelectTrigger id='comp-index-type'> <SelectValue placeholder="Select index type" /> </SelectTrigger> <SelectContent> <SelectItem value="dec">Decimal (1, 2, 3...)</SelectItem> <SelectItem value="roman">Roman (I, II, III...)</SelectItem> <SelectItem value="small_char">Lowercase Letters (a, b, c...)</SelectItem> <SelectItem value="capital_char">Uppercase Letters (A, B, C...)</SelectItem> </SelectContent> </Select> )} /> {errors.index_type && <p className="text-xs text-destructive">{errors.index_type.message}</p>} </div>
       <Button type="submit" disabled={isLoading} className="mt-2"> {isLoading ? <LoadingSpinner size="sm" /> : (componentToEdit ? 'Update Component' : 'Create Component')} </Button>
    </form>
  );
};

export default ComponentForm;