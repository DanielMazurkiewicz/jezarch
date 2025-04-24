import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import api from '../../../lib/api';
import { router } from '../../../index';
import type { SignatureComponent } from '../../../../../backend/src/functionalities/signature/component/models';
import { icons } from '../../../lib/icons';
// Import necessary components and types (ensure definitions are loaded)
import '../../ui/app-card';
import '../../ui/app-button';
import '../../ui/app-dialog';
import '../../ui/app-badge';
import '../../ui/error-display';
import '../../ui/loading-spinner';
import '../../signatures/component-list';
import '../../signatures/component-form';

// Import component types explicitly
import type { AppButton } from '../../ui/app-button';
import type { ComponentList } from '../../signatures/component-list';
import type { AppDialog } from '../../ui/app-dialog';
import type { ComponentForm } from '../../signatures/component-form';
import type { ErrorDisplay } from '../../ui/error-display';


export class ComponentsPage extends BaseComponent {

    // --- State ---
    private components: SignatureComponent[] = [];
    private isLoading: boolean = false;
    private error: string | null = null;

    // Store reference to dynamically created dialog
    private activeEditorDialog: AppDialog | null = null;

    constructor() {
        super();
        this.handleCreateNew = this.handleCreateNew.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleManageElements = this.handleManageElements.bind(this);
        this.handleSaveSuccess = this.handleSaveSuccess.bind(this);
        this.handleReindex = this.handleReindex.bind(this); // Bind reindex handler
    }

    protected get styles(): string {
        return `
            :host { display: block; }
             .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
             .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
             .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); margin-top: var(--spacing-1); }
             .actions { flex-shrink: 0; }
             .list-container { position: relative; } /* Needed for loading overlay */
             .loading-container { padding: var(--spacing-8); text-align: center; }
             #list-loading { position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius); }
             .empty-state { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             app-card [slot="header"] { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); }
             app-card [slot="header"] h3 { font-size: 1.25rem; margin: 0; }
             app-card [slot="header"] p { font-size: 0.875rem; color: var(--color-muted-foreground); margin: 0; margin-top: 2px; }
        `;
    }

    protected get template(): string {
        // *** ENSURED static dialog is REMOVED ***
        const canCreate = this.auth.isAdmin; // Only admins can manage components
        return `
            <div class="page-header">
                <div>
                    <h1 class="header-title">Signature Components</h1>
                    <p class="header-description">Manage the building blocks of document signatures.</p>
                </div>
                <div class="actions">
                    <app-button id="create-button" icon="plusCircle" ${canCreate ? '' : 'disabled'}>
                        Create Component
                    </app-button>
                </div>
            </div>

             <app-card>
                <div slot="header">
                    <div>
                        <h3>Component List</h3>
                        <p>Define and manage signature components.</p>
                    </div>
                     <!-- Can add filtering/sorting controls here later -->
                </div>
                <div slot="content" class="list-container">
                    <error-display id="list-error" hidden></error-display>
                    <div id="list-loading" style="display: none;"><loading-spinner size="lg"></loading-spinner></div>
                    <component-list id="component-list"></component-list>
                    <div id="empty-state" class="empty-state" hidden>No components found. Click "Create Component" to start.</div>
                </div>
             </app-card>
             <!-- No static dialog here -->
        `;
    }

