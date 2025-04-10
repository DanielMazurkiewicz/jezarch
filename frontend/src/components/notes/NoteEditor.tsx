import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Import Controller
import { zodResolver } from '@hookform/resolvers/zod';
import { noteFormSchema } from '@/lib/zodSchemas'; // Keep type import if needed elsewhere, but rely on inference for useForm
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import TagSelector from '@/components/shared/TagSelector';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Note, NoteInput } from '../../../../backend/src/functionalities/note/models'; // Import NoteInput type
import { toast } from "sonner";
import { cn } from '@/lib/utils'; // Import cn
import { z } from 'zod'; // Import z for inferring type in onSubmit

// Infer the form data type directly from the schema
type NoteFormData = z.infer<typeof noteFormSchema>;

interface NoteEditorProps {
  noteToEdit: Note | null;
  onSave: () => void; // Callback after successful save
}

const NoteEditor: React.FC<NoteEditorProps> = ({ noteToEdit, onSave }) => {
  const { token } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingDetails, setIsFetchingDetails] = useState(false); // Separate loading state
  const [error, setError] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const { register, handleSubmit, reset, control, setValue, watch, formState: { errors } } = useForm({ // Remove explicit type here
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: '',
      content: '',
      shared: false,
      tagIds: [],
    },
  });

   // Populate form when noteToEdit changes or on initial load
   useEffect(() => {
       const fetchFullNoteDetails = async (noteId: number) => {
           if (!token) return;
           setIsFetchingDetails(true); // Indicate details are loading
           setError(null);
           try {
               const fullNote = await api.getNoteById(noteId, token); // API should populate tags
               const tagIds = fullNote.tags?.map(t => t.tagId!) ?? [];

               reset({
                   title: fullNote.title || '',
                   content: fullNote.content || '',
                   shared: fullNote.shared || false,
                   tagIds: tagIds,
               });
               setSelectedTagIds(tagIds); // Sync TagSelector state
           } catch (err: any) {
                const msg = err.message || "Failed to load note details";
                setError(msg);
                toast.error(msg);
                console.error("Fetch Note Details Error:", err);
                // Reset to potentially stale data from list or defaults
                reset({
                     title: noteToEdit?.title || '',
                     content: noteToEdit?.content || '',
                     shared: noteToEdit?.shared || false,
                     tagIds: noteToEdit?.tags?.map(t => t.tagId!) ?? [],
                 });
                 setSelectedTagIds(noteToEdit?.tags?.map(t => t.tagId!) ?? []);
           } finally {
               setIsFetchingDetails(false);
           }
       };

       if (noteToEdit?.noteId) {
           fetchFullNoteDetails(noteToEdit.noteId);
       } else {
           // Reset form for creation
           reset({ title: '', content: '', shared: false, tagIds: [] });
           setSelectedTagIds([]);
           setError(null); // Clear any previous errors
           setIsFetchingDetails(false); // Not fetching details for new note
       }
   }, [noteToEdit, reset, token]);


  // Update form's tagIds when TagSelector changes
  useEffect(() => {
    setValue('tagIds', selectedTagIds);
  }, [selectedTagIds, setValue]);

  // Use the inferred type for 'data'
  const onSubmit = async (data: NoteFormData) => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    // Construct the payload according to the NoteInput interface
    const payload: NoteInput = {
        title: data.title,
        content: data.content ?? '', // Ensure content is string, even if undefined in form data
        shared: data.shared,
        tagIds: selectedTagIds, // Ensure the latest state is included
    };

    try {
      if (noteToEdit?.noteId) {
        // Pass the correctly typed payload
        await api.updateNote(noteToEdit.noteId, payload, token);
      } else {
        // Pass the correctly typed payload
        await api.createNote(payload, token);
      }
      onSave(); // Call the success callback (which handles toast and closing)
    } catch (err: any) {
      const msg = err.message || 'Failed to save note';
      setError(msg);
      toast.error(`Error saving note: ${msg}`);
      console.error("Save Note Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Show main loading spinner only when fetching details for editing
  if (isFetchingDetails) {
      return <div className="flex justify-center items-center p-10"><LoadingSpinner /></div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4 relative">
        {/* Display fetch/save errors */}
        {error && <ErrorDisplay message={error} className="mb-4" />}
        {/* Overlay spinner during save operation */}
        {isLoading && <div className='absolute inset-0 bg-background/50 flex items-center justify-center z-10 rounded-md'><LoadingSpinner/></div>}

      <div className="grid gap-1.5"> {/* Adjusted gap */}
        <Label htmlFor="title">Title</Label>
        <Input id="title" {...register('title')} aria-invalid={errors.title ? "true" : "false"} className={cn(errors.title && "border-destructive")}/>
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      <div className="grid gap-1.5"> {/* Adjusted gap */}
        <Label htmlFor="content">Content</Label>
        <Textarea id="content" {...register('content')} rows={6} aria-invalid={errors.content ? "true" : "false"} className={cn(errors.content && "border-destructive")}/>
        {errors.content && <p className="text-xs text-destructive">{errors.content.message}</p>}
      </div>

       <div className="grid gap-1.5"> {/* Adjusted gap */}
         <Label htmlFor="tags">Tags</Label>
         <TagSelector selectedTagIds={selectedTagIds} onChange={setSelectedTagIds} />
         {/* Hidden input registered with RHF for validation */}
         <input type="hidden" {...register('tagIds')} />
          {errors.tagIds && <p className="text-xs text-destructive">{typeof errors.tagIds.message === 'string' ? errors.tagIds.message : 'Invalid tag selection'}</p>}
       </div>

        {/* Use Controller for Shadcn Checkbox */}
       <div className="flex items-center space-x-2 pt-2"> {/* Added padding top */}
           <Controller
                name="shared"
                control={control}
                render={({ field }) => (
                     <Checkbox
                         id="shared"
                         checked={field.value}
                         onCheckedChange={field.onChange}
                         aria-invalid={errors.shared ? "true" : "false"}
                         className={cn(errors.shared && "border-destructive")}
                     />
                 )}
           />
          <Label htmlFor="shared" className='cursor-pointer font-normal'> {/* Make label clickable, normal weight */}
             Share this note publicly
          </Label>
        </div>
         {errors.shared && <p className="text-xs text-destructive">{errors.shared.message}</p>}


      <Button type="submit" disabled={isLoading || isFetchingDetails} className="mt-4 justify-self-start"> {/* Align button left */}
        {isLoading ? <LoadingSpinner size="sm" className='mr-2' /> : (noteToEdit ? 'Update Note' : 'Create Note')}
      </Button>
    </form>
  );
};

export default NoteEditor;