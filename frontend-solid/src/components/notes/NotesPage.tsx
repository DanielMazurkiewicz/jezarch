import { Component, createSignal, createResource, Show, Suspense, createMemo } from 'solid-js'; // Added createMemo
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';

import { Button } from '@/components/ui/Button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogBody } from '@/components/ui/Dialog'; // Added DialogBody
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import NotePreviewDialog from './NotePreviewDialog';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchBar
import { Icon } from '@/components/shared/Icon';
import { Pagination } from '@/components/shared/Pagination'; // Import Pagination
import styles from './NotesPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils'; // Import cn if needed

const NOTES_PAGE_SIZE = 10; // Define page size

const NotesPage: Component = () => {
    const [authState] = useAuth();
    const [editingNote, setEditingNote] = createSignal<NoteWithDetails | null>(null);
    const [previewingNote, setPreviewingNote] = createSignal<NoteWithDetails | null>(null);
    const [isEditorOpen, setIsEditorOpen] = createSignal(false);
    const [isPreviewOpen, setIsPreviewOpen] = createSignal(false);

    // State for search and pagination
    const [searchQuery, setSearchQuery] = createSignal<SearchRequest['query']>([]);
    const [currentPage, setCurrentPage] = createSignal(1);

    // Resource for available tags (for search bar options)
    const [availableTags] = createResource(
        () => authState.token,
        async (token) => {
            if (!token) return [];
            try { return await api.getAllTags(token); }
            catch { console.error("Failed to load tags for search"); return []; }
        },
        { initialValue: [] }
    );

    // Resource for notes data - depends on token, current page, and search query
    const [notesData, { refetch: refetchNotes }] = createResource(
        () => ({ token: authState.token, page: currentPage(), query: searchQuery() }), // Dependencies
        async ({ token, page, query }) => {
            if (!token) return { data: [], totalSize: 0, totalPages: 1, page: 1 }; // Default empty state
            console.log(`Fetching notes - Page: ${page}, Query:`, query);
            const searchRequest: SearchRequest = { query: query, page, pageSize: NOTES_PAGE_SIZE };
            try {
                const response = await api.searchNotes(searchRequest, token);
                return response;
            } catch (error) {
                console.error("Fetch Notes Error:", error);
                 // TODO: Handle error more gracefully (e.g., toast)
                throw error; // Propagate error to resource state
            }
        },
        { initialValue: { data: [], totalSize: 0, totalPages: 1, page: 1 } } // Initial structure
    );

    // --- CRUD Handlers ---
    const handleEdit = (note: NoteWithDetails) => {
        setEditingNote(note);
        setIsEditorOpen(true);
    };

    const handleCreateNew = () => {
        setEditingNote(null);
        setIsEditorOpen(true);
    };

    const handleDelete = async (noteId: number) => {
        const token = authState.token;
        if (!token || !noteId) { /* TODO: toast error */ return; }
        // TODO: Add check if user is owner or admin if needed based on backend policy
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        try {
            await api.deleteNote(noteId, token);
            // TODO: toast success
            // Refresh data after delete - potentially adjust page if last item removed
            const currentTotal = notesData()?.totalSize ?? 0;
            const newTotal = currentTotal - 1;
            const newTotalPages = Math.max(1, Math.ceil(newTotal / NOTES_PAGE_SIZE));
            if (currentPage() > newTotalPages && newTotalPages > 0) { // Ensure newTotalPages is positive
                setCurrentPage(newTotalPages); // This will trigger refetch via resource dependency
            } else {
                refetchNotes();
            }
        } catch (err: any) {
            console.error("Delete Note Error:", err);
            // TODO: toast error
        }
    };

    const handleSaveSuccess = () => {
        setIsEditorOpen(false); // Close the dialog
        // TODO: toast success
        refetchNotes(); // Refresh the list
    };

    // --- Preview Handler ---
    const handlePreview = (note: NoteWithDetails) => {
        setPreviewingNote(note);
        setIsPreviewOpen(true);
    };

    // --- Editor Dialog Open Change ---
    const handleEditorOpenChange = (open: boolean) => {
        setIsEditorOpen(open);
        if (!open) { setEditingNote(null); } // Reset on close
    };

     // --- Preview Dialog Open Change ---
     const handlePreviewOpenChange = (open: boolean) => {
         setIsPreviewOpen(open);
         if (!open) { setPreviewingNote(null); } // Reset on close
     };

    // --- Search & Pagination Handlers ---
    const handleSearch = (newQuery: SearchRequest['query']) => {
        if (JSON.stringify(newQuery) !== JSON.stringify(searchQuery())) {
            setSearchQuery(newQuery);
            setCurrentPage(1); // Reset page on new search
        }
    };
    const handlePageChange = (newPage: number) => {
        if (newPage !== currentPage()) {
            setCurrentPage(newPage);
        }
    };

    // --- Search Fields Definition ---
    const searchFields = createMemo((): SearchFieldOption[] => {
         const fields: SearchFieldOption[] = [
             { value: 'title', label: 'Title', type: 'text' as const },
             { value: 'content', label: 'Content', type: 'text' as const },
             { value: 'shared', label: 'Is Shared', type: 'boolean' as const },
             {
               value: 'tags', label: 'Tags', type: 'tags' as const,
               // Map tag resource data to options format
               options: availableTags()?.map(t => ({value: t.tagId!, label: t.name})) ?? []
             },
         ];
         // Only allow admins to search by owner
         if (authState.user?.role === 'admin') {
              fields.push({ value: 'ownerLogin', label: 'Owner Login', type: 'text' as const });
         }
         return fields;
    });

    // Check if the resource is ready (not loading and no error)
    const isNotesDataReady = createMemo(() => !notesData.loading && !notesData.error && !!notesData());
    // Memoize the actual data array to avoid re-calculation
    const currentNotes = createMemo(() => notesData()?.data ?? []);

    return (
        <div class={styles.notesPageContainer}>
            <div class={styles.headerContainer}>
                <div class={styles.headerTextContent}>
                    <h1 class={styles.pageTitle}>Notes</h1>
                    <p class={styles.pageDescription}>Create, view, and manage personal & shared notes.</p>
                </div>
                <Dialog open={isEditorOpen()} onOpenChange={handleEditorOpenChange}>
                    <DialogTrigger asChild>
                        <Button onClick={handleCreateNew} class={styles.createButtonContainer}>
                            <Icon name="PlusCircle" class={styles.iconMargin}/> Create Note
                        </Button>
                    </DialogTrigger>
                    <DialogContent size="md">
                        <DialogHeader>
                            <DialogTitle>{editingNote() ? 'Edit Note' : 'Create New Note'}</DialogTitle>
                        </DialogHeader>
                        {/* Wrap Form in DialogBody */}
                         <DialogBody>
                            <NoteEditor noteToEdit={editingNote()} onSave={handleSaveSuccess} />
                         </DialogBody>
                    </DialogContent>
                </Dialog>
            </div>

             {/* Search Bar Component */}
             <div class={styles.searchBarContainer}>
                <Suspense fallback={<LoadingSpinner/>}> {/* Suspense for tag loading */}
                    <SearchBar fields={searchFields()} onSearch={handleSearch} isLoading={notesData.loading} />
                 </Suspense>
             </div>

            <Card class={styles.notesListCard}>
                 {/* No Header needed here */}
                <CardContent>
                     <Show when={notesData.error}>
                         <ErrorDisplay message={`Failed to load notes: ${notesData.error?.message}`} />
                     </Show>
                     <Show when={notesData.loading && !currentNotes().length}> {/* Show loader only if no data is present yet */}
                         <div class={styles.loadingContainer}>
                             <LoadingSpinner size="lg" />
                         </div>
                     </Show>
                      {/* Use memoized check for readiness */}
                      <Show when={isNotesDataReady()}>
                         {/* Access the memoized notes array */}
                         <Show when={currentNotes().length > 0}
                             fallback={<p class={styles.emptyStateText}>{searchQuery().length > 0 ? 'No notes match your search.' : 'No notes yet. Create one!'}</p>}
                         >
                             <NoteList notes={currentNotes()} onEdit={handleEdit} onDelete={handleDelete} onPreview={handlePreview} />
                         </Show>
                      </Show>

                     {/* Pagination Component */}
                     <Show when={isNotesDataReady() && (notesData()?.totalPages ?? 0) > 1}>
                         <div class={styles.paginationContainer}>
                             <Pagination
                                 currentPage={currentPage()}
                                 totalPages={notesData()?.totalPages ?? 1}
                                 onPageChange={handlePageChange}
                             />
                         </div>
                     </Show>
                </CardContent>
            </Card>

             {/* Note Preview Dialog */}
             <NotePreviewDialog
                 isOpen={isPreviewOpen()}
                 onOpenChange={handlePreviewOpenChange}
                 note={previewingNote()}
             />

        </div>
    );
};

export default NotesPage;