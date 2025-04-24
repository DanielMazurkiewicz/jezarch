import { BaseComponent } from '../../base-component';
import { router } from '../../../index'; // Use global router
import api from '../../../lib/api';
import { showToast } from '../../ui/toast-handler';
import type { Tag } from '../../../../../backend/src/functionalities/tag/models';
import type { ArchiveDocument, ArchiveDocumentSearchResult, ArchiveDocumentType } from '../../../../../backend/src/functionalities/archive/document/models';
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../../backend/src/utils/search'; // Removed SearchCondition import
import { icons } from '../../../lib/icons';
import { escapeHtml } from '../../../lib/utils'; // Import escapeHtml
// Import necessary components and types (ensure definitions are loaded)
import '../../ui/app-card';
import '../../ui/app-button';
import '../../ui/app-dialog';
import '../../shared/search-bar';
import '../../ui/pagination'; // Corrected import name
import '../../ui/error-display';
import '../../ui/loading-spinner';
import '../../archive/document-list';
import '../../archive/document-form';
import '../../archive/document-preview-dialog';

// Import types for components
import type { SearchBar, SearchFieldOption } from '../../shared/search-bar';
import type { AppButton } from '../../ui/app-button';
import type { Pagination } from '../../ui/pagination'; // Corrected import name
import type { DocumentList } from '../../archive/document-list';
import type { AppDialog } from '../../ui/app-dialog';
import type { DocumentForm } from '../../archive/document-form';
import type { DocumentPreviewDialog } from '../../archive/document-preview-dialog';
import type { ErrorDisplay } from '../../ui/error-display';


const ARCHIVE_PAGE_SIZE = 10;

export class ArchivePage extends BaseComponent {
    static observedAttributes = ['query-unitid']; // Observe unitId from query params

    // --- State ---
    private documents: ArchiveDocumentSearchResult[] = [];
    private parentUnit: ArchiveDocument | null = null;
    private availableTags: Tag[] = [];
    private searchFields: SearchFieldOption[] = [];
    private searchQuery: SearchQuery = [];
    private currentPage: number = 1;
    private totalPages: number = 1;
    private totalDocs: number = 0;

    // Store references to dynamically created elements for cleanup
    private activeEditorDialog: AppDialog | null = null;
    private activePreviewDialog: DocumentPreviewDialog | null = null;

    get currentUnitId(): number | null { return this.getNumAttribute('query-unitid'); }

    constructor() {
        super();
        this.handleCreateNew = this.handleCreateNew.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handlePageChange = this.handlePageChange.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDisable = this.handleDisable.bind(this);
        this.handlePreview = this.handlePreview.bind(this);
        this.handleOpenUnit = this.handleOpenUnit.bind(this);
        this.handleSaveSuccess = this.handleSaveSuccess.bind(this); // Bind save handler
        this.handleEditFromPreview = this.handleEditFromPreview.bind(this);
        this.handleDisableFromPreview = this.handleDisableFromPreview.bind(this);
        this.handleBackClick = this.handleBackClick.bind(this);
    }

    protected get styles(): string {
        return `
            :host { display: block; }
            .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
            .header-title-group { display: flex; align-items: center; gap: var(--spacing-4); }
            .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; display: flex; align-items: center; gap: var(--spacing-2); }
            .header-title svg { width: 1.25rem; height: 1.25rem; color: var(--color-muted-foreground); flex-shrink: 0; }
             .header-title .unit-icon { color: var(--color-primary); }
             .header-title .unit-name { color: var(--color-primary); }
            .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); margin-top: var(--spacing-1); }
            .actions { flex-shrink: 0; }
            search-bar { margin-bottom: var(--spacing-4); }
            .pagination-container { margin-top: var(--spacing-6); display: flex; justify-content: center; }
            .empty-state { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
            app-card [slot="content"] { display: flex; flex-direction: column; flex-grow: 1; position: relative; }
              #list-card { flex-grow: 1; display: flex; flex-direction: column;}
              .list-container { flex-grow: 1; display: flex; flex-direction: column; }
             #list-loading { position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius); }
             document-list { flex-grow: 1; }
        `;
    }

