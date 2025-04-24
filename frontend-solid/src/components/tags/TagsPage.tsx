import { Component, createSignal, createResource, Show } from 'solid-js'; // Removed onMount
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import TagList from './TagList';
import TagForm from './TagForm';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Icon } from '@/components/shared/Icon';
import { Card, CardContent, CardHeader } from '@/components/ui/Card'; // Removed unused Title/Desc
import styles from './TagsPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn

const TagsPage: Component = () => {
    const [authState] = useAuth();
    const [editingTag, setEditingTag] = createSignal<Tag | null>(null);
    const [isFormOpen, setIsFormOpen] = createSignal(false);

    const isAdmin = () => authState.user?.role === 'admin';

    // Resource to fetch tags, refetches when authState.token changes
    const [tagsResource, { refetch: refetchTags }] = createResource(
        () => authState.token, // Depend on token
        async (token) => {
            if (!token) return []; // Don't fetch if no token
            console.log("Fetching tags...");
            try {
                 const fetchedTags = await api.getAllTags(token);
                 return fetchedTags.sort((a, b) => a.name.localeCompare(b.name));
            } catch (error) {
                 console.error("Fetch Tags Error:", error);
                 // TODO: Implement better global error handling/toast
                 throw error; // Re-throw for resource error handling
            }
        },
        { initialValue: [] } // Start with an empty array
    );

    const handleEdit = (tag: Tag) => {
        if (!isAdmin()) {
            // TODO: Show toast/notification
            console.error("Permission denied: Only admins can edit tags.");
            return;
        }
        setEditingTag(tag);
        setIsFormOpen(true); // Open the dialog
    };

    const handleCreateNew = () => {
        if (!isAdmin()) return; // Prevent opening dialog if not admin
        setEditingTag(null);
        setIsFormOpen(true); // Open the dialog
    };

    const handleDelete = async (tagId: number) => {
        const token = authState.token;
        if (!isAdmin() || !token) {
            // TODO: Show toast/notification
             console.error("Permission denied or not authenticated.");
            return;
        }
        if (!window.confirm("Are you sure you want to delete this tag?")) return;

        try {
            await api.deleteTag(tagId, token);
            // TODO: Show success toast
            console.log("Tag deleted successfully.");
            refetchTags(); // Refetch after successful delete
        } catch (err: any) {
            console.error("Delete Tag Error:", err);
            // TODO: Show error toast
        }
    };

    const handleSaveSuccess = () => {
        setIsFormOpen(false); // Close the dialog
        refetchTags(); // Refresh the list
        // TODO: Show success toast
         console.log("Tag saved successfully.");
    };

    // Dialog open change handler (simplified)
    const handleOpenChange = (open: boolean) => {
        setIsFormOpen(open);
        if (!open) {
            setEditingTag(null); // Reset editing state when dialog closes
        }
    };

    return (
        <div class={styles.tagsPageContainer}>
            <div class={styles.headerContainer}>
                <div class={styles.headerTextContent}>
                    <h1 class={styles.pageTitle}>Manage Tags</h1>
                    <p class={styles.pageDescription}>Organize your notes and documents using tags.</p>
                </div>
                {/* Use Dialog component */}
                <Dialog open={isFormOpen()} onOpenChange={handleOpenChange}>
                    <DialogTrigger asChild>
                        {/* Button to open the dialog */}
                         {/* Disable button if not admin */}
                         <Button onClick={handleCreateNew} class={styles.createButtonContainer} disabled={!isAdmin()} title={!isAdmin() ? "Admin required" : "Create New Tag"}>
                            <Icon name="PlusCircle" class={styles.iconMargin}/> Create Tag
                        </Button>
                    </DialogTrigger>
                    {/* DialogContent is rendered by Dialog when open */}
                    <DialogContent size="sm">
                        <DialogHeader>
                            <DialogTitle>{editingTag() ? 'Edit Tag' : 'Create New Tag'}</DialogTitle>
                        </DialogHeader>
                         {/* Wrap form in DialogBody for scrolling */}
                         <DialogBody>
                            <TagForm tagToEdit={editingTag()} onSave={handleSaveSuccess} />
                         </DialogBody>
                    </DialogContent>
                </Dialog>
            </div>

            <Card class={styles.tagsListCard}>
                 {/* Removed CardHeader */}
                <CardContent>
                    <Show when={tagsResource.error}>
                         {(error) => <ErrorDisplay message={`Failed to load tags: ${error()?.message}`} />}
                    </Show>
                    <Show when={tagsResource.loading}>
                        <div class={styles.loadingContainer}>
                            <LoadingSpinner size="lg" />
                        </div>
                    </Show>
                    <Show when={!tagsResource.loading && !tagsResource.error && tagsResource()}>
                        {(tags) => (
                            <Show when={tags().length > 0} fallback={<p class={styles.emptyStateText}>No tags found.{isAdmin() ? ' Click "Create Tag" to add one.' : ''}</p>}>
                                <TagList tags={tags()} onEdit={handleEdit} onDelete={handleDelete} />
                            </Show>
                        )}
                    </Show>
                </CardContent>
            </Card>
        </div>
    );
};

export default TagsPage;