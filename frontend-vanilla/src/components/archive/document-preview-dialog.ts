import { BaseComponent } from '../base-component';
import type { ArchiveDocument } from '../../../../backend/src/functionalities/archive/document/models';
import { formatDate, escapeHtml } from '../../lib/utils';
import { icons } from '../../lib/icons';
// Import component definitions/types
import '../ui/app-dialog';
import '../ui/app-badge';
import '../ui/app-button';
import type { AppDialog } from '../ui/app-dialog';
import type { AppButton } from '../ui/app-button'; // Import AppButton type

export class DocumentPreviewDialog extends BaseComponent {
    private _doc: ArchiveDocument | null = null;
    private _parentUnitTitle: string | undefined = undefined;
    private dialog: AppDialog | null = null;

    set doc(value: ArchiveDocument | null) {
        this._doc = value;
        this.updateContent();
    }
    get doc(): ArchiveDocument | null { return this._doc; }

    set parentUnitTitle(value: string | undefined) {
        this._parentUnitTitle = value;
        this.updateContent(); // Update header if parent title changes
    }
    get parentUnitTitle(): string | undefined { return this._parentUnitTitle; }

    set open(isOpen: boolean) {
        if (this.dialog) this.dialog.open = isOpen;
    }
    get open(): boolean {
        return this.dialog?.open ?? false;
    }

    constructor() {
        super();
        this.handleEditRequest = this.handleEditRequest.bind(this);
        this.handleDisableRequest = this.handleDisableRequest.bind(this);
    }

    protected get styles(): string {
         return `
             :host { display: contents; }
             .header-content {
                padding-bottom: var(--spacing-2);
                border-bottom: 1px solid var(--color-border);
                margin-bottom: var(--spacing-3);
             }
             .dialog-title { font-size: 1.125rem; font-weight: 600; margin-bottom: var(--spacing-1); }
             .dialog-subtitle { font-size: 0.875rem; color: var(--color-muted-foreground); margin-bottom: var(--spacing-2); }
             .dialog-subtitle app-badge { margin-left: var(--spacing-2); vertical-align: middle; }
             .tags-container { display: flex; flex-wrap: wrap; gap: var(--spacing-1); margin-top: var(--spacing-2); }

             .details-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-3) var(--spacing-6); font-size: 0.875rem; line-height: 1.4; }
             .detail-item strong { display: block; color: var(--color-muted-foreground); font-weight: 500; margin-bottom: 2px; font-size: 0.75rem; }
             .detail-item span { word-break: break-word; }
             .detail-item.full-width { grid-column: 1 / -1; }
             .detail-item pre { background-color: var(--color-muted); padding: var(--spacing-2); border-radius: var(--radius); font-family: var(--font-mono); font-size: 0.8rem; white-space: pre-wrap; word-break: break-word; max-height: 150px; overflow-y: auto; }

             .dialog-footer { display: flex; justify-content: flex-end; gap: var(--spacing-2); }
              em { font-style: normal; color: var(--color-muted-foreground); } /* Style for N/A */
         `;
    }

