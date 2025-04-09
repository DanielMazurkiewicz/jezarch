import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Removed DialogClose as it's handled internally
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar from '@/components/shared/SearchBar';
import { Pagination } from '@/components/shared/Pagination';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { Note, NoteInput } from '../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle } from 'lucide-react';
import { toast } from "sonner";

const NOTES_PAGE_SIZE = 10; // Number of notes per page

const NotesPage: React.FC = () => {
  const { user, token } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]); // For search bar options
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch available tags once for the search bar
  useEffect(() => {
    const fetchTags = async () => {
        if (!token) return;
        try {
            const tags = await api.getAllTags(token);
            setAvailableTags(tags);
        } catch (err) {
            console.error("Failed to fetch tags for search options:", err);
            // Handle error if needed, maybe show a toast
        }
    };
    fetchTags();
  }, [token]);


  const fetchNotes = useCallback(async (page = currentPage, query = searchQuery) => {
    if (!token || !user?.userId) return; // Need userId for owner filter
    setIsLoading(true);
    setError(null);
    try {
        // Standard users should only search their own notes.
        // Admins *could* potentially search all, but the backend currently restricts this.
        // We enforce searching only the current user's notes here.
        const ownerFilter: SearchQueryElement = { field: 'ownerUserId', condition: 'EQ', value: user.userId, not: false };

        // Ensure ownerUserId filter isn't duplicated if already present (though unlikely)
        const queryWithoutOwner = query.filter(q => q.field !== 'ownerUserId');

        const searchRequest: SearchRequest = {
            query: [...queryWithoutOwner, ownerFilter],
            page: page,
            pageSize: NOTES_PAGE_SIZE,
        };
        const response = await api.searchNotes(searchRequest, token);
        setNotes(response.data);
        setTotalNotes(response.totalSize);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page); // Update current page from response
    } catch (err: any) {
        const msg = err.message || 'Failed to fetch notes';
        setError(msg);
        toast.error(msg);
        console.error("Fetch Notes Error:", err);
        setNotes([]);
        setTotalNotes(0);
        setTotalPages(1);
    } finally {
        setIsLoading(false);
    }
  }, [token, user?.userId, currentPage, searchQuery]); // Add userId dependency

  useEffect(() => {
    fetchNotes(currentPage, searchQuery);
  }, [fetchNotes, currentPage, searchQuery]); // Re-fetch when page or query changes

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setIsEditorOpen(true);
  };

  const handleCreateNew = () => {
    setEditingNote(null); // Clear editing note for creation
    setIsEditorOpen(true);
  };

  const handleDelete = async (noteId: number) => {
       if (!token || !noteId) return;

       // Authorization check: Find the note first (might be slightly inefficient but safer)
       // Alternatively, trust the backend to enforce this, which it should.
       const noteToDelete = notes.find(n => n.noteId === noteId);
       if (!noteToDelete) return; // Note not found in current list
        // Backend deleteNote currently requires admin. Adjust if regular users should delete their own.
       if (user?.role !== 'admin') {
           toast.error("Deletion currently restricted to administrators.");
           // Or if backend allows owner deletion:
           // if (user?.userId !== noteToDelete.ownerUserId) {
           //     toast.error("You can only delete your own notes.");
           //     return;
           // }
           return; // Block if not admin (based on current backend code)
       }


       if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

       setError(null);
       setIsLoading(true); // Show loading during delete

       try {
           await api.deleteNote(noteId, token);
           toast.success("Note deleted successfully.");
           // Refetch notes for the current page after delete
           // Adjust page if the last item on the last page was deleted
           const newTotalPages = Math.ceil((totalNotes - 1) / NOTES_PAGE_SIZE);
           const newCurrentPage = (currentPage > newTotalPages) ? Math.max(1, newTotalPages) : currentPage;

           // Fetch with potentially adjusted page
           await fetchNotes(newCurrentPage, searchQuery);
           if (currentPage !== newCurrentPage) {
                setCurrentPage(newCurrentPage); // Update local page state if it changed
           }

       } catch (err: any) {
            const msg = err.message || 'Failed to delete note';
            setError(msg);
            toast.error(`Failed to delete note: ${msg}`);
            console.error("Delete Note Error:", err);
       } finally {
           setIsLoading(false);
       }
   };

  const handleSaveSuccess = async () => {
    setIsEditorOpen(false);
    setEditingNote(null);
    toast.success(editingNote ? "Note updated successfully." : "Note created successfully.");
    await fetchNotes(currentPage, searchQuery); // Refresh the list after save
  };

  const handleSearch = (newQuery: SearchRequest['query']) => {
      setSearchQuery(newQuery);
      setCurrentPage(1); // Reset to first page on new search
      // fetchNotes is triggered by useEffect dependency change
  };

  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
      // fetchNotes is triggered by useEffect dependency change
  };

  // Define fields for the SearchBar
  const searchFields = [
      { value: 'title', label: 'Title', type: 'text' as const },
      { value: 'content', label: 'Content', type: 'text' as const },
      { value: 'shared', label: 'Is Shared', type: 'boolean' as const },
      // Add tags if backend search supports it well (needs ANY_OF with ID array)
      { value: 'tags', label: 'Tags (Any Of)', type: 'select' as const, options: availableTags.map(t => ({value: t.tagId!, label: t.name}))}, // Example: needs custom handler/input
  ];

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-2xl font-bold">My Notes</h1>
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
            {/* Render editor only when open to ensure fresh state/fetch */}
            {isEditorOpen && <NoteEditor noteToEdit={editingNote} onSave={handleSaveSuccess} />}
          </DialogContent>
        </Dialog>
      </div>

       {/* Search Bar */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading}
       />

      {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}
      {error && <ErrorDisplay message={error} />}

      {!isLoading && !error && (
        <>
          <NoteList notes={notes} onEdit={handleEdit} onDelete={handleDelete} />
           {totalPages > 1 && (
                <div className="mt-6 flex justify-center">
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                </div>
           )}
           {notes.length === 0 && searchQuery.length > 0 && (
               <p className="text-center text-muted-foreground mt-4">No notes found matching your search criteria.</p>
           )}
           {notes.length === 0 && searchQuery.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">You haven't created any notes yet. Click "Create Note" to start!</p>
           )}
        </>
      )}
    </div>
  );
};

export default NotesPage;