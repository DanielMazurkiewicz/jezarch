import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar'; // Import SearchFieldOption
import { Pagination } from '@/components/shared/Pagination';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Note, NoteInput } from '../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle } from 'lucide-react';
import { toast } from "sonner";
// Import Card components for layout
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const NOTES_PAGE_SIZE = 10; // Number of notes per page

const NotesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch available tags for the search bar options
  useEffect(() => {
    const fetchTags = async () => {
        if (!token) return;
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags);
        } catch (err) {
            console.error("Failed to fetch tags for search options:", err);
            // Optionally show a toast notification
        }
    };
    fetchTags();
  }, [token]);


  // Function to fetch/search notes, ensuring owner filter
  const fetchNotes = useCallback(async (page = currentPage, query = searchQuery) => {
    if (!token || !user?.userId) return; // Need userId for filtering
    setIsLoading(true);
    setError(null);
    try {
        // Always filter by the current user's ID
        const ownerFilter: SearchQueryElement = { field: 'ownerUserId', condition: 'EQ', value: user.userId, not: false };
        const queryWithoutOwner = query.filter(q => q.field !== 'ownerUserId'); // Avoid duplication

        const searchRequest: SearchRequest = {
            query: [...queryWithoutOwner, ownerFilter],
            page: page,
            pageSize: NOTES_PAGE_SIZE,
            // Optional: Default sort order
            // sort: [{ field: 'modifiedOn', direction: 'DESC' }] // TS2353: Comment out if 'sort' is not in SearchRequest type
        };
        const response = await api.searchNotes(searchRequest, token);
        setNotes(response.data);
        setTotalNotes(response.totalSize);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
    } catch (err: any) {
        const msg = err.message || 'Failed to fetch notes';
        setError(msg);
        toast.error(msg);
        console.error("Fetch Notes Error:", err);
        setNotes([]); // Clear data on error
        setTotalNotes(0);
        setTotalPages(1);
    } finally {
        setIsLoading(false);
    }
  }, [token, user?.userId, currentPage, searchQuery]); // Add userId dependency

  // Trigger fetchNotes on mount and when relevant state changes
  useEffect(() => {
    fetchNotes(currentPage, searchQuery);
  }, [fetchNotes, currentPage, searchQuery]);

  // --- CRUD Handlers ---
  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setEditingNote(null);
    setIsEditorOpen(true);
  };

   const handleDelete = async (noteId: number) => {
       if (!token || !noteId) return;

       // Check if user is admin (current backend requirement for delete)
       if (user?.role !== 'admin') {
           toast.error("Deletion currently restricted to administrators.");
           return;
       }

       if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

       setError(null);
       setIsLoading(true); // Use main loading state during delete

       try {
           await api.deleteNote(noteId, token);
           toast.success("Note deleted successfully.");

           // Refetch notes, adjust page if necessary
           const newTotalPages = Math.ceil((totalNotes - 1) / NOTES_PAGE_SIZE);
           const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;

           await fetchNotes(newCurrentPage, searchQuery); // Fetch potentially adjusted page
           if (currentPage !== newCurrentPage) {
                setCurrentPage(newCurrentPage); // Update local page state if changed
           }
       } catch (err: any) {
            const msg = err.message || 'Failed to delete note';
            setError(msg);
            toast.error(`Delete failed: ${msg}`);
            console.error("Delete Note Error:", err);
       } finally {
           setIsLoading(false);
       }
   };

  const handleSaveSuccess = async () => {
    setIsEditorOpen(false);
    setEditingNote(null);
    toast.success(editingNote ? "Note updated successfully." : "Note created successfully.");
    // Refresh the current page of notes
    await fetchNotes(currentPage, searchQuery);
  };

  // --- Search & Pagination Handlers ---
  const handleSearch = (newQuery: SearchRequest['query']) => {
      setSearchQuery(newQuery);
      setCurrentPage(1); // Reset to first page on new search
      // fetchNotes triggered by useEffect
  };

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      // fetchNotes triggered by useEffect
  };

  // Define fields for the SearchBar
  // Use SearchFieldOption[] type explicitly
  const searchFields: SearchFieldOption[] = [
      { value: 'title', label: 'Title', type: 'text' },
      { value: 'content', label: 'Content', type: 'text' },
      { value: 'shared', label: 'Is Shared', type: 'boolean' },
      // Change type to 'tags' and provide options
      {
        value: 'tags', // Field name the backend expects for tag ID search
        label: 'Tags', // User-facing label
        type: 'tags', // Use the new 'tags' type
        options: availableTags.map(t => ({value: t.tagId!, label: t.name})) // Map tags to options { value: id, label: name }
      },
  ];

  return (
    <div className="space-y-6"> {/* Overall page spacing */}
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                 <h1 className="text-2xl font-bold">My Notes</h1>
                 <p className='text-muted-foreground'>Create, view, and manage your personal notes.</p>
            </div>
            {/* Create Note Button and Dialog */}
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreateNew} className='shrink-0'>
                    <PlusCircle className="mr-2 h-4 w-4" /> Create Note
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                <DialogTitle>{editingNote ? 'Edit Note' : 'Create New Note'}</DialogTitle>
                </DialogHeader>
                {/* Render editor only when dialog is open to ensure fresh state/fetch */}
                {isEditorOpen && <NoteEditor noteToEdit={editingNote} onSave={handleSaveSuccess} />}
            </DialogContent>
            </Dialog>
        </div>

       {/* Search Bar Section */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading}
       />

        {/* Notes List Section */}
        <Card>
            <CardHeader>
                 {/* Optional: Title like "Notes List" could go here */}
                 {/* Error display inside the card header */}
                 {error && <ErrorDisplay message={error} />}
            </CardHeader>
            <CardContent> {/* Content area for list and pagination */}
                {/* Loading State */}
                {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}

                {/* List and Pagination */}
                {!isLoading && !error && (
                    <>
                    {/* Note List Table */}
                    <NoteList notes={notes} onEdit={handleEdit} onDelete={handleDelete} />

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="mt-6 flex justify-center">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={handlePageChange}
                            />
                        </div>
                    )}

                    {/* Empty State Messages */}
                    {notes.length === 0 && searchQuery.length > 0 && (
                        <p className="text-center text-muted-foreground pt-6">No notes found matching your search criteria.</p>
                    )}
                    {notes.length === 0 && searchQuery.length === 0 && (
                        <p className="text-center text-muted-foreground pt-6">You haven't created any notes yet. Click "Create Note" to start!</p>
                    )}
                    </>
                )}
            </CardContent>
        </Card>
    </div>
  );
};

export default NotesPage;