    protected get template(): string {
        return `<app-dialog id="doc-preview-dialog" size="xl"></app-dialog>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.dialog = this.qs<AppDialog>('#doc-preview-dialog');
        this.addEventListeners(); // Add listeners specific to this component
        this.dialog?.addEventListener('close', () => {
             this.dispatchEvent(new CustomEvent('close'));
             // Clean up doc when closed
             this.doc = null;
        });
        this.updateContent(); // Initial render if doc is set
    }

     disconnectedCallback(): void {
        super.disconnectedCallback(); // Base removes listeners added in addEventListeners
     }

     addEventListeners(): void {
         // No listeners needed in this method as they are added in updateContent
     }

     removeEventListeners(): void {
          // No listeners to remove here
     }

    private updateContent(): void {
        if (!this.dialog || !this.isConnected) return;

        if (!this._doc) {
            this.dialog.innerHTML = ''; // Clear if no doc
            return;
        }
        const doc = this._doc;
        const canModify = this.auth.isAdmin || this.auth.user?.userId === doc.ownerUserId;

        const tagsHtml = (doc.tags || [])
            .map(tag => `<app-badge variant="secondary">${escapeHtml(tag.name)}</app-badge>`)
            .join('');

        // Helper to render detail item
        const detail = (label: string, value: string | number | boolean | null | undefined, isFullWidth = false, isPre = false) => {
            const displayValue = (value === null || value === undefined || value === '') ? '<em>N/A</em>' : escapeHtml(String(value));
            const content = isPre ? `<pre><code>${displayValue}</code></pre>` : `<span>${displayValue}</span>`;
            return `<div class="detail-item ${isFullWidth ? 'full-width' : ''}"><strong>${label}</strong> ${content}</div>`;
        };
        const boolDetail = (label: string, value: boolean | undefined | null) => {
            const displayValue = value ? 'Yes' : 'No';
            return detail(label, displayValue);
        };

        this.dialog.innerHTML = `
            <div slot="header" class="header-content">
                 <h2 class="dialog-title">${escapeHtml(doc.title)}</h2>
                 <p class="dialog-subtitle">
                     Type: <strong>${doc.type}</strong> | By: ${escapeHtml(doc.ownerLogin || 'Unknown')} | Created: ${formatDate(doc.createdOn)}
                     ${doc.active ? '<app-badge variant="success">Active</app-badge>' : '<app-badge variant="destructive">Inactive</app-badge>'}
                     ${this._parentUnitTitle ? `<app-badge variant="outline">In Unit: ${escapeHtml(this._parentUnitTitle)}</app-badge>` : ''}
                 </p>
                 ${tagsHtml ? `<div class="tags-container">${tagsHtml}</div>` : ''}
             </div>

             <div class="details-grid">
                 ${detail('Creator', doc.creator)}
                 ${detail('Creation Date', doc.creationDate)}
                 ${detail('Pages', doc.numberOfPages)}
                 ${detail('Doc Type', doc.documentType)}
                 ${detail('Dimensions', doc.dimensions)}
                 ${detail('Binding', doc.binding)}
                 ${detail('Condition', doc.condition)}
                 ${detail('Language', doc.documentLanguage)}
                 ${detail('Access Level', doc.accessLevel)}
                 ${detail('Access Conditions', doc.accessConditions)}
                 ${boolDetail('Digitized?', doc.isDigitized)}
                 ${detail('Digitized Link', doc.digitizedVersionLink)}
                 ${detail('Content Desc.', doc.contentDescription, true, true)}
                 ${detail('Remarks', doc.remarks, true, true)}
                 ${detail('Related Docs', doc.relatedDocumentsReferences, true, true)}
                 ${detail('Other Info', doc.additionalInformation, true, true)}
                 ${detail('Internal ID', doc.archiveDocumentId)}
                 ${detail('Parent ID', doc.parentUnitArchiveDocumentId)}
                 ${detail('Last Modified', formatDate(doc.modifiedOn))}
             </div>

            <div slot="footer" class="dialog-footer">
                 ${canModify ? `
                    <app-button variant="outline" size="sm" id="edit-doc-button" icon="edit">Edit</app-button>
                 ` : ''}
                 ${canModify && doc.active ? `
                    <app-button variant="destructive-outline" size="sm" id="disable-doc-button" icon="trash2">Disable</app-button>
                 ` : ''}
                 <app-button variant="default" size="sm" id="close-preview-button">Close</app-button>
             </div>
        `;

        // Add listeners to newly created buttons WITHIN the dialog
        this.dialog.querySelector('#close-preview-button')?.addEventListener('click', () => this.hide());
        this.dialog.querySelector('#edit-doc-button')?.addEventListener('click', this.handleEditRequest);
        this.dialog.querySelector('#disable-doc-button')?.addEventListener('click', this.handleDisableRequest);
    }

    private handleEditRequest() {
        if (!this._doc) return;
        this.dispatchEvent(new CustomEvent('edit-request', { detail: { element: this._doc }, bubbles: true, composed: true }));
        this.hide(); // Close preview after requesting edit
    }

    private handleDisableRequest() {
        if (!this._doc?.archiveDocumentId) return;
        this.dispatchEvent(new CustomEvent('disable-request', { detail: { elementId: this._doc.archiveDocumentId }, bubbles: true, composed: true }));
        this.hide(); // Close preview after requesting disable
    }

    // --- Public Methods ---
    show(doc: ArchiveDocument): void {
        this.doc = doc;
        this.open = true;
    }
    hide(): void {
        this.open = false;
        // Keep doc data until close event listener cleans it up
    }
}

// Define the component unless already defined
if (!customElements.get('document-preview-dialog')) {
    customElements.define('document-preview-dialog', DocumentPreviewDialog);
}