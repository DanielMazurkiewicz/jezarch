import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import api from '../../../lib/api';
// Assuming CreateTagInput, UpdateTagInput are exported from the backend models
import type { Tag, CreateTagInput, UpdateTagInput } from '../../../../../backend/src/functionalities/tag/models';
// Import components and types
import '../../ui/app-card';
import '../../ui/app-button';
import '../../ui/app-dialog';
import '../../ui/app-input';
import '../../ui/app-label';
import '../../ui/error-display';
import '../../ui/loading-spinner';
import '../../tags/tag-list'; // Corrected path
import '../../tags/tag-form'; // Corrected path

// Import component types
import type { AppButton } from '../../ui/app-button';
import type { AppDialog } from '../../ui/app-dialog';
import type { ErrorDisplay } from '../../ui/error-display';
import type { TagList } from '../../tags/tag-list'; // Corrected path
import type { TagForm } from '../../tags/tag-form'; // Corrected path


export class TagsPage extends BaseComponent {
    // --- State ---
    private tags: Tag[] = [];
    private isLoadingTags: boolean = false;
    private errorTags: string | null = null;

    // Store reference to dynamically created dialog
    private activeEditorDialog: AppDialog | null = null;

    constructor() {
        super();
        this.handleCreateNew = this.handleCreateNew.bind(this);
        this.handleEdit = this.handleEdit.bind(this);
        this.handleDelete = this.handleDelete.bind(this);
        this.handleSaveSuccess = this.handleSaveSuccess.bind(this);
    }

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
             .page-header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); margin-bottom: var(--spacing-4); }
             .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
             .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); margin-top: var(--spacing-1); }
             .actions { flex-shrink: 0; }
             .list-container { position: relative; } /* Needed for loading overlay */
             #list-loading { position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.7); display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius); }
             .empty-state { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             app-card [slot="header"] { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--spacing-4); }
             app-card [slot="header"] h3 { font-size: 1.25rem; margin: 0; }
             app-card [slot="header"] p { font-size: 0.875rem; color: var(--color-muted-foreground); margin: 0; margin-top: 2px; }
        `;
    }

    protected get template(): string {
        // *** ENSURED static dialog is REMOVED ***
        const canManage = this.auth.isAdmin; // Only admins can manage tags
        return `
             <div class="page-header">
                 <div>
                     <h1 class="header-title">Tag Management</h1>
                     <p class="header-description">Create, edit, and delete tags used across notes and documents.</p>
                 </div>
                  <div class="actions">
                      <app-button id="create-button" icon="plusCircle" ${canManage ? '' : 'disabled'}> Create Tag</app-button>
                 </div>
             </div>

             <app-card>
                 <div slot="header">
                     <div>
                         <h3>Tag List</h3>
                         <p>Manage available tags.</p>
                    </div>
                 </div>
                 <div slot="content" class="list-container">
                     <error-display id="list-error" hidden></error-display>
                     <div id="list-loading" style="display: none;"><loading-spinner size="lg"></loading-spinner></div>
                     <tag-list id="tag-list"></tag-list>
                     <div id="empty-state" class="empty-state" hidden>No tags found. Click "Create Tag" to start.</div>
                 </div>
             </app-card>
             <!-- No static dialog here -->
        `;
    }

    async connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAdmin && !this.auth.isLoading) {
             this.setErrorState("Admin privileges required to manage tags.");
             this.render(); // Render error message
             return;
        }
        // Listeners added via base class connectedCallback -> render -> addEventListeners
        await this.fetchTags();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners
        this.activeEditorDialog?.remove();
    }

    private async fetchTags() {
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            if (!this.auth.token) throw new Error("Not authenticated");
            this.tags = (await api.getAllTags()).sort((a, b) => a.name.localeCompare(b.name));
        } catch (err: any) {
            this.setErrorState(err.message || 'Failed to fetch tags');
            this.tags = [];
        } finally {
            this.setLoadingState(false);
        }
    }

    private setLoadingState(isLoading: boolean) {
        this.isLoadingTags = isLoading;
        const loadingOverlay = this.qsOptional<HTMLElement>('#list-loading');
        if (loadingOverlay) loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        const list = this.qsOptional<TagList>('#tag-list');
        const empty = this.qsOptional<HTMLElement>('#empty-state');

        this.qsOptional<ErrorDisplay>('#list-error')?.toggleAttribute('hidden', true); // Hide error while loading
        this.qsOptional<AppButton>('#create-button')?.toggleAttribute('disabled', isLoading || !this.auth.isAdmin);

        if (list) list.hidden = isLoading || !!this.errorTags; // Hide list while loading or if error
        if (empty) empty.hidden = isLoading || this.tags.length > 0 || !!this.errorTags;

        if (!isLoading && !this.errorTags) {
            this.updateTagList();
        }
    }

    private setErrorState(error: string | null) {
        this.errorTags = error;
        const errorDisplay = this.qsOptional<ErrorDisplay>('#list-error');
        if (errorDisplay) {
            errorDisplay.message = error || '';
            errorDisplay.hidden = !error || this.isLoadingTags;
        }
        // Hide list and empty state if there's an error
        if (error) {
            this.qsOptional<TagList>('#tag-list')?.toggleAttribute('hidden', true);
            this.qsOptional<HTMLElement>('#empty-state')?.toggleAttribute('hidden', true);
        }
    }

    private updateTagList() {
         const listComponent = this.qsOptional<TagList>('#tag-list');
         const emptyState = this.qsOptional<HTMLElement>('#empty-state');

         if (this.errorTags) return; // Don't update if error

         if (listComponent) {
             listComponent.tags = this.tags;
             listComponent.hidden = this.tags.length === 0;
         }
         if (emptyState) {
             emptyState.hidden = this.isLoadingTags || !!this.errorTags || this.tags.length > 0;
         }
    }

    addEventListeners() {
        this.registerListener(this.qsOptional<AppButton>('#create-button'), 'click', this.handleCreateNew);
        const list = this.qsOptional<TagList>('#tag-list');
        if (list) {
            this.registerListener(list, 'edit', this.handleEdit);
            this.registerListener(list, 'delete', this.handleDelete);
        }
    }
    // removeEventListeners is handled by BaseComponent

    private handleCreateNew = () => {
        if (!this.auth.isAdmin) return;
        this.openEditor(null);
    }

    private handleEdit = (event: Event) => {
        if (!this.auth.isAdmin) return;
        const customEvent = event as CustomEvent<{ tag: Tag }>;
        this.openEditor(customEvent.detail.tag);
    }

    private handleDelete = async (event: Event) => {
        if (!this.auth.isAdmin) return;
        const customEvent = event as CustomEvent<{ tagId: number }>;
        const tagId = customEvent.detail.tagId;
        const tag = this.tags.find(t => t.tagId === tagId);
        if (!tag) return;

        if (!window.confirm(`Are you sure you want to delete the tag "${tag.name}"? This may affect notes and documents using this tag.`)) return;

        this.setLoadingState(true); // Show loading indicator on the list
        try {
            await api.deleteTag(tagId);
            showToast("Tag deleted successfully.", "success");
            await this.fetchTags(); // Refresh list
        } catch (err: any) {
            showToast(`Delete failed: ${err.message}`, "error");
            this.setErrorState(err.message);
            this.setLoadingState(false); // Stop loading only on error
        }
    }

    // --- Dynamic Editor Logic ---
    private openEditor(tag: Tag | null): void {
        this.activeEditorDialog?.remove(); // Clean up previous

        // 1. Create Dialog
        const dialog = document.createElement('app-dialog') as AppDialog;
        dialog.innerHTML = `<h2 slot="header">${tag ? 'Edit Tag' : 'Create New Tag'}</h2>`;

        // 2. Create Form
        const form = document.createElement('tag-form') as TagForm;
        form.tagToEdit = tag; // Pass the tag data to the form

        // 3. Append Form to Dialog
        dialog.appendChild(form);

        // 4. Append Dialog to Page Shadow DOM
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
        // Refetch tags after save
        this.fetchTags();
    };
}

// Define the component unless already defined
if (!customElements.get('tags-page')) {
    customElements.define('tags-page', TagsPage);
}