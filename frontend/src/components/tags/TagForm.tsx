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

interface TagFormProps {
  tagToEdit: Tag | null;
  onSave: () => void; // Callback after successful save
}

const TagForm: React.FC<TagFormProps> = ({ tagToEdit, onSave }) => {
  const { token } = useAuth();
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

    // Prepare payload: API expects Partial<Pick<Tag, 'name' | 'description'>> for update
    // and Pick<Tag, 'name' | 'description'> for create.
    // TagFormData matches the create structure. For update, we pass the same structure,
    // the API should handle partial updates based on provided fields.
    const payload: Pick<Tag, 'name' | 'description'> = {
        name: data.name,
        description: data.description ?? undefined, // Send undefined if null/empty to potentially clear it
    };

    try {
      if (tagToEdit?.tagId) {
        // Pass the structured payload to updateTag
        await api.updateTag(tagToEdit.tagId, payload, token);
      } else {
        await api.createTag(payload, token);
      }
      onSave();
    } catch (err: any) {
      setError(err.message || 'Failed to save tag');
      console.error("Save Tag Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

   if (isLoading && !tagToEdit) { // Show loading only on initial create load if needed
      return <LoadingSpinner />;
   }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 relative"> {/* Added relative positioning */}
      {error && <ErrorDisplay message={error} />}
       {/* Overlay spinner */}
       {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}

      <div className="grid gap-2">
        <Label htmlFor="tag-name">Tag Name</Label>
        <Input id="tag-name" {...register('name')} />
        {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tag-description">Description (Optional)</Label>
        <Textarea id="tag-description" {...register('description')} rows={3} />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>

      <Button type="submit" disabled={isLoading} className="mt-2">
        {isLoading ? <LoadingSpinner size="sm" /> : (tagToEdit ? 'Update Tag' : 'Create Tag')}
      </Button>
    </form>
  );
};

export default TagForm;