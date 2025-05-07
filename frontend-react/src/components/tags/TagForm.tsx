import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { tagFormSchema, TagFormData } from '@/lib/zodSchemas';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { cn } from '@/lib/utils'; // Import cn
import { t } from '@/translations/utils'; // Import translation utility

interface TagFormProps {
  tagToEdit: Tag | null;
  onSave: () => void; // Callback after successful save
}

const TagForm: React.FC<TagFormProps> = ({ tagToEdit, onSave }) => {
  const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<TagFormData>({
    resolver: zodResolver(tagFormSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (tagToEdit) {
      reset({
        name: tagToEdit.name || '',
        description: tagToEdit.description || '',
      });
    } else {
      reset({ name: '', description: '' });
    }
  }, [tagToEdit, reset]);

  const onSubmit = async (data: TagFormData) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    const payload: Pick<Tag, 'name' | 'description'> = {
        name: data.name,
        description: data.description ?? undefined, // Send undefined if null/empty to potentially clear it
    };

    try {
      if (tagToEdit?.tagId) {
        await api.updateTag(tagToEdit.tagId, payload, token);
      } else {
        await api.createTag(payload, token);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save tag'); // TODO: Translate error
      console.error("Save Tag Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 relative"> {/* Added relative positioning */}
      {error && <ErrorDisplay message={error} className="mb-4" />}
       {/* Overlay spinner */}
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}

      <div className="grid gap-1.5"> {/* Adjusted gap */}
         {/* Use translated label */}
        <Label htmlFor="tag-name">{t('nameLabel', preferredLanguage)}</Label>
        <Input id="tag-name" {...register('name')} aria-invalid={errors.name ? "true" : "false"} className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-1.5"> {/* Adjusted gap */}
         {/* Use translated label */}
        <Label htmlFor="tag-description">{t('descriptionLabel', preferredLanguage)} {t('optionalLabel', preferredLanguage)}</Label>
        <Textarea id="tag-description" {...register('description')} rows={3} aria-invalid={errors.description ? "true" : "false"} className={cn(errors.description && "border-destructive")} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

       {/* Use translated button text */}
       <Button type="submit" disabled={isLoading} className="mt-2 justify-self-start"> {/* Align left */}
        {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (tagToEdit ? t('editButton', preferredLanguage) : t('createButton', preferredLanguage))} {t('tagsTitle', preferredLanguage, { count: 1 }).replace('Tags', 'Tag')} {/* Example of adapting plural key */}
      </Button>
    </form>
  );
};

export default TagForm;