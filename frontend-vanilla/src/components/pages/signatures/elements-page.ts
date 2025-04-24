import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import api from '../../../lib/api';
import { router } from '../../../index';
import type { SignatureComponent } from '../../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, SignatureElementSearchResult } from '../../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../../backend/src/utils/search';
import { icons } from '../../../lib/icons';
// Import necessary components and types (ensure definitions are loaded)
import '../../ui/app-card';
import '../../ui/app-button';
import '../../ui/app-dialog';
import '../../ui/app-badge';
import '../../shared/search-bar';
import '../../ui/pagination';
import '../../ui/error-display';
import '../../ui/loading-spinner';
import '../../signatures/element-list';
import '../../signatures/element-form';

// Import component types explicitly
import type { SearchBar, SearchFieldOption } from '../../shared/search-bar';
import type { Pagination } from '../../ui/pagination';
import type { ElementList } from '../../signatures/element-list';
import type { AppDialog } from '../../ui/app-dialog';
import type { ElementForm } from '../../signatures/element-form';
import type { ErrorDisplay } from '../../ui/error-display';
import type { AppButton } from '../../ui/app-button';


const ELEMENTS_PAGE_SIZE = 15;

export class ElementsPage extends BaseComponent {
    static observedAttributes = ['param-componentid'];

    // --- State ---
    private parentComponent: SignatureComponent | null = null;
    private elements: SignatureElementSearchResult[] = [];
    private isLoadingParent: boolean = false;
    private isLoadingElements: boolean = false;
    private error: string | null = null;
    private elementSearchQuery: SearchQuery = [];
    private currentElementPage: number = 1;
    private totalElements: number = 0;
    private totalElementPages: number = 1;

    // Store reference to dynamically created dialog
    private activeEditorDialog: AppDialog | null = null;

    get componentId(): number | null { return this.getNumAttribute('param-componentid'); }

    constructor() {
        super();
        this.handleCreateElement = this.handleCreateElement.bind(this);
        this.handleElementSearch = this.handleElementSearch.bind(this);
        this.handleElementPageChange = this.handleElementPageChange.bind(this);
        this.handleEditElement = this.handleEditElement.bind(this);
        this.handleDeleteElement = this.handleDeleteElement.bind(this);
        this.handleElementSaveSuccess = this.handleElementSaveSuccess.bind(this);
    }

    protected get styles(): string {
        return `
            :host { display: block; }
             .page-header { display: flex; align-items: center; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
             .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
             .header-title .component-name { color: var(--color-primary); }
             .header-details { margin-top: var(--spacing-1); display: flex; flex-wrap: wrap; gap: var(--spacing-2); }
             .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); flex-basis: 100%; }
             app-card [slot="header"] { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); }
             app-card [slot="header"] h3 { font-size: 1.25rem; margin: 0; }
             app-card [slot="header"] p { font-size: 0.875rem; color: var(--color-muted-foreground); margin: 0; margin-top: 2px; }
             search-bar { margin-bottom: var(--spacing-4); }
             .pagination-container { margin-top: var(--spacing-4); display: flex; justify-content: center; }
              #list-card { flex-grow: 1; display: flex; flex-direction: column;}
             .list-container { flex-grow: 1; display: flex; flex-direction: column; position: relative; }
             .empty-state { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             #list-loading { position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius); }
             element-list { flex-grow: 1; }
        `;
    }

