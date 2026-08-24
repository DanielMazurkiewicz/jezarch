import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'; // Removed unused imports
import NoteList from './NoteList';
import NoteEditor from './NoteEditor';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import SearchBar, { type SearchFieldOption } from '@/components/shared/SearchBar';
import Pagination from '@/components/shared/Pagination';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import type { NoteInput, NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchResponse, SearchQueryElement } from '../../../../backend/src/utils/search';
import { PlusCircle, HelpCircle } from 'lucide-react'; // Removed unused X icon
import HelpDialog, { HelpSection } from '@/components/shared/HelpDialog';
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
  const [helpOpen, setHelpOpen] = useState(false);

  // --- State for Preview ---
  const [previewingNote, setPreviewingNote] = useState<NoteWithDetails | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  // -------------------------

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<SearchRequest['query']>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalNotes, setTotalNotes] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const currentPageRef = useRef(currentPage);
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);
  useEffect(() => { searchQueryRef.current = searchQuery; }, [searchQuery]);

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
  const fetchSeqRef = useRef(0);
  const fetchNotes = useCallback(async (page = currentPageRef.current, query = searchQueryRef.current) => {
    if (!token || !user?.userId) {
        console.warn("NotesPage: fetchNotes called without user/token.");
        setIsLoading(false); setNotes([]); setTotalNotes(0); setTotalPages(1); return;
    }
    const searchRequest: SearchRequest = { query: query, page, pageSize: NOTES_PAGE_SIZE };
    const seq = ++fetchSeqRef.current;
    setIsLoading(true); setError(null);
    try {
        const response = await api.searchNotes(searchRequest, token);
        if (seq !== fetchSeqRef.current) return; // superseded by a newer request
        setNotes(response.data);
        setTotalNotes(response.totalSize);
        setTotalPages(response.totalPages);
        setCurrentPage(response.page);
    } catch (err: any) {
        if (seq !== fetchSeqRef.current) return;
        const msg = err.message || t('notesFetchError', preferredLanguage); // Use translated error
        setError(msg);
        toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        console.error("NotesPage: Fetch Notes Error:", err);
        setNotes([]); setTotalNotes(0); setTotalPages(1);
    } finally {
        if (seq === fetchSeqRef.current) setIsLoading(false);
    }
  }, [token, user?.userId, preferredLanguage]); // Add preferredLanguage

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
       if (!token || !noteId) { toast.error(t('invalidRequestError', preferredLanguage)); return; }; // Use translated error
       const noteToDelete = notes.find(n => n.noteId === noteId);
       if (!noteToDelete) return;
       const isOwner = noteToDelete.ownerUserId === user?.userId;
       if (!isOwner && !isAdmin) {
           toast.error(t('notesPermissionErrorDelete', preferredLanguage)); return;
       }
       if (!window.confirm(t('notesDeleteConfirm', preferredLanguage))) { // Use translated confirmation
           return;
       }

       setError(null); setIsLoading(true);
       try {
           await api.deleteNote(noteId, token);
           toast.success(t('notesDeleteSuccess', preferredLanguage));
           const newTotalPages = Math.ceil((totalNotes - 1) / NOTES_PAGE_SIZE);
           const newCurrentPage = Math.max(1, (currentPage > newTotalPages) ? newTotalPages : currentPage);
           if (currentPage !== newCurrentPage) { setCurrentPage(newCurrentPage); }
           else { await fetchNotes(newCurrentPage, searchQuery); }
       } catch (err: any) {
            const msg = err.message || t('unknownError', preferredLanguage);
            setError(t('notesDeleteFailed', preferredLanguage, { message: msg }));
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('notesDeleteFailed', preferredLanguage, { message: msg }) }));
            console.error("NotesPage: Delete Note Error:", err); setIsLoading(false);
       }
   };

  const handleSaveSuccess = async () => {
    const wasEditing = !!editingNote; // capture before reset
    setIsEditorOpen(false);
    setEditingNote(null);
    toast.success(t(wasEditing ? 'noteSavedUpdated' : 'noteSavedCreated', preferredLanguage));
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
      { value: 'content', label: t('notesContentColumn', preferredLanguage), type: 'text' },
      { value: 'shared', label: t('notesSharedColumn', preferredLanguage), type: 'boolean' },
      {
        value: 'tags',
        label: t('tagsLabel', preferredLanguage),
        type: 'tags',
        options: availableTags.map(t => ({value: t.tagId!, label: t.name}))
      },
  ];
  if (isAdmin) {
       searchFields.push({ value: 'ownerLogin', label: t('notesAuthorColumn', preferredLanguage), type: 'text' });
  }

  if (isAuthLoading) {
      return <div className="flex justify-center items-center h-32"><LoadingSpinner /></div>;
  }

  return (
    <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                 <h1 className="text-2xl font-bold">{t('notesTitle', preferredLanguage)}</h1>
            </div>
            <div className='flex items-center gap-2 flex-wrap justify-end'>
            <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
            <DialogTrigger asChild>
                <Button onClick={handleCreateNew} className='shrink-0'>
                    <PlusCircle className="mr-2 h-4 w-4" /> {t('createButton', preferredLanguage)} {t('notesTitleSingular', preferredLanguage)} {/* TODO: Add notesTitleSingular */}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                 <DialogTitle>{editingNote ? t('notesEditTitle', preferredLanguage) : t('notesCreateTitle', preferredLanguage)}</DialogTitle>
                 <DialogDescription className="sr-only">{editingNote ? t('notesEditTitle', preferredLanguage) : t('notesCreateTitle', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                {isEditorOpen && <NoteEditor noteToEdit={editingNote} onSave={handleSaveSuccess} />}
            </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)} title={t('helpButton', preferredLanguage)}>
                <HelpCircle className="mr-2 h-4 w-4" /> {t('helpButton', preferredLanguage)}
            </Button>
            </div>
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
                                ? <p className="text-center text-muted-foreground pt-6">{t('noResultsFound', preferredLanguage)}</p>
                                : <p className="text-center text-muted-foreground pt-6">{t('notesNoNotesFound', preferredLanguage)} {t('notesClickCreateHint', preferredLanguage)}</p>
                        )}
                        {error && notes.length === 0 && (
                            <p className="text-center text-destructive pt-6">{t('notesLoadErrorPlaceholder', preferredLanguage)}</p> // Use translated error placeholder
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
             onEdit={handleEdit}
             onDelete={handleDelete}
          />
          {/* --- End Preview Dialog --- */}

          <HelpDialog
              isOpen={helpOpen}
              onOpenChange={setHelpOpen}
              title={t('notesHelpTitle', preferredLanguage)}
              sections={[
                  { body: t('notesHelpIntro', preferredLanguage) },
                  { heading: t('notesSharedColumn', preferredLanguage), body: t('notesHelpSharing', preferredLanguage) },
                  { heading: t('deleteButton', preferredLanguage), body: t('notesHelpDeleting', preferredLanguage) },
                  { heading: t('permissionsLabel', preferredLanguage), body: t('notesHelpPermissions', preferredLanguage) },
              ] as HelpSection[]}
          />
     </div>
  );
};

export default NotesPage;