    async connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAdmin && !this.auth.isLoading) {
            this.setErrorState("Admin privileges required to manage signature components.");
            this.render(); // Render error message
            return;
        }
        // Listeners added via base class connectedCallback -> render -> addEventListeners
        await this.fetchComponents();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners
        this.activeEditorDialog?.remove();
    }

    private async fetchComponents() {
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            if (!this.auth.token) throw new Error("Not authenticated"); // Should be checked by isAdmin but belt-and-suspenders
            this.components = (await api.getAllSignatureComponents()).sort((a, b) => a.name.localeCompare(b.name));
        } catch (err: any) {
            this.setErrorState(err.message || 'Failed to fetch components');
            this.components = [];
        } finally {
            this.setLoadingState(false);
        }
    }

    private setLoadingState(isLoading: boolean) {
        this.isLoading = isLoading;
        // Use qsOptional and check for existence
        const loadingOverlay = this.qsOptional<HTMLElement>('#list-loading');
        if (loadingOverlay) loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        this.qsOptional<ErrorDisplay>('#list-error')?.toggleAttribute('hidden', true); // Hide error while loading
        this.qsOptional<AppButton>('#create-button')?.toggleAttribute('disabled', isLoading || !this.auth.isAdmin);

        if (!isLoading) {
            this.updateListComponent();
        } else {
            this.qsOptional<ComponentList>('#component-list')?.toggleAttribute('hidden', true);
            this.qsOptional<HTMLElement>('#empty-state')?.toggleAttribute('hidden', true);
        }
    }

    private setErrorState(error: string | null) {
        this.error = error;
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');
        if (errorDisplay) {
            errorDisplay.message = error || '';
            errorDisplay.hidden = !error || this.isLoading;
        }
        // Hide list and empty state if there's an error
        if (error) {
            this.qsOptional<ComponentList>('#component-list')?.toggleAttribute('hidden', true);
            this.qsOptional<HTMLElement>('#empty-state')?.toggleAttribute('hidden', true);
        }
    }

    private updateListComponent() {
        const listComponent = this.qsOptional<ComponentList>('#component-list');
        const emptyState = this.qsOptional<HTMLElement>('#empty-state');

        if (this.error) { // Don't update list if there was an error
             if (listComponent) listComponent.hidden = true;
             if (emptyState) emptyState.hidden = true;
             return;
        }

        if (listComponent) {
            listComponent.components = this.components;
            listComponent.hidden = this.components.length === 0;
        }
        if (emptyState) {
            emptyState.hidden = this.isLoading || !!this.error || this.components.length > 0;
        }
    }

    addEventListeners() {
        this.registerListener(this.qsOptional<AppButton>('#create-button'), 'click', this.handleCreateNew);
        const list = this.qsOptional<ComponentList>('#component-list');
        if (list) {
            this.registerListener(list, 'edit', this.handleEdit);
            this.registerListener(list, 'delete', this.handleDelete);
            this.registerListener(list, 'manage-elements', this.handleManageElements);
            this.registerListener(list, 'reindex', this.handleReindex); // Listen for reindex event
        }
    }

    // removeEventListeners is handled by BaseComponent

    private handleCreateNew = () => {
        if (!this.auth.isAdmin) return;
        this.openEditor(null);
    }

    private handleEdit = (event: Event) => {
        if (!this.auth.isAdmin) return;
        const customEvent = event as CustomEvent<{ component: SignatureComponent }>;
        this.openEditor(customEvent.detail.component);
    }

    private handleDelete = async (event: Event) => {
        if (!this.auth.isAdmin) return;
        const customEvent = event as CustomEvent<{ componentId: number }>;
        const componentId = customEvent.detail.componentId;
        const component = this.components.find(c => c.signatureComponentId === componentId);
        if (!component) return;

        if (!window.confirm(`Are you sure you want to delete the component "${component.name}" and all its elements? This cannot be undone.`)) return;

        this.setLoadingState(true);
        try {
            await api.deleteSignatureComponent(componentId);
            showToast("Component deleted successfully.", "success");
            await this.fetchComponents(); // Refresh list
        } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
            this.setErrorState(err.message);
            this.setLoadingState(false); // Stop loading only on error
        }
    }

    private handleManageElements = (event: Event) => {
        const customEvent = event as CustomEvent<{ componentId: number }>;
        router.navigate(`/signatures/components/${customEvent.detail.componentId}/elements`);
    }

     private handleReindex = async (event: Event) => {
         if (!this.auth.isAdmin) return;
         const customEvent = event as CustomEvent<{ componentId: number }>;
         const componentId = customEvent.detail.componentId;
         const component = this.components.find(c => c.signatureComponentId === componentId);
         if (!component) return;

         if (!window.confirm(`Re-index elements for "${component.name}"? This will update indices based on parent relationships and names/existing indices.`)) return;

         this.setLoadingState(true);
         try {
             // TODO: Replace with actual API call when backend endpoint exists
             console.warn("Calling MOCK reindexComponentElements API");
             // Assuming a mock or future API function:
             // const result = await api.reindexComponentElements(componentId);
             // Mock success for now:
             await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
             const result = { finalCount: component.index_count ?? 0 }; // Mock result
             showToast(`Component re-indexed successfully (${result.finalCount} elements).`, "success");
             // --- End Mock ---
             await this.fetchComponents(); // Refresh list (to update count potentially)
         } catch (err: any) {
             showToast(`Re-index failed: ${err.message}`, "error");
             this.setErrorState(err.message);
             this.setLoadingState(false); // Stop loading only on error
         }
     }

    private openEditor(component: SignatureComponent | null): void {
        this.activeEditorDialog?.remove(); // Clean up previous

        // 1. Create Dialog
        const dialog = document.createElement('app-dialog') as AppDialog;
        dialog.innerHTML = `<h2 slot="header">${component ? 'Edit Component' : 'Create New Component'}</h2>`;

        // 2. Create Form
        const form = document.createElement('component-form') as ComponentForm;
        form.componentToEdit = component;

        // 3. Append Form to Dialog
        dialog.appendChild(form);

        // 4. Append Dialog to Page
        this.shadowRoot?.appendChild(dialog);
        this.activeEditorDialog = dialog;

        // 5. Add Listeners
        const saveListener = (event: Event) => this.handleSaveSuccess(event);
        form.addEventListener('save', saveListener);

        dialog.addEventListener('close', () => {
            form.removeEventListener('save', saveListener);
            dialog.remove();
            this.activeEditorDialog = null;
        }, { once: true });

        // 6. Show Dialog
        dialog.show();
    }

    private handleSaveSuccess = (event?: Event): void => {
        this.activeEditorDialog?.hide();
        // Refetch components after save
        this.fetchComponents();
    };
}

// Define the component unless already defined
if (!customElements.get('components-page')) {
    customElements.define('components-page', ComponentsPage);
}