    protected get template(): string {
        // *** ENSURED static dialogs are REMOVED ***
        const unitId = this.currentUnitId;
        const parentTitle = this.parentUnit?.title ? escapeHtml(this.parentUnit.title) : (unitId ? 'Loading...' : '');
        const unitIcon = typeof icons.folderOpen === 'function' ? icons.folderOpen({ className: 'unit-icon' }) : (icons.folderOpen ?? '');
        const backIcon = icons.arrowLeft ?? '';
        const fileIcon = icons.fileText ?? '';

        return `
            <div class="page-header">
                <div class="header-title-group">
                    ${unitId ? `<app-button variant="outline" size="icon" title="Back to Parent" id="back-button">${backIcon}</app-button>` : ''}
                    <div>
                        <h1 class="header-title">
                            ${unitId ? `${unitIcon} Unit: <span class="unit-name">${parentTitle}</span>` : `${fileIcon} Archive Root`}
                        </h1>
                        <p class="header-description">
                            ${unitId && this.parentUnit ? `Browsing items within "${parentTitle}".` : 'Manage archival documents and units.'}
                        </p>
                    </div>
                </div>
                <div class="actions">
                     <app-button id="create-button" icon="plusCircle">
                        ${unitId ? 'Create Document Here' : 'Create Item'}
                    </app-button>
                </div>
            </div>
            <search-bar id="search-bar"></search-bar>
            <app-card id="list-card">
                <div slot="content" class="list-container">
                    <error-display id="list-error" hidden></error-display>
                    <div id="list-loading" style="display: none;"><loading-spinner size="lg"></loading-spinner></div>
                    <document-list id="document-list"></document-list>
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
             this.setErrorState("Please log in to view the archive.");
             return;
        }
        // Attach listeners only after initial render in base class
        this.addEventListeners();
        await this.loadInitialData();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners via base class
        this.activeEditorDialog?.remove();
        this.activePreviewDialog?.remove();
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        super.attributeChangedCallback(name, oldValue, newValue); // Call base class method
        if (name === 'query-unitid' && oldValue !== newValue && this.isConnected) {
            // Unit ID changed, reload everything
            this.currentPage = 1; // Reset page
            this.searchQuery = []; // Reset search
             const searchBar = this.qsOptional<SearchBar>('#search-bar');
             if (searchBar) {
                 searchBar.reset(); // Assuming a public reset method exists
                 // Or maybe just update the available fields
                 // this.updateSearchFields(); // Re-run after tags are fetched
             }
            this.loadInitialData(); // Reload data for the new unit
        }
    }

    private async loadInitialData() {
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            await Promise.all([
                this.fetchTags(), // Fetch tags first
                this.fetchParentUnit() // Fetch parent unit info if needed
            ]);
            this.updateSearchFields(); // Now update search fields with fetched tags
            await this.fetchDocuments();
        } catch (error: any) {
             this.setErrorState(error.message || "Failed to load initial archive data.");
             console.error("Initial archive load failed:", error);
             this.setLoadingState(false); // Stop loading on initial error
        }
        // fetchDocuments handles the final setLoading(false) on success path
    }

    private async fetchParentUnit() {
        const unitId = this.currentUnitId;
        this.parentUnit = null;
        if (!this.auth.token || !unitId) {
            this.render(); // Re-render header if necessary
            return;
        }
        try {
            const includeInactive = this.auth.isAdmin;
            const unit = await api.getArchiveDocumentById(unitId, includeInactive);
            if (unit.type !== 'unit') throw new Error(`Item ID ${unitId} is not a Unit.`);
            this.parentUnit = unit;
            this.render(); // Update header
        } catch (err: any) {
            showToast(`Failed to load parent unit: ${err.message}`, 'error');
            this.parentUnit = null;
            this.render(); // Re-render header
            if (this.currentUnitId) {
                showToast(`Redirecting to root archive.`, 'warning');
                router.navigate('/archive');
            }
        }
    }
    private async fetchTags() {
        if (!this.auth.token) return;
        try {
            this.availableTags = (await api.getAllTags()).sort((a, b) => a.name.localeCompare(b.name));
        } catch (err) {
            console.error("Failed to fetch tags for search options:", err);
            this.availableTags = [];
        }
    }

    private updateSearchFields() {
       const unitId = this.currentUnitId;
       const isAdmin = this.auth.isAdmin;
       // Define base fields
       this.searchFields = [
           { value: 'title', label: 'Title', type: 'text' },
           { value: 'creator', label: 'Creator', type: 'text' },
           { value: 'creationDate', label: 'Creation Date', type: 'text' },
           { value: 'contentDescription', label: 'Description', type: 'text'},
           { value: 'isDigitized', label: 'Is Digitized', type: 'boolean'},
           {
                value: 'tags', label: 'Tags', type: 'tags',
                // TagSelector component fetches/handles its own options, no need to pass here
           },
           // Add signature search fields later if needed
           // { value: 'topographicSignatures', label: 'Topo. Sig.', type: 'text' }, // Example
           // { value: 'descriptiveSignatures', label: 'Desc. Sig.', type: 'text' }, // Example
       ];
        // Add type filter only if at root level
       if (!unitId) {
           this.searchFields.push({
                value: 'type', label: 'Type', type: 'select',
                options: [{value: 'unit', label: 'Unit'}, {value:'document', label: 'Document'}]
            });
       }
       // Add admin-only fields
       if (isAdmin) {
           this.searchFields.push({ value: 'active', label: 'Is Active', type: 'boolean' });
           if (!unitId) { // Only add owner filter at root
               this.searchFields.push({ value: 'ownerUserId', label: 'Owner User ID', type: 'number' });
           }
       }
       // Update the search bar component
       const searchBar = this.qsOptional<SearchBar>('#search-bar');
       if(searchBar) {
            searchBar.fields = this.searchFields;
       } else {
            console.warn("ArchivePage: Search bar not found to update fields.");
       }
    }

    private async fetchDocuments() {
        if (!this.auth.token) {
            this.setErrorState("Not authenticated.");
            this.setLoadingState(false);
            return;
        }
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            let finalQuery: SearchQuery = [...this.searchQuery];
            const unitId = this.currentUnitId;
            const isAdmin = this.auth.isAdmin;

            // Ensure parent filter is correctly set based on context
            finalQuery = finalQuery.filter(q => q?.field !== 'parentUnitArchiveDocumentId'); // Remove any existing parent filter
            if (unitId) { // Inside a unit
                finalQuery.push({ field: 'parentUnitArchiveDocumentId', condition: 'EQ', value: unitId, not: false } as SearchQueryElement);
            } else { // At root level
                // Use type assertion suggested by TS error to bypass strict overlap check
                finalQuery.push({ field: 'parentUnitArchiveDocumentId', condition: 'IS_NULL', value: null, not: false } as unknown as SearchQueryElement);
            }

             // Filter out inactive documents if not admin
             if (!isAdmin) {
                 finalQuery = finalQuery.filter(q => q?.field !== 'active'); // Remove any explicit 'active' filter from query
                 finalQuery.push({ field: 'active', condition: 'EQ', value: true, not: false } as SearchQueryElement); // Force active=true
             }

            const searchRequest: SearchRequest = { query: finalQuery, page: this.currentPage, pageSize: ARCHIVE_PAGE_SIZE };
            const response = await api.searchArchiveDocuments(searchRequest);
            this.documents = response.data;
            this.totalDocs = response.totalSize;
            this.totalPages = response.totalPages;
            this.currentPage = response.page;
        } catch (err: any) {
            console.error("ArchivePage(fetchDocuments): API call failed:", err);
            this.setErrorState(err.message || 'Failed to fetch documents');
            this.documents = []; this.totalDocs = 0; this.totalPages = 1;
        } finally {
            this.setLoadingState(false);
        }
    }

    private setLoadingState(isLoading: boolean) {
        this._isLoading = isLoading;
        const loadingOverlay = this.qsOptional<HTMLElement>('#list-loading');
        if (loadingOverlay) loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        this.qsOptional<SearchBar>('#search-bar')?.toggleAttribute('loading', isLoading);
        this.qsOptional<ErrorDisplay>('#list-error')?.toggleAttribute('hidden', true);

        if (!isLoading) this.updateListAndPagination();
        else {
            this.qsOptional<DocumentList>('#document-list')?.setAttribute('hidden', '');
            this.qsOptional('#empty-state')?.setAttribute('hidden', '');
            this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
        }
    }

    private setErrorState(error: string | null) {
        this._error = error;
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');
        if (errorDisplay) {
            errorDisplay.message = error || '';
            errorDisplay.hidden = !error || this._isLoading;
        }
        if (error) {
            this.qsOptional<DocumentList>('#document-list')?.setAttribute('hidden', '');
            this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
            this.qsOptional('#empty-state')?.setAttribute('hidden', '');
        }
    }

    private updateListAndPagination() {
        const listComponent = this.qsOptional<DocumentList>('#document-list');
        const paginationComponent = this.qsOptional<Pagination>('#pagination');
        const emptyState = this.qsOptional<HTMLElement>('#empty-state');
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');

        if (errorDisplay) errorDisplay.hidden = !this._error;
        if (this._error) {
            if(listComponent) listComponent.hidden = true;
            if(paginationComponent) paginationComponent.hidden = true;
            if(emptyState) emptyState.hidden = true;
            return;
        }

        if (listComponent) {
            listComponent.documents = this.documents;
            listComponent.hidden = this.documents.length === 0;
        }
        if (paginationComponent) {
            paginationComponent.setAttribute('current-page', String(this.currentPage));
            paginationComponent.setAttribute('total-pages', String(this.totalPages));
            paginationComponent.hidden = this.totalPages <= 1 || this.documents.length === 0;
        }
        if (emptyState) {
            emptyState.hidden = !!this._error || this._isLoading || this.documents.length > 0;
            if (!emptyState.hidden) {
                const hasSearch = this.searchQuery.length > 0;
                const inUnit = !!this.currentUnitId;
                const parentTitleText = this.parentUnit?.title ? escapeHtml(this.parentUnit.title) : 'this unit';
                emptyState.textContent = hasSearch ? 'No items found matching your search criteria.'
                    : inUnit ? `No items found in unit "${parentTitleText}".`
                    : 'The archive root is empty. Click "Create Item" to start.';
            }
        }
    }

    addEventListeners() {
        this.qsOptional<AppButton>('#create-button')?.addEventListener('click', this.handleCreateNew);
        this.qsOptional<AppButton>('#back-button')?.addEventListener('click', this.handleBackClick);
        this.qsOptional<SearchBar>('#search-bar')?.addEventListener('search', this.handleSearch);
        this.qsOptional<Pagination>('#pagination')?.addEventListener('pagechange', this.handlePageChange);
        const docList = this.qsOptional<DocumentList>('#document-list');
        if (docList) {
            docList.addEventListener('edit', this.handleEdit);
            docList.addEventListener('delete', this.handleDisable);
            docList.addEventListener('preview', this.handlePreview);
            docList.addEventListener('open-unit', this.handleOpenUnit);
        }
    }

    removeEventListeners() {
        // Base class handles removal
    }

    private handleBackClick = () => {
        if (this.parentUnit?.parentUnitArchiveDocumentId) {
            router.navigate(`/archive?unitId=${this.parentUnit.parentUnitArchiveDocumentId}`);
        } else {
            router.navigate('/archive');
        }
    }
    private handleSearch = (event: Event): void => {
        const customEvent = event as CustomEvent<{ query: SearchQuery }>;
        this.searchQuery = customEvent.detail.query;
        this.currentPage = 1;
        this.fetchDocuments();
    }
    private handlePageChange = (event: Event): void => {
        const customEvent = event as CustomEvent<{ page: number }>;
        this.currentPage = customEvent.detail.page;
        this.fetchDocuments();
    }

    // --- Dynamic Editor/Preview Logic ---
    private handleEdit = (event: Event): void => {
         const customEvent = event as CustomEvent<{ element: ArchiveDocumentSearchResult }>;
         const doc = customEvent.detail.element;
         if (!doc || !this.auth.isAuthenticated) return;
         if (!this.auth.isAdmin && this.auth.user?.userId !== doc.ownerUserId) {
            showToast("You can only edit items you own.", "error"); return;
         }
        this.openEditor(doc);
    }

    private handleCreateNew = (): void => {
         if (!this.auth.isAuthenticated) {
             showToast("Login required to create items.", "warning"); return;
         }
        this.openEditor(null);
    };

    private openEditor(doc: ArchiveDocumentSearchResult | null): void {
        this.activeEditorDialog?.remove(); // Clean up previous

        // 1. Create Dialog
        const dialog = document.createElement('app-dialog');
        dialog.setAttribute('size', 'xl');

        const unitId = this.currentUnitId;
        const parentTitle = this.parentUnit?.title;
        let dialogTitle = '';
        let forceType: ArchiveDocumentType | undefined = undefined;
        let forcedParentId: number | undefined = undefined;
        let forcedParentTitle: string | undefined = undefined;

        if (doc) { // Editing
            dialogTitle = `Edit ${doc.type === 'unit' ? 'Unit' : 'Document'}`;
        } else { // Creating
            if (unitId && this.parentUnit) { // Creating inside a unit
                forceType = 'document'; // Can only create docs inside units for now
                forcedParentId = unitId;
                forcedParentTitle = parentTitle;
                dialogTitle = `Create Document in Unit "${escapeHtml(parentTitle || 'Unknown')}"`;
            } else { // Creating at root level
                dialogTitle = `Create New Item (Unit or Document)`;
            }
        }
        dialog.innerHTML = `<h2 slot="header">${dialogTitle}</h2>`;

        // 2. Create Editor
        const editor = document.createElement('document-form');
        editor.docToEdit = doc;
        if (!doc) { // Set force/forced only when creating
            editor.forceType = forceType;
            editor.forcedParentId = forcedParentId;
            editor.forcedParentTitle = forcedParentTitle;
        }
        // Pass available tags to the editor form if needed, although TagSelector might fetch its own
        // editor.availableTags = this.availableTags; // Example if needed

        // 3. Append Editor to Dialog
        dialog.appendChild(editor);

        // 4. Append Dialog to Page
        this.shadowRoot?.appendChild(dialog);
        this.activeEditorDialog = dialog;

        // 5. Add Listeners
        const saveListener = (event: Event) => this.handleSaveSuccess(event);
        editor.addEventListener('save', saveListener);

        dialog.addEventListener('close', () => {
            editor.removeEventListener('save', saveListener);
            dialog.remove();
            this.activeEditorDialog = null;
        }, { once: true });

        // 6. Show Dialog
        dialog.show();
        // console.log("Document Editor Dialog dynamically created and shown."); // Debug log
    }

     private handleSaveSuccess = (event?: Event): void => {
        this.activeEditorDialog?.hide(); // Ensure dialog closes
        const savedDoc = (event as CustomEvent)?.detail?.doc;
        // Corrected typo: _activeEditorDialog -> activeEditorDialog
        const isUpdate = !!this.activeEditorDialog?.querySelector('document-form')?.docToEdit;

        // If creating a new item, stay on current page/unit.
        // If updating, stay on current page/unit.
        // Always refetch. Resetting to page 1 might be annoying if editing.
        this.fetchDocuments();
    };

    private async handleDisable(event: Event): Promise<void> {
         const customEvent = event as CustomEvent<{ elementId: number }>;
         const docId = customEvent.detail.elementId;
         const docToDisable = this.documents.find(d => d.archiveDocumentId === docId);
         if (!docToDisable || !this.auth.token) return;
         if (!this.auth.isAdmin && this.auth.user?.userId !== docToDisable.ownerUserId) {
            showToast("You are not authorized to disable this item.", "error"); return;
         }
         if (!window.confirm(`Are you sure you want to disable this ${docToDisable.type}? It will be hidden but can be recovered by an admin.`)) return;

         this.setLoadingState(true);
         try {
            await api.disableArchiveDocument(docId);
            showToast("Item disabled successfully.", "success");
            const newTotalDocs = this.totalDocs - 1;
            // Stay on current page if possible, adjust if current page becomes invalid
            const newTotalPages = Math.max(1, Math.ceil(newTotalDocs / ARCHIVE_PAGE_SIZE));
            this.currentPage = Math.min(this.currentPage, newTotalPages);
            await this.fetchDocuments();
         } catch (err: any) {
             showToast(`Disable failed: ${err.message}`, "error");
             this.setErrorState(err.message);
             this.setLoadingState(false);
         }
    }

    private async handlePreview(event: Event): Promise<void> {
        const customEvent = event as CustomEvent<{ element: ArchiveDocumentSearchResult }>;
        const doc = customEvent.detail.element;
        if (!this.auth.token || !doc.archiveDocumentId) {
             showToast("Cannot preview item without ID or authentication.", "warning"); return;
        }
        this.activePreviewDialog?.remove(); // Clean up previous
        this.setLoadingState(true);

        try {
            const includeInactive = this.auth.isAdmin;
            const fullDoc = await api.getArchiveDocumentById(doc.archiveDocumentId, includeInactive);
            let parentTitle: string | undefined = undefined;
            if (fullDoc.parentUnitArchiveDocumentId) {
                 if (this.currentUnitId === fullDoc.parentUnitArchiveDocumentId) parentTitle = this.parentUnit?.title;
                 else { try { parentTitle = (await api.getArchiveDocumentById(fullDoc.parentUnitArchiveDocumentId, includeInactive)).title; } catch {} }
            }

            // 1. Create Preview Dialog Component
            const previewDialog = document.createElement('document-preview-dialog');

            // 2. Set Data *before* appending or showing if possible
            previewDialog.parentUnitTitle = parentTitle;
            previewDialog.doc = fullDoc;

            // 3. Append to Page
            this.shadowRoot?.appendChild(previewDialog);
            this.activePreviewDialog = previewDialog;

            // 4. Add Listeners for cleanup and actions
            const editListener = (e: Event) => this.handleEditFromPreview(e);
            const disableListener = (e: Event) => this.handleDisableFromPreview(e);

            previewDialog.addEventListener('close', () => {
                previewDialog.removeEventListener('edit-request', editListener);
                previewDialog.removeEventListener('disable-request', disableListener);
                previewDialog.remove();
                this.activePreviewDialog = null;
            }, { once: true });
            previewDialog.addEventListener('edit-request', editListener);
            previewDialog.addEventListener('disable-request', disableListener);

            // 5. Show Dialog (passing doc again might be redundant depending on implementation, but safe)
            previewDialog.show(fullDoc);
            // console.log("Document Preview Dialog dynamically created and shown."); // Debug log

        } catch (err: any) {
            showToast(`Failed to load document details: ${err.message}`, "error");
        } finally {
             this.setLoadingState(false);
        }
    };

     private handleOpenUnit = (event: Event): void => {
        const customEvent = event as CustomEvent<{ element: ArchiveDocumentSearchResult }>;
        const unit = customEvent.detail.element;
        if (unit.type === 'unit' && unit.archiveDocumentId) {
            router.navigate(`/archive?unitId=${unit.archiveDocumentId}`);
        }
     }

     private handleEditFromPreview = (event: Event): void => {
        const customEvent = event as CustomEvent<{ element: ArchiveDocument }>; // Get full doc from preview
        const docToEdit = customEvent.detail.element;
        if (docToEdit) {
             // Re-use existing edit logic
             const editEvent = new CustomEvent('edit', { detail: { element: docToEdit as ArchiveDocumentSearchResult } }); // Cast needed
             this.handleEdit(editEvent);
        }
     }
     private handleDisableFromPreview = (event: Event): void => {
        const customEvent = event as CustomEvent<{ elementId: number }>;
        const docId = customEvent.detail.elementId;
         if (docId) {
             // Re-use existing disable logic
              const disableEvent = new CustomEvent('delete', { detail: { elementId: docId } });
             this.handleDisable(disableEvent);
         }
     }
}

// Define the component unless already defined
if (!customElements.get('archive-page')) {
    customElements.define('archive-page', ArchivePage);
}