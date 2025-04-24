import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import api from '../../../lib/api';
import type { NoteWithDetails } from '../../../../../backend/src/functionalities/note/models';
import type { Tag } from '../../../../../backend/src/functionalities/tag/models';
import type { SearchRequest, SearchQuery } from '../../../../../backend/src/utils/search';
import { icons } from '../../../lib/icons';
// Import components and types (ensure definitions are loaded)
import '../../ui/app-card';
import '../../ui/app-button';
import '../../ui/app-dialog';
import '../../shared/search-bar';
import '../../ui/pagination';
import '../../notes/note-list';
import '../../notes/note-editor';
import '../../notes/note-preview-dialog';
import '../../ui/error-display';
import '../../ui/loading-spinner';

// Import component types
import type { SearchBar, SearchFieldOption } from '../../shared/search-bar';
import type { AppButton } from '../../ui/app-button';
import type { Pagination } from '../../ui/pagination';
import type { NoteList } from '../../notes/note-list';
import type { AppDialog } from '../../ui/app-dialog';
import type { NoteEditor } from '../../notes/note-editor';
import type { NotePreviewDialog } from '../../notes/note-preview-dialog';
import type { ErrorDisplay } from '../../ui/error-display';


const NOTES_PAGE_SIZE = 10;

export class NotesPage extends BaseComponent {
    // --- State ---
    private notes: NoteWithDetails[] = [];
    private availableTags: Tag[] = [];
    private searchFields: SearchFieldOption[] = [];
    private isLoadingNotes: boolean = false;
    private errorNotes: string | null = null;
    private searchQuery: SearchQuery = [];
    private currentPage: number = 1;
    private totalPages: number = 1;
    private totalNotes: number = 0;

    // Store references to dynamically created elements for cleanup
    private activeEditorDialog: AppDialog | null = null;
    private activePreviewDialog: NotePreviewDialog | null = null;

    constructor() {
        super();
        this.handleCreateNew = this.handleCreateNew.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handlePreview = this.handlePreview.bind(this);
        this.handleSaveSuccess = this.handleSaveSuccess.bind(this); // Bind save handler
    }

    protected get styles(): string {
        return `
            :host { display: block; }
            .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
            .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
            .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); margin-top: var(--spacing-1); }
            .actions { flex-shrink: 0; }
            search-bar { margin-bottom: var(--spacing-4); }
            .pagination-container { margin-top: var(--spacing-6); display: flex; justify-content: center; }
            .empty-state { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             app-card [slot="content"] { display: flex; flex-direction: column; flex-grow: 1; position: relative; }
             #list-card { flex-grow: 1; display: flex; flex-direction: column; }
             .list-container { flex-grow: 1; display: flex; flex-direction: column; }
              #list-loading { position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius); }
             note-list { flex-grow: 1; }
        `;
    }

    protected get template(): string {
        // *** ENSURED static dialogs are REMOVED from the template ***
        return `
            <div class="page-header">
                <div>
                    <h1 class="header-title">Notes</h1>
                    <p class="header-description">Create, view, and manage personal & shared notes.</p>
                </div>
                 <div class="actions">
                     <app-button id="create-button" icon="plusCircle"> Create Note</app-button>
                </div>
            </div>

            <search-bar id="search-bar"></search-bar>

             <app-card id="list-card">
                <div slot="content" class="list-container">
                    <error-display id="list-error" hidden></error-display>
                    <div id="list-loading" style="display: none;"><loading-spinner size="lg"></loading-spinner></div>
                    <note-list id="note-list"></note-list>
                    <div class="pagination-container">
                        <app-pagination id="pagination"></app-pagination>
                    </div>
                    <div id="empty-state" class="empty-state" hidden></div>
                </div>
            </app-card>
            <!-- No static dialogs here -->
        `;
    }