     protected get template(): string {
        // *** ENSURED static dialog is REMOVED ***
        const comp = this.parentComponent;
        const canCreate = !!comp && this.auth.isAuthenticated;
        const backIcon = icons.arrowLeft ?? '';

        if (this.isLoadingParent) return `<loading-spinner size="lg"></loading-spinner>`;
        if (this.error && !this.parentComponent) return `<error-display message="${this.error || 'Unknown error'}"></error-display>`;
        if (!comp) return `<error-display message="Component (ID: ${this.componentId}) not found or failed to load."></error-display>`;

        return `
             <div class="page-header">
                <app-button variant="outline" size="icon" id="back-button" title="Back to Components">
                     ${backIcon}
                 </app-button>
                 <div>
                     <h1 class="header-title">
                         Elements for: <span class="component-name">${comp.name}</span>
                     </h1>
                     <div class="header-details">
                         <p class="header-description">Manage elements within this component.</p>
                         <app-badge variant="secondary">Index: ${comp.index_type}</app-badge>
                         <app-badge variant="outline">Count: ${comp.index_count ?? 'N/A'}</app-badge>
                     </div>
                 </div>
             </div>

            <app-card id="list-card">
                 <div slot="header">
                     <div>
                         <h3>Element List</h3>
                         <p>Elements defined within the "${comp.name}" component.</p>
                    </div>
                    <app-button id="create-button" ${canCreate ? '' : 'disabled'} icon="plusCircle" size="sm">
                         New Element
                     </app-button>
                </div>
                 <div slot="content" class="list-container">
                     <error-display id="list-error" hidden></error-display>
                     <search-bar id="search-bar"></search-bar>
                     <div id="list-loading" style="display: none;"><loading-spinner size="lg"></loading-spinner></div>
                     <element-list id="element-list"></element-list>
                     <div class="pagination-container">
                        <app-pagination id="pagination"></app-pagination>
                    </div>
                    <div id="empty-state" class="empty-state" hidden></div>
                </div>
             </app-card>
             <!-- No static dialog here -->
        `;
    }

