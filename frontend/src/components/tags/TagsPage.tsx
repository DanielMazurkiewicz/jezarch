import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Use Dialog component
import TagList from './TagList';
import TagForm from './TagForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { PlusCircle } from 'lucide-react';
import { toast } from "sonner"; // Import toast

const TagsPage: React.FC = () => {
  const { token, user } = useAuth(); // Get user for role check
  const isAdmin = user?.role === 'admin';
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    try {
      const fetchedTags = await api.getAllTags(token);
      setTags(fetchedTags);
    } catch (err: any) {
      const msg = err.message || 'Failed to fetch tags';
      setError(msg);
      toast.error(msg);
      console.error("Fetch Tags Error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleEdit = (tag: Tag) => {
    if (!isAdmin) {
        toast.error("Only administrators can edit tags.");
        return;
    };
    setEditingTag(tag);
    setIsFormOpen(true);
  };

  const handleCreateNew = () => {
    // Backend allows regular users to create, so no admin check here
    // unless frontend requirements differ.
    setEditingTag(null);
    setIsFormOpen(true);
  };

  const handleDelete = async (tagId: number) => {
      if (!token || !tagId || !isAdmin) {
          toast.error("Only administrators can delete tags.");
          return;
      }
      // Add confirmation dialog
      if (!window.confirm("Are you sure you want to delete this tag? This will remove it from all associated notes and documents.")) {
          return;
      }

      setError(null);
      setIsLoading(true); // Indicate loading state

      try {
          await api.deleteTag(tagId, token);
          toast.success("Tag deleted successfully.");
          await fetchTags(); // Refetch after delete
      } catch (err: any) {
           const msg = err.message || 'Failed to delete tag';
           setError(msg);
           toast.error(`Failed to delete tag: ${msg}`);
           console.error("Delete Tag Error:", err);
      } finally {
          setIsLoading(false);
      }
  };

  const handleSaveSuccess = async () => {
    setIsFormOpen(false);
    setEditingTag(null);
    toast.success(editingTag ? "Tag updated successfully." : "Tag created successfully.");
    await fetchTags(); // Refresh the list
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">Manage Tags</h1>
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogTrigger asChild>
              {/* Allow anyone to trigger create based on backend */}
              <Button onClick={handleCreateNew} className='shrink-0'>
                <PlusCircle className="mr-2 h-4 w-4" /> Create Tag
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingTag ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
              </DialogHeader>
              {/* Render form only when open */}
              {isFormOpen && <TagForm tagToEdit={editingTag} onSave={handleSaveSuccess} />}
            </DialogContent>
          </Dialog>
      </div>

      {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}
      {error && <ErrorDisplay message={error} />}

      {!isLoading && !error && (
        <TagList tags={tags} onEdit={handleEdit} onDelete={handleDelete} />
      )}
      {!isLoading && !error && tags.length === 0 && (
        <p className="text-center text-muted-foreground mt-4">No tags found. Click "Create Tag" to add one.</p>
      )}
    </div>
  );
};

export default TagsPage;