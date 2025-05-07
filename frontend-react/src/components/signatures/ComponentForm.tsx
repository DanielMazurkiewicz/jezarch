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
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility
import { toast } from "sonner"; // Import toast

interface ComponentFormProps {
  componentToEdit: SignatureComponent | null;
  onSave: () => void;
}

const ComponentForm: React.FC<ComponentFormProps> = ({ componentToEdit, onSave }) => {
  const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
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
            toast.info(t('componentNoChangesFound', preferredLanguage)); // Use translated info
            onSave(); // Still call onSave to close the dialog
            return; // Exit early
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
       const msg = err.message || t('componentSaveFailedError', preferredLanguage);
       setError(msg);
       toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg })); // Also show in toast
      console.error("Save Component Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 relative">
      {error && <ErrorDisplay message={error} className="mb-4" />}
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}
      {/* Form fields with smaller gaps */}
       <div className="grid gap-1.5">
           {/* Use translated label */}
          <Label htmlFor="comp-name">{t('componentNameLabel', preferredLanguage)} {t('requiredFieldIndicator', preferredLanguage)}</Label>
          <Input id="comp-name" {...register('name')} aria-invalid={!!errors.name} className={cn(errors.name && "border-destructive")} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
       </div>
       <div className="grid gap-1.5">
           {/* Use translated label */}
          <Label htmlFor="comp-description">{t('componentDescriptionLabel', preferredLanguage)} {t('optionalLabel', preferredLanguage)}</Label>
          <Textarea id="comp-description" {...register('description')} rows={3} aria-invalid={!!errors.description} className={cn(errors.description && "border-destructive")}/>
          {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
       </div>
       <div className="grid gap-1.5">
           {/* Use translated label */}
          <Label htmlFor="comp-index-type">{t('componentIndexTypeLabel', preferredLanguage)} {t('requiredFieldIndicator', preferredLanguage)}</Label>
          <Controller
             control={control}
             name="index_type"
             render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                   <SelectTrigger id='comp-index-type' aria-invalid={!!errors.index_type} className={cn(errors.index_type && "border-destructive")}>
                     <SelectValue placeholder={t('selectPlaceholder', preferredLanguage)} />
                   </SelectTrigger>
                   <SelectContent>
                      {/* Use translated options */}
                     <SelectItem value="dec">{t('indexTypeDecimal', preferredLanguage)}</SelectItem>
                     <SelectItem value="roman">{t('indexTypeRoman', preferredLanguage)}</SelectItem>
                     <SelectItem value="small_char">{t('indexTypeLowerLetter', preferredLanguage)}</SelectItem>
                     <SelectItem value="capital_char">{t('indexTypeUpperLetter', preferredLanguage)}</SelectItem>
                   </SelectContent>
                </Select>
             )}
          />
          {errors.index_type && <p className="text-xs text-destructive">{errors.index_type.message}</p>}
       </div>
        {/* Use translated button text */}
       <Button type="submit" disabled={isLoading} className="mt-2 justify-self-start"> {/* Align left */}
         {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (componentToEdit ? t('editButton', preferredLanguage) : t('createButton', preferredLanguage))} {t('componentSingularLabel', preferredLanguage)}
       </Button>
    </form>
  );
};

export default ComponentForm;