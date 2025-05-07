import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'; // Removed unused imports
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import { Pagination } from '@/components/shared/Pagination';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { NoteInput, NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle } from 'lucide-react'; // Removed unused X icon
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import NotePreviewDialog from './NotePreviewDialog'; // Import the extracted component
import { t } from '@/translations/utils'; // Import translation utility

const NOTES_PAGE_SIZE = 10;

const NotesPage: React.FC = () => {
  const { user, token, isLoading: isAuthLoading, preferredLanguage } = useAuth(); // Get preferredLanguage
  const isAdmin = user?.role === 'admin';
  const [notes, setNotes] = useState<NoteWithDetails[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<NoteWithDetails | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // --- State for Preview ---
  const [previewingNote, setPreviewingNote] = useState<NoteWithDetails | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // -------------------------

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
        }
    };
    if (token) { fetchTags(); }
  }, [token]);

  // Function to fetch/search notes
  const fetchNotes = useCallback(async (page = currentPage, query = searchQuery) => {
    if (!token || !user?.userId) {
        console.warn("NotesPage: fetchNotes called without user/token.");
        setIsLoading(false); setNotes([]); setTotalNotes(0); setTotalPages(1); return;
    }
    const searchRequest: SearchRequest = { query: query, page, pageSize: NOTES_PAGE_SIZE };
    setIsLoading(true); setError(null);
    try {
        const response = await api.searchNotes(searchRequest, token);
        setNotes(response.data);
        setTotalNotes(response.totalSize);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
    } catch (err: any) {
        const msg = err.message || 'Failed to fetch notes'; setError(msg);
        // Use translated error template
        toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        console.error("NotesPage: Fetch Notes Error:", err);
        setNotes([]); setTotalNotes(0); setTotalPages(1);
    } finally { setIsLoading(false); }
  }, [token, user?.userId, currentPage, searchQuery, preferredLanguage]); // Add preferredLanguage

  // Trigger fetchNotes whenever dependencies change, BUT ONLY IF AUTH IS READY
  useEffect(() => {
    if (!isAuthLoading && token && user?.userId) {
        fetchNotes(currentPage, searchQuery);
    } else {
         if (!isAuthLoading && (!token || !user?.userId)) {
            setNotes([]); setTotalNotes(0); setTotalPages(1); setCurrentPage(1);
        }
    }
  }, [isAuthLoading, token, user?.userId, currentPage, searchQuery, fetchNotes]);

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
       if (!token || !noteId) { toast.error("Invalid request."); return; };
       const noteToDelete = notes.find(n => n.noteId === noteId);
       if (!noteToDelete) return;
       const isOwner = noteToDelete.ownerUserId === user?.userId;
       if (!isOwner && !isAdmin) {
           // TODO: Translate error
           toast.error("You can only delete your own notes."); return;
       }
        // Use translated confirmation
       if (!window.confirm(t('confirmActionMessage', preferredLanguage) + " (Note Delete)")) { // TODO: Add specific key
           return;
       }

       setError(null); setIsLoading(true);
       try {
           await api.deleteNote(noteId, token);
           // TODO: Translate success
           toast.success("Note deleted successfully.");
           const newTotalPages = Math.ceil((totalNotes - 1) / NOTES_PAGE_SIZE);
           const newCurrentPage = Math.max(1, (currentPage > newTotalPages) ? newTotalPages : currentPage);
           if (currentPage !== newCurrentPage) { setCurrentPage(newCurrentPage); }
           else { await fetchNotes(newCurrentPage, searchQuery); }
       } catch (err: any) {
            const msg = err.message || 'Failed to delete note'; setError(msg);
            // Use translated error template
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: `Delete failed: ${msg}` }));
            console.error("NotesPage: Delete Note Error:", err); setIsLoading(false);
       }
   };

  const handleSaveSuccess = async () => {
    setIsEditorOpen(false);
    setEditingNote(null);
     // TODO: Translate success
    toast.success(editingNote ? "Note updated successfully." : "Note created successfully.");
    await fetchNotes(currentPage, searchQuery);
  };

  // --- Preview Handler ---
  const handlePreview = (note: NoteWithDetails) => {
    setPreviewingNote(note);
    setIsPreviewOpen(true);
  };
  // ---------------------

  // --- Search & Pagination Handlers ---
  const handleSearch = (newQuery: SearchRequest['query']) => {
      setSearchQuery(newQuery);
      setCurrentPage(1);
  };
  const handlePageChange = (newPage: number) => {
      setCurrentPage(newPage);
  };

  // Define fields for the SearchBar using translations
  const searchFields: SearchFieldOption[] = [
      { value: 'title', label: t('titleLabel', preferredLanguage), type: 'text' },
      { value: 'content', label: t('notesContentColumn', preferredLanguage), type: 'text' }, // TODO: Add notesContentColumn
      { value: 'shared', label: t('notesSharedColumn', preferredLanguage), type: 'boolean' }, // TODO: Add notesSharedColumn
      {
        value: 'tags',
        label: t('tagsLabel', preferredLanguage), // TODO: Add tagsLabel
        type: 'tags',
        options: availableTags.map(t => ({value: t.tagId!, label: t.name}))
      },
  ];
  if (isAdmin) {
        // TODO: Translate ownerLogin label
       searchFields.push({ value: 'ownerLogin', label: 'Owner Login', type: 'text' });
  }

  if (isAuthLoading) {
      return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                 {/* TODO: Translate title and description */}
                 <h1 className="text-2xl font-bold">Notes</h1>
                 <p className='text-muted-foreground'>Create, view, and manage personal & shared notes.</p>
            </div>
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
                 {/* Use translated button text */}
                <Button onClick={handleCreateNew} className='shrink-0'>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('createButton', preferredLanguage)} {t('notesTitle', preferredLanguage, { count: 1 }).replace('Notes','Note')} {/* Example */}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                 {/* Use translated title */}
                 <DialogTitle>{editingNote ? t('editButton', preferredLanguage) : t('createButton', preferredLanguage)} {t('notesTitle', preferredLanguage, { count: 1 }).replace('Notes','Note')}</DialogTitle> {/* Example */}
                </DialogHeader>
                {isEditorOpen && <NoteEditor noteToEdit={editingNote} onSave={handleSaveSuccess} />}
            </DialogContent>
            </Dialog>
        </div>

       {/* Search Bar Section */}
       <SearchBar
           fields={searchFields}
           onSearch={handleSearch}
           isLoading={isLoading || isAuthLoading}
       />

        {/* Notes List Section */}
        <Card>
            <CardHeader>
                 {error && !isLoading && <ErrorDisplay message={error} />}
            </CardHeader>
            <CardContent>
                {isLoading && <div className="flex justify-center py-10"><LoadingSpinner /></div>}
                {!isLoading && (
                    <>
                        <NoteList notes={notes} onEdit={handleEdit} onDelete={handleDelete} onPreview={handlePreview} />
                        {totalPages > 1 && (
                            <div className="mt-6 flex justify-center">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        )}
                         {/* Use translated empty states */}
                        {notes.length === 0 && !error && (
                            searchQuery.length > 0
                                ? <p className="text-center text-muted-foreground pt-6">{t('noResultsFound', preferredLanguage)}</p> // Use common key
                                : <p className="text-center text-muted-foreground pt-6">{t('notesNoNotesFound', preferredLanguage)} {t('notesClickCreateHint', preferredLanguage)}</p> // TODO: Add keys
                        )}
                        {error && notes.length === 0 && (
                             // TODO: Translate error message
                            <p className="text-center text-destructive pt-6">Could not load notes. Please try again later.</p>
                        )}
                    </>
                )}
            </CardContent>
        </Card>

         {/* --- Note Preview Dialog --- */}
         <NotePreviewDialog
             isOpen={isPreviewOpen}
             onOpenChange={setIsPreviewOpen}
             note={previewingNote}
          />
         {/* --- End Preview Dialog --- */}
    </div>
  );
};

export default NotesPage;