    async connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAuthenticated && !this.auth.isLoading) {
             this.setErrorState("Please log in to manage signature elements.");
             return;
        }
        // Base class calls addEventListeners
        await this.loadInitialData();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base removes listeners
        this.activeEditorDialog?.remove();
    }

     attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
         super.attributeChangedCallback(name, oldValue, newValue);
         if (name === 'param-componentid' && oldValue !== newValue && this.isConnected) {
             this.currentElementPage = 1;
             this.elementSearchQuery = [];
             const searchBar = this.qsOptional<SearchBar>('#search-bar');
             // Reset search bar? For now, just update fields if needed.
             if(searchBar) this.updateSearchFields();
             this.loadInitialData();
         }
    }

    private async loadInitialData() {
         const compId = this.componentId;
         if (compId === null || isNaN(compId)) {
             this.setErrorState("Invalid or missing component ID.");
             return;
         }
         await this.fetchParentComponent(compId);
         if (this.parentComponent) {
            this.updateSearchFields();
            await this.fetchElements();
         }
    }

    private async fetchParentComponent(id: number) {
         this.isLoadingParent = true;
         this.error = null;
         this.render(); // Show loading for parent
         try {
             if (!this.auth.token) throw new Error("Not authenticated");
             this.parentComponent = await api.getSignatureComponentById(id);
         } catch (err: any) {
             this.error = err.message || `Failed to load component (ID: ${id})`;
             showToast(this.error ?? 'Unknown error', "error");
             this.parentComponent = null;
         } finally {
             this.isLoadingParent = false;
             this.render(); // Re-render with parent data or error
         }
     }
     private updateSearchFields() {
         const searchBar = this.qsOptional<SearchBar>('#search-bar');
         if(searchBar) {
            searchBar.fields = [
                { value: 'name', label: 'Name', type: 'text' as const },
                { value: 'description', label: 'Description', type: 'text' as const },
                { value: 'index', label: 'Index', type: 'text' as const },
            ];
         }
     }
     private async fetchElements() {
        const compId = this.componentId;
        if (!this.auth.token || compId === null || isNaN(compId) || !this.parentComponent) {
            this.setErrorState("Cannot load elements: Missing component context or authentication.");
            this.setLoadingState(false); // Ensure loading stops
            return;
        }
        this.setLoadingState(true);
        this.setErrorState(null);

        try {
            const componentFilter: SearchQueryElement = { field: 'signatureComponentId', condition: 'EQ', value: compId, not: false };
            const validSearchQuery = this.elementSearchQuery.filter(q => q && q.condition && q.value !== undefined);
            const finalQuery = [...validSearchQuery.filter(q => q.field !== 'signatureComponentId'), componentFilter];
            const searchRequest: SearchRequest = { query: finalQuery, page: this.currentElementPage, pageSize: ELEMENTS_PAGE_SIZE };

            const response = await api.searchSignatureElements(searchRequest);
            this.elements = response.data;
            this.totalElements = response.totalSize;
            this.totalElementPages = response.totalPages;
            this.currentElementPage = response.page;

        } catch (err: any) {
            console.error("ElementsPage(fetchElements): API call failed:", err);
            this.setErrorState(err.message || 'Failed to fetch elements');
            this.elements = []; this.totalElements = 0; this.totalElementPages = 1;
        } finally {
            this.setLoadingState(false); // Triggers updateListAndPagination
        }
    }

    private setLoadingState(isLoading: boolean) {
         this.isLoadingElements = isLoading;
        this.qsOptional('#list-loading')?.style.setProperty('display', isLoading ? 'flex' : 'none');
        this.qsOptional<SearchBar>('#search-bar')?.toggleAttribute('loading', isLoading);
        this.qsOptional<ErrorDisplay>('#list-error')?.toggleAttribute('hidden', true);

        if (!isLoading) this.updateListAndPagination();
        else {
            this.qsOptional<ElementList>('#element-list')?.setAttribute('hidden', '');
            this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
            this.qsOptional('#empty-state')?.setAttribute('hidden', '');
        }
    }
    private setErrorState(error: string | null) {
         this.error = error;
         const listErrorDisplay = this.qsOptional<ErrorDisplay>('#list-error');
         if (listErrorDisplay) {
             listErrorDisplay.message = error ?? 'An unknown error occurred.';
             listErrorDisplay.hidden = !error || this.isLoadingElements;
         }
          if (error && !this.isLoadingParent) { // Only hide list stuff if parent loaded okay
             this.qsOptional<ElementList>('#element-list')?.setAttribute('hidden', '');
             this.qsOptional<Pagination>('#pagination')?.setAttribute('hidden', '');
             this.qsOptional('#empty-state')?.setAttribute('hidden', '');
          }
    }

     private updateListAndPagination() {
         const listComponent = this.qsOptional<ElementList>('#element-list');
         const paginationComponent = this.qsOptional<Pagination>('#pagination');
         const emptyState = this.qsOptional<HTMLElement>('#empty-state');
         const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');

         if (errorDisplay) errorDisplay.hidden = !this.error; // Show error if it exists
         if (this.error) { // If there's an error, hide everything else
             if(listComponent) listComponent.hidden = true;
             if(paginationComponent) paginationComponent.hidden = true;
             if(emptyState) emptyState.hidden = true;
             return;
         }

         if (listComponent) {
             listComponent.elements = this.elements;
             listComponent.hidden = this.elements.length === 0;
         }
         if (paginationComponent) {
             paginationComponent.setAttribute('current-page', String(this.currentElementPage));
             paginationComponent.setAttribute('total-pages', String(this.totalElementPages));
             paginationComponent.hidden = this.totalElementPages <= 1 || this.elements.length === 0;
         }
         if (emptyState) {
             emptyState.hidden = this.isLoadingElements || !!this.error || this.elements.length > 0;
             if (!emptyState.hidden) {
                 emptyState.textContent = this.elementSearchQuery.length > 0 ? 'No elements found matching search criteria.'
                    : `No elements found for component "${this.parentComponent?.name || ''}". Click "New Element".`;
             }
         }
     }

    addEventListeners() {
        this.qsOptional<AppButton>('#back-button')?.addEventListener('click', () => router.navigate('/signatures'));
        this.qsOptional<AppButton>('#create-button')?.addEventListener('click', this.handleCreateElement);
        this.qsOptional<SearchBar>('#search-bar')?.addEventListener('search', this.handleElementSearch);
        this.qsOptional<Pagination>('#pagination')?.addEventListener('pagechange', this.handleElementPageChange);
        const elementList = this.qsOptional<ElementList>('#element-list');
        if (elementList) {
            elementList.addEventListener('edit', this.handleEditElement);
            elementList.addEventListener('delete', this.handleDeleteElement);
        }
    }
    removeEventListeners() {
        // Base class handles removal
    }

     private handleElementSearch = (event: Event) => {
         const customEvent = event as CustomEvent<{ query: SearchQuery }>;
        this.elementSearchQuery = customEvent.detail.query;
        this.currentElementPage = 1;
        this.fetchElements();
    }
    private handleElementPageChange = (event: Event) => {
        const customEvent = event as CustomEvent<{ page: number }>;
        this.currentElementPage = customEvent.detail.page;
        this.fetchElements();
    }

    // --- Dynamic Editor Logic ---
    private handleEditElement = (event: Event) => {
        const customEvent = event as CustomEvent<{ element: SignatureElement }>;
        const elementToEdit = customEvent.detail.element;
        if (!this.parentComponent || !this.auth.isAuthenticated) {
             showToast("Cannot edit element: Component context or authentication missing.", "warning"); return;
        }
        this.openEditor(elementToEdit);
    };

     private handleCreateElement = () => {
         if (!this.parentComponent || !this.auth.isAuthenticated) {
              showToast("Cannot create element: Component context or authentication missing.", "warning"); return;
         }
        this.openEditor(null);
    };

    private openEditor(element: SignatureElement | null): void {
        this.activeEditorDialog?.remove(); // Clean up previous

        // 1. Create Dialog
        const dialog = document.createElement('app-dialog');
        dialog.setAttribute('size', 'lg');
        dialog.innerHTML = `<h2 slot="header">${element ? 'Edit Element' : 'Create New Element'}</h2>`;

        // 2. Create Editor
        const editor = document.createElement('element-form');
        editor.component = this.parentComponent;
        editor.elementToEdit = element;

        // 3. Append Editor to Dialog
        dialog.appendChild(editor);

        // 4. Append Dialog to Page
        this.shadowRoot?.appendChild(dialog);
        this.activeEditorDialog = dialog;

        // 5. Add Listeners
        const saveListener = (event: Event) => this.handleElementSaveSuccess(event);
        editor.addEventListener('save', saveListener);

        dialog.addEventListener('close', () => {
            editor.removeEventListener('save', saveListener);
            dialog.remove();
            this.activeEditorDialog = null;
        }, { once: true });

        // 6. Show Dialog
        dialog.show();
    }

     private handleElementSaveSuccess = async (event?: Event): Promise<void> => {
        this.activeEditorDialog?.hide(); // Ensure dialog closes
        // Refetch elements AND parent component to update count
        await this.fetchElements();
         if (this.componentId) await this.fetchParentComponent(this.componentId);
    };

     private handleDeleteElement = async (event: Event): Promise<void> => {
       const customEvent = event as CustomEvent<{ elementId: number }>;
       const elementId = customEvent.detail.elementId;
       if (!this.parentComponent || !this.auth.token) return;
       if (!this.auth.isAdmin) {
            showToast("Admin privileges required to delete elements.", "error"); return;
       }
       if (!window.confirm("Are you sure you want to delete this element? This may break signature references.")) return;

       this.setLoadingState(true);
       try {
           await api.deleteSignatureElement(elementId);
           showToast("Element deleted successfully.", "success");
           // Recalculate page and fetch elements
           const newTotalElements = this.totalElements - 1;
           const newTotalPages = Math.max(1, Math.ceil(newTotalElements / ELEMENTS_PAGE_SIZE));
           this.currentElementPage = Math.min(this.currentElementPage, newTotalPages);
           await this.fetchElements();
           // Refetch parent to update count
            if (this.componentId) await this.fetchParentComponent(this.componentId);

       } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
            this.setErrorState(err.message);
            this.setLoadingState(false); // Set loading false only on error
       }
    };
}

// Define the component unless already defined
if (!customElements.get('elements-page')) {
    customElements.define('elements-page', ElementsPage);
}