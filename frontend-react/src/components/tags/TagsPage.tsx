import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'; // Added DialogDescription
import TagList from './TagList';
import TagForm from './TagForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { PlusCircle } from 'lucide-react';
import { toast } from "sonner";
// Import Card components for layout
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { t } from '@/translations/utils'; // Import translation utility

const TagsPage: React.FC = () => {
  const { token, user, preferredLanguage } = useAuth(); // Get preferredLanguage
  const isAdmin = user?.role === 'admin'; // Check if current user is an admin
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true); // Start loading initially
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Function to fetch all tags
  const fetchTags = useCallback(async () => {
    if (!token) {
        setIsLoading(false); // Ensure loading stops if no token
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTags = await api.getAllTags(token);
      // Sort tags alphabetically by name
      setTags(fetchedTags.sort((a, b) => a.name.localeCompare(b.name)));
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch tags';
      setError(msg);
      // Use translated error template
      toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
      console.error("Fetch Tags Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token, preferredLanguage]); // Add preferredLanguage

  // Fetch tags on component mount
  useEffect(() => {
    fetchTags();
  }, [fetchTags]); // fetchTags includes token dependency

  // --- CRUD Handlers ---
  const handleEdit = (tag: Tag) => {
    // Only allow admins to edit
    if (!isAdmin) {
        // Use translated error
        toast.error(t('errorMessageTemplate', preferredLanguage, { message: "Only administrators can edit tags."})); // TODO: Add specific key
        return;
    };
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    // Allow any authenticated user to open the create form (backend enforces creation permission)
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (tagId: number) => {
      // Only allow admins to delete
      if (!token || !tagId || !isAdmin) {
          // Use translated error
          toast.error(t('errorMessageTemplate', preferredLanguage, { message: "Only administrators can delete tags."})); // TODO: Add specific key
          return;
      }
      // Use translated confirmation
      if (!window.confirm(t('confirmActionMessage', preferredLanguage) + " (Tag Delete)")) { // TODO: Add specific key
          return;
      }

      setError(null);
      setIsLoading(true); // Show loading indicator during delete

      try {
          await api.deleteTag(tagId, token);
          // Use translated success message
          toast.success(t('successMessageTemplate', preferredLanguage, { message: "Tag deleted successfully."})); // TODO: Add specific key
          await fetchTags(); // Refresh list after delete
      } catch (err: any) {
           const msg = err.message || 'Failed to delete tag';
           setError(msg); // Show error message on page
           // Use translated error template
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
           console.error("Delete Tag Error:", err);
      } finally {
          setIsLoading(false); // Hide loading indicator
      }
  };

  // Callback when form saves successfully
  const handleSaveSuccess = async () => {
    setIsFormOpen(false); // Close the dialog
    setEditingTag(null); // Reset editing state
    // Use translated success message
    toast.success(t('successMessageTemplate', preferredLanguage, { message: editingTag ? "Tag updated successfully." : "Tag created successfully."})); // TODO: Add specific keys
    await fetchTags(); // Refresh the list to show changes
  };

  return (
    <div className="space-y-6"> {/* Overall page spacing */}
       {/* Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
                 {/* Use translated title and description */}
                <h1 className="text-2xl font-bold">{t('tagsTitle', preferredLanguage)}</h1>
                <p className='text-muted-foreground'>{t('tagsDescription', preferredLanguage)}</p>
            </div>
            {/* Create Tag Button & Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                {/* Allow any authenticated user to trigger create */}
                <Button onClick={handleCreateNew} className='shrink-0'>
                    <PlusCircle className="mr-2 h-4 w-4" />
                     {/* Use translated button */}
                    {t('createButton', preferredLanguage)} {t('tagLabelSingular', preferredLanguage)} {/* Use singular key */}
                </Button>
                </DialogTrigger>
                {/* Dialog Content for the form */}
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                     {/* Use translated title */}
                    <DialogTitle>{editingTag ? t('tagsEditTitle', preferredLanguage) : t('tagsCreateTitle', preferredLanguage)}</DialogTitle> {/* Use specific titles */}
                     {/* --- ADDED DialogDescription --- */}
                     <DialogDescription>{editingTag ? `Edit the tag "${editingTag.name}".` : 'Create a new tag to organize content.'}</DialogDescription> {/* TODO: Translate descriptions */}
                </DialogHeader>
                {/* Conditionally render form to reset state when closed/reopened */}
                {isFormOpen && <TagForm tagToEdit={editingTag} onSave={handleSaveSuccess} />}
                </DialogContent>
            </Dialog>
       </div>

        {/* Tags List Section */}
        <Card>
            <CardHeader>
                 {/* Optional Title: <CardTitle>Available Tags</CardTitle> */}
                 {/* Error display */}
                 {error && <ErrorDisplay message={error} />}
            </CardHeader>
            <CardContent>
                {/* Loading state */}
                {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}

                {/* Tag List Table */}
                {!isLoading && !error && (
                    <TagList tags={tags} onEdit={handleEdit} onDelete={handleDelete} />
                )}
                {/* Empty State Message */}
                {!isLoading && !error && tags.length === 0 && (
                     // Use translated empty state
                     <p className="text-center text-muted-foreground pt-6">{t('tagsNoTagsFound', preferredLanguage)} {t('tagsClickCreateHint', preferredLanguage)}</p>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default TagsPage;