    async connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAuthenticated && !this.auth.isLoading) {
             this.setErrorState("Please log in to manage notes.");
             return;
        }
        // Attach listeners after initial render (happens in super.connectedCallback)
        this.addEventListeners();
        await this.loadInitialData();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base class removes listeners
        this.activeEditorDialog?.remove(); // Clean up on disconnect
        this.activePreviewDialog?.remove();
    }

    private async loadInitialData() {
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            await this.fetchTags(); // Fetch tags first for search options
            this.updateSearchFields(); // Then update search bar fields
            await this.fetchNotes(); // Then fetch notes
        } catch (error: any) {
             this.setErrorState(error.message || "Failed to load initial data.");
             this.setLoadingState(false);
        }
    }
    private async fetchTags() {
        if (!this.auth.token) return;
        try {
            this.availableTags = (await api.getAllTags()).sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
            console.error("Failed to fetch tags for search options:", err);
            this.availableTags = [];
            // Optionally show a non-blocking warning to the user
            // showToast("Could not load tags for search.", "warning");
        }
    }
    private updateSearchFields() {
         this.searchFields = [
             { value: 'title', label: 'Title', type: 'text' },
             { value: 'content', label: 'Content', type: 'text' },
             { value: 'shared', label: 'Is Shared', type: 'boolean' },
             {
               value: 'tags', label: 'Tags', type: 'tags',
               // Ensure options have value (tagId) and label (name)
               // Tags are handled by tag-selector component internally now
             },
         ];
         if (this.auth.isAdmin) {
              this.searchFields.push({ value: 'ownerLogin', label: 'Owner Login', type: 'text' });
         }
         const searchBar = this.qsOptional<SearchBar>('#search-bar');
         if(searchBar) {
             // Pass available tags to the search bar component if needed,
             // but TagSelector usually fetches its own list.
             // For now, just set the field definitions.
             searchBar.fields = this.searchFields;
         } else {
             console.warn("NotesPage: Search bar not found to update fields.");
         }
    }
    private async fetchNotes() {
        if (!this.auth.token) {
            this.setErrorState("Not authenticated. Please log in.");
            this.notes = []; this.totalNotes = 0; this.totalPages = 1;
            this.setLoadingState(false);
            return;
        }
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            const searchRequest: SearchRequest = { query: this.searchQuery, page: this.currentPage, pageSize: NOTES_PAGE_SIZE };
            const response = await api.searchNotes(searchRequest);
            this.notes = response.data;
            this.totalNotes = response.totalSize;
            this.totalPages = response.totalPages;
            this.currentPage = response.page;
        } catch (err: any) {
            console.error("NotesPage(fetchNotes): API call failed:", err);
            this.setErrorState(err.message || 'Failed to fetch notes');
            this.notes = []; this.totalNotes = 0; this.totalPages = 1;
        } finally {
            this.setLoadingState(false);
        }
    }
    private setLoadingState(isLoading: boolean) {
        this.isLoadingNotes = isLoading;
        const loadingOverlay = this.qsOptional<HTMLElement>('#list-loading');
        if (loadingOverlay) loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        this.qsOptional<SearchBar>('#search-bar')?.toggleAttribute('loading', isLoading);
        this.qsOptional<ErrorDisplay>('#list-error')?.toggleAttribute('hidden', true);

        if (!isLoading) this.updateListAndPagination();
        else {
            this.qsOptional<NoteList>('#note-list')?.setAttribute('hidden', '');
            this.qsOptional('#empty-state')?.setAttribute('hidden', '');
            this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
        }
    }
    private setErrorState(error: string | null) {
        this.errorNotes = error;
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');
        if (errorDisplay) {
            errorDisplay.message = error || '';
            errorDisplay.hidden = !error || this.isLoadingNotes;
        }
        if (error) {
            this.qsOptional<NoteList>('#note-list')?.setAttribute('hidden', '');
            this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
            this.qsOptional('#empty-state')?.setAttribute('hidden', '');
        }
    }
    private updateListAndPagination() {
        const listComponent = this.qsOptional<NoteList>('#note-list');
        const paginationComponent = this.qsOptional<Pagination>('#pagination');
        const emptyState = this.qsOptional<HTMLElement>('#empty-state');
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');

        if (errorDisplay) errorDisplay.hidden = !this.errorNotes;
        if (this.errorNotes) {
            if(listComponent) listComponent.hidden = true;
            if(paginationComponent) paginationComponent.hidden = true;
            if(emptyState) emptyState.hidden = true;
            return;
        }

        if (listComponent) {
            listComponent.notes = this.notes;
            listComponent.hidden = this.notes.length === 0;
        }
        if (paginationComponent) {
            paginationComponent.setAttribute('current-page', String(this.currentPage));
            paginationComponent.setAttribute('total-pages', String(this.totalPages));
            paginationComponent.hidden = this.totalPages <= 1 || this.notes.length === 0;
        }
        if (emptyState) {
            emptyState.hidden = !!this.errorNotes || this.isLoadingNotes || this.notes.length > 0;
            if (!emptyState.hidden) {
                emptyState.textContent = this.searchQuery.length > 0 ? 'No notes found matching your search criteria.'
                    : 'No notes found. Click "Create Note" to start!';
            }
        }
    }

    addEventListeners() {
        this.qsOptional<AppButton>('#create-button')?.addEventListener('click', this.handleCreateNew);
        this.qsOptional<SearchBar>('#search-bar')?.addEventListener('search', this.handleSearch);
        this.qsOptional<Pagination>('#pagination')?.addEventListener('pagechange', this.handlePageChange);
        const noteList = this.qsOptional<NoteList>('#note-list');
        if (noteList) {
            noteList.addEventListener('edit', this.handleEdit);
            noteList.addEventListener('delete', this.handleDelete);
            noteList.addEventListener('preview', this.handlePreview);
        }
    }

    removeEventListeners() {
        // Base class handles removing listeners attached in addEventListeners
    }

    private handleSearch = (event: Event): void => {
        const customEvent = event as CustomEvent<{ query: SearchQuery }>;
        this.searchQuery = customEvent.detail.query;
        this.currentPage = 1;
        this.fetchNotes();
    }
    private handlePageChange = (event: Event): void => {
        const customEvent = event as CustomEvent<{ page: number }>;
        this.currentPage = customEvent.detail.page;
        this.fetchNotes();
    }

    // --- Dynamic Editor/Preview Logic (Key Changes) ---
    private handleEdit = (event: Event): void => {
        const customEvent = event as CustomEvent<{ note: NoteWithDetails }>;
        const noteToEdit = customEvent.detail.note;
        if (!this.auth.isAdmin && this.auth.user?.userId !== noteToEdit.ownerUserId) {
            showToast("You can only edit your own notes.", "error");
            return;
        }
        this.openEditor(noteToEdit);
    };

     private handleCreateNew = (): void => {
         if (!this.auth.isAuthenticated) {
             showToast("Login required to create notes.", "warning");
             return;
         }
         this.openEditor(null);
    };

    private openEditor(note: NoteWithDetails | null): void {
        this.activeEditorDialog?.remove(); // Clean up previous

        // 1. Create Dialog
        const dialog = document.createElement('app-dialog') as AppDialog;
        dialog.setAttribute('size', 'lg');
        dialog.innerHTML = `<h2 slot="header">${note ? 'Edit Note' : 'Create New Note'}</h2>`;

        // 2. Create Editor
        const editor = document.createElement('note-editor') as NoteEditor;
        editor.noteToEdit = note; // Set data *before* appending to DOM if possible

        // 3. Append Editor to Dialog
        dialog.appendChild(editor);

        // 4. Append Dialog to Page
        this.shadowRoot?.appendChild(dialog);
        this.activeEditorDialog = dialog; // Store reference

        // 5. Add Listeners for cleanup and save
        const saveListener = (event: Event) => this.handleSaveSuccess(event);
        editor.addEventListener('save', saveListener);

        dialog.addEventListener('close', () => {
            editor.removeEventListener('save', saveListener);
            dialog.remove();
            this.activeEditorDialog = null;
        }, { once: true });

        // 6. Show Dialog
        dialog.show();
    }

     private handleSaveSuccess = (event?: Event): void => {
        this.activeEditorDialog?.hide();
        const savedNote = (event as CustomEvent)?.detail?.note;
        // Determine if it was an update or create
        // Corrected typo: _activeEditorDialog -> activeEditorDialog
        const isUpdate = !!this.activeEditorDialog?.querySelector('note-editor')?.noteToEdit;

        // Fetch notes again. If it was a *create*, reset to page 1.
        if (!isUpdate) {
            this.currentPage = 1;
        }
        this.fetchNotes();
    };

     private async handleDelete(event: Event): Promise<void> {
       const customEvent = event as CustomEvent<{ noteId: number }>;
       const noteId = customEvent.detail.noteId;
       const noteToDelete = this.notes.find(n => n.noteId === noteId);
       if (!noteToDelete || !this.auth.token) return;
       const isOwner = noteToDelete.ownerUserId === this.auth.user?.userId;
       if (!isOwner && !this.auth.isAdmin) {
           showToast("You can only delete your own notes.", "error"); return;
       }
       if (!window.confirm("Are you sure you want to delete this note? This action cannot be undone.")) return;

       this.setLoadingState(true);
       try {
           await api.deleteNote(noteId);
           showToast("Note deleted successfully.", "success");
           const newTotalNotes = this.totalNotes - 1;
           const newTotalPages = Math.max(1, Math.ceil(newTotalNotes / NOTES_PAGE_SIZE));
           // Stay on current page if possible, otherwise go to last page
           this.currentPage = Math.min(this.currentPage, newTotalPages);
           await this.fetchNotes();
       } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
            this.setErrorState(err.message);
            this.setLoadingState(false);
       }
    };

     private handlePreview = (event: Event): void => {
         const customEvent = event as CustomEvent<{ note: NoteWithDetails }>;
         const noteToPreview = customEvent.detail.note;
         this.activePreviewDialog?.remove(); // Clean up previous

         // 1. Create Preview Dialog Component
         const previewDialog = document.createElement('note-preview-dialog') as NotePreviewDialog;

         // 2. Append to Page
         this.shadowRoot?.appendChild(previewDialog);
         this.activePreviewDialog = previewDialog;

         // 3. Add Close Listener for Cleanup
         previewDialog.addEventListener('close', () => {
             previewDialog.remove();
             this.activePreviewDialog = null;
         }, { once: true });

         // 4. Show Dialog with Data
         previewDialog.show(noteToPreview);
    };
}

// Define the component unless already defined
if (!customElements.get('notes-page')) {
    customElements.define('notes-page', NotesPage);
}