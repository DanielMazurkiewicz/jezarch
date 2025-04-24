import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import NoteList from "./NoteList";
import NoteEditor from "./NoteEditor";
import NotePreviewDialog from "./NotePreviewDialog"; // Import Preview Dialog
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import SearchBar from "@/components/Shared/SearchBar"; // Assuming SearchBar exists
import { Pagination } from "@/components/Shared/Pagination"; // Assuming Pagination exists
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import type { NoteWithDetails } from "../../../../backend/src/functionalities/note/models";
import type { Tag } from "../../../../backend/src/functionalities/tag/models";
import type { SearchRequest, SearchQuery } from "../../../../backend/src/utils/search";
// Removed toast

const { div, h1, p } = van.tags;

const NOTES_PAGE_SIZE = 10;

// --- Component ---
const NotesPage = () => {
    const { user, token, isLoading: isAuthLoading } = authStore;
    const isAdmin = van.derive(() => user.val?.role === 'admin');

    // --- State ---
    const notes = van.state<NoteWithDetails[]>([]);
    const availableTags = van.state<Tag[]>([]);
    const isLoading = van.state(false); // Separate loading for notes fetch
    const error = van.state<string | null>(null);
    const editingNote = van.state<NoteWithDetails | null>(null);
    const isEditorOpen = van.state(false);
    const previewingNote = van.state<NoteWithDetails | null>(null); // State for preview
    const isPreviewOpen = van.state(false); // State for preview dialog

    // Search & Pagination State
    const searchQuery = van.state<SearchQuery>([]);
    const currentPage = van.state(1);
    const totalNotes = van.state(0);
    const totalPages = van.state(1);

    // --- Data Fetching ---
    // Fetch available tags for search bar
    van.effect(() => {
        if (!token.val) return;
        api.getAllTags(token.val)
            .then(tags => availableTags.val = tags)
            .catch(err => console.error("NotesPage: Failed to fetch tags for search:", err));
    });

    // Fetch/Search Notes Function
    const fetchNotes = async (page = currentPage.val, query = searchQuery.val) => {
        if (!token.val || !user.val?.userId) {
            console.warn("NotesPage: fetchNotes called without user/token.");
            // Reset state if no user/token
            notes.val = [];
            totalNotes.val = 0;
            totalPages.val = 1;
            currentPage.val = 1;
            isLoading.val = false;
            return;
        }
        const searchRequest: SearchRequest = { query, page, pageSize: NOTES_PAGE_SIZE };
        isLoading.val = true;
        error.val = null;
        try {
            const response = await api.searchNotes(searchRequest, token.val);
            notes.val = response.data;
            totalNotes.val = response.totalSize;
            totalPages.val = response.totalPages;
            currentPage.val = response.page; // Update current page from response
        } catch (err: any) {
            const msg = err.message || 'Failed to fetch notes';
            error.val = msg;
            console.error("NotesPage: Fetch Notes Error:", err);
            notes.val = []; totalNotes.val = 0; totalPages.val = 1;
        } finally {
            isLoading.val = false;
        }
    };

    // Effect to fetch notes when dependencies change (after auth check)
    van.effect(() => {
        // console.log(`AuthLoading: ${isAuthLoading.val}, Token: ${!!token.val}, UserID: ${user.val?.userId}, Page: ${currentPage.val}, Query: ${JSON.stringify(searchQuery.val)}`);
        if (!isAuthLoading.val && token.val && user.val?.userId) {
            fetchNotes(currentPage.val, searchQuery.val);
        } else if (!isAuthLoading.val && (!token.val || !user.val?.userId)) {
            // Clear notes if logged out or user info missing after auth check
            notes.val = [];
            totalNotes.val = 0;
            totalPages.val = 1;
            currentPage.val = 1;
        }
    });

    // --- Event Handlers ---
    const handleEdit = (note: NoteWithDetails) => {
        editingNote.val = note;
        isEditorOpen.val = true;
    };

    const handleCreateNew = () => {
        editingNote.val = null;
        isEditorOpen.val = true;
    };

    const handleDelete = async (noteId: number) => {
        if (!token.val || !noteId) { alert("Invalid request."); return; };
        const noteToDelete = notes.val.find(n => n.noteId === noteId);
        if (!noteToDelete) return;
        const isOwner = noteToDelete.ownerUserId === user.val?.userId;
        if (!isOwner && !isAdmin.val) {
            alert("You can only delete your own notes."); return;
        }
        if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

        error.val = null;
        isLoading.val = true; // Show loading during delete
        try {
            await api.deleteNote(noteId, token.val);
            alert("Note deleted successfully.");
            // Recalculate pagination and fetch potentially new page
            const newTotal = totalNotes.val - 1;
            const newTotalPages = Math.ceil(newTotal / NOTES_PAGE_SIZE);
            const newCurrentPage = Math.max(1, (currentPage.val > newTotalPages && newTotalPages > 0) ? newTotalPages : currentPage.val);
            // Trigger refetch - dependencies will handle it if page changes
            if (currentPage.val !== newCurrentPage) {
                 currentPage.val = newCurrentPage; // This triggers the effect
            } else {
                 await fetchNotes(newCurrentPage, searchQuery.val); // Fetch same page if page didn't change
            }
        } catch (err: any) {
            const msg = err.message || 'Failed to delete note';
            error.val = msg; alert(`Delete failed: ${msg}`);
            console.error("NotesPage: Delete Note Error:", err);
            isLoading.val = false; // Stop loading on error
        }
        // isLoading state reset by fetchNotes on success
    };

    const handleSaveSuccess = () => {
        isEditorOpen.val = false;
        // alert(editingNote.val ? "Note updated." : "Note created.");
        editingNote.val = null;
        fetchNotes(currentPage.val, searchQuery.val); // Refresh current page
    };

    const handlePreview = (note: NoteWithDetails) => {
        previewingNote.val = note;
        isPreviewOpen.val = true;
    };

    const handleSearch = (newQuery: SearchQuery) => {
        searchQuery.val = newQuery;
        currentPage.val = 1; // Reset page on new search (triggers fetch effect)
    };

    const handlePageChange = (newPage: number) => {
        currentPage.val = newPage; // Triggers fetch effect
    };

    // Search fields (reactive based on availableTags and isAdmin)
    const searchFields = van.derive(() => {
        const fields = [
            { value: 'title', label: 'Title', type: 'text' as const },
            { value: 'content', label: 'Content', type: 'text' as const },
            { value: 'shared', label: 'Is Shared', type: 'boolean' as const },
            {
                value: 'tags', label: 'Tags', type: 'tags' as const,
                options: availableTags.val.map(t => ({ value: t.tagId!, label: t.name }))
            },
        ];
        if (isAdmin.val) {
            fields.push({ value: 'ownerLogin', label: 'Owner Login', type: 'text' as const });
        }
        return fields;
    });

    // --- Render ---
    // Show global loading if auth is still loading
    if (isAuthLoading.val) {
        return div({ class: styles.fullScreenCenter }, LoadingSpinner({ size: 'lg' }));
    }

    return div({ class: styles.spaceY6 },
        // Header
        div({ class: `${styles.flex} ${styles.flexCol} sm:flex-row sm:justify-between sm:items-center ${styles.gap4}` },
            div(
                h1({ class: styles.text2xl }, "Notes"),
                p({ class: styles.textMutedForeground }, "Create, view, and manage notes.")
            ),
            Dialog({ open: isEditorOpen, onOpenChange: v => isEditorOpen.val = v },
                DialogTrigger(
                    Button({ onclick: handleCreateNew, class: styles.flexShrink0 },
                        icons.PlusCircleIcon({ class: styles.pr2 }), "Create Note"
                    )
                ),
                DialogContent({ class: "sm:max-w-[600px]" }, // Example width
                    DialogHeader(
                        DialogTitle(() => editingNote.val ? 'Edit Note' : 'Create New Note')
                    ),
                    // Render form only when open
                    () => isEditorOpen.val ? NoteEditor({ noteToEdit: editingNote.val, onSave: handleSaveSuccess }) : null
                )
            )
        ),

        // Search Bar (Reactive fields)
        () => SearchBar({ fields: searchFields.val, onSearch: handleSearch, isLoading: isLoading.val }),

        // Notes List Section
        Card(
            CardHeader(
                // Display fetch error if any
                () => error.val && !isLoading.val ? ErrorDisplay({ message: error.val }) : null
            ),
            CardContent(
                // Loading spinner for notes fetch
                () => isLoading.val ? div({ class: `${styles.flex} ${styles.justifyCenter} ${styles.py6}` }, LoadingSpinner()) : null,

                // Note List (conditionally rendered)
                () => !isLoading.val && !error.val ? NoteList({
                    notes: notes.val, // Pass the plain array value
                    onEdit: handleEdit,
                    onDelete: handleDelete,
                    onPreview: handlePreview // Pass preview handler
                }) : null,

                // Pagination (conditionally rendered)
                () => !isLoading.val && totalPages.val > 1 ? div({ class: `${styles.mt6} ${styles.flex} ${styles.justifyCenter}` },
                    Pagination({
                        currentPage: currentPage.val,
                        totalPages: totalPages.val,
                        onPageChange: handlePageChange
                    })
                ) : null,

                // Empty/Error States (conditionally rendered)
                () => {
                    if (!isLoading.val && notes.val.length === 0) {
                        if (error.val) {
                            return p({ class: `${styles.textCenter} ${styles.textDestructive} ${styles.pt6}` },
                                "Could not load notes. Please try again later."
                            );
                        } else if (searchQuery.val.length > 0) {
                            return p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.pt6}` },
                                "No notes found matching your search criteria."
                            );
                        } else {
                            return p({ class: `${styles.textCenter} ${styles.textMutedForeground} ${styles.pt6}` },
                                'No notes found. Click "Create Note" to start!'
                            );
                        }
                    }
                    return null; // No message needed if loading or notes exist
                }
            ) // End CardContent
        ), // End Card

        // Preview Dialog (Rendered based on its own state)
        () => NotePreviewDialog({
            isOpen: isPreviewOpen.val,
            onOpenChange: v => isPreviewOpen.val = v,
            note: previewingNote.val
        })
    ); // End main div
};

export default NotesPage;