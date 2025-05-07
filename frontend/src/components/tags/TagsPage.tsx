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
      const msg = err.message || t('tagLoadFailedError', preferredLanguage); // Use translated error
      setError(msg);
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
    if (!isAdmin) {
        toast.error(t('tagsPermissionErrorEdit', preferredLanguage));
        return;
    };
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (tagId: number) => {
      if (!token || !tagId || !isAdmin) {
          toast.error(t('tagsPermissionErrorDelete', preferredLanguage));
          return;
      }
      const tagToDelete = tags.find(t => t.tagId === tagId);
      if (!window.confirm(t('tagsConfirmDeleteMessage', preferredLanguage, { tagName: tagToDelete?.name ?? tagId }))) {
          return;
      }

      setError(null);
      setIsLoading(true); // Show loading indicator during delete

      try {
          await api.deleteTag(tagId, token);
          toast.success(t('tagsDeleteSuccess', preferredLanguage, { tagName: tagToDelete?.name ?? tagId }));
          await fetchTags(); // Refresh list after delete
      } catch (err: any) {
           const msg = err.message || 'Failed';
           setError(t('tagsDeleteFailed', preferredLanguage, { message: msg }));
           toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('tagsDeleteFailed', preferredLanguage, { message: msg }) }));
           console.error("Delete Tag Error:", err);
      } finally {
          setIsLoading(false); // Hide loading indicator
      }
  };

  // Callback when form saves successfully
  const handleSaveSuccess = async () => {
    setIsFormOpen(false); // Close the dialog
    setEditingTag(null); // Reset editing state
    const actionText = editingTag ? t('updated', preferredLanguage) : t('created', preferredLanguage); // TODO: Add updated/created keys
    toast.success(t('tagSaveSuccess', preferredLanguage, { action: actionText })); // TODO: Add tagSaveSuccess
    await fetchTags(); // Refresh the list to show changes
  };

  return (
    <div className="space-y-6"> {/* Overall page spacing */}
       {/* Header Section */}
       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div>
                <h1 className="text-2xl font-bold">{t('tagsTitle', preferredLanguage)}</h1>
                <p className='text-muted-foreground'>{t('tagsDescription', preferredLanguage)}</p>
            </div>
            {/* Create Tag Button & Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogTrigger asChild>
                {/* Allow any authenticated user to trigger create */}
                <Button onClick={handleCreateNew} className='shrink-0'>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('createButton', preferredLanguage)} {t('tagLabelSingular', preferredLanguage)}
                </Button>
                </DialogTrigger>
                {/* Dialog Content for the form */}
                <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingTag ? t('tagsEditTitle', preferredLanguage) : t('tagsCreateTitle', preferredLanguage)}</DialogTitle>
                    <DialogDescription>{editingTag ? t('tagsEditDialogDescription', preferredLanguage, { tagName: editingTag.name }) : t('tagsCreateDialogDescription', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                {/* Conditionally render form to reset state when closed/reopened */}
                {isFormOpen && <TagForm tagToEdit={editingTag} onSave={handleSaveSuccess} />}
                </DialogContent>
            </Dialog>
       </div>

        {/* Tags List Section */}
        <Card>
            <CardHeader>
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
                     <p className="text-center text-muted-foreground pt-6">{t('tagsNoTagsFound', preferredLanguage)} {t('tagsClickCreateHint', preferredLanguage)}</p>
                )}
                 {/* Error State Message */}
                {!isLoading && error && tags.length === 0 && (
                    <p className="text-center text-destructive pt-6">{t('tagsLoadErrorPlaceholder', preferredLanguage)}</p> // TODO: Add tagsLoadErrorPlaceholder
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default TagsPage;
