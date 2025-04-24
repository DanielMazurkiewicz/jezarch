import { BaseComponent } from '../base-component';
import type { ArchiveDocumentSearchResult, ArchiveDocumentType } from '../../../../backend/src/functionalities/archive/document/models';
import { icons } from '../../lib/icons';
import { formatDate, escapeHtml } from '../../lib/utils';
// Import component definitions/types
import '../ui/app-button';
import '../ui/app-badge';
import type { AppButton } from '../ui/app-button';

// Event detail types
interface EditEventDetail { element: ArchiveDocumentSearchResult; }
interface DeleteEventDetail { elementId: number; } // Use elementId to match parent page handler
interface PreviewEventDetail { element: ArchiveDocumentSearchResult; }
interface OpenUnitEventDetail { element: ArchiveDocumentSearchResult; } // For opening units

export class DocumentList extends BaseComponent {
    private _documents: ArchiveDocumentSearchResult[] = [];

    set documents(value: ArchiveDocumentSearchResult[]) {
        this._documents = value;
        this.renderTable();
    }
    get documents(): ArchiveDocumentSearchResult[] { return this._documents; }

    constructor() {
        super();
        this.handleTableClick = this.handleTableClick.bind(this);
    }

    protected get styles(): string {
         return `
            :host { display: block; }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; table-layout: fixed; }
            /* Column Widths */
            col.col-type { width: 60px; text-align: center; }
            col.col-title { width: 35%; }
            col.col-creator { width: 15%; }
            col.col-date { width: 100px; }
            col.col-tags { width: auto; } /* Let tags take remaining space */
            col.col-status { width: 80px; }
            col.col-actions { width: 120px; } /* Actions need more space */

            th, td { padding: var(--spacing-2) var(--spacing-3); text-align: left; border-bottom: 1px solid var(--color-border); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; } /* Added vertical-align */
            th { font-weight: 500; color: var(--color-muted-foreground); background-color: var(--color-muted); }
            th.actions-header { text-align: center; } /* Center actions header text */
            tr:last-child td { border-bottom: none; }
            tr:hover { background-color: var(--color-muted); }
            td.actions {
                 text-align: right;
                 white-space: nowrap;
                 padding-right: var(--spacing-2);
                 /* Add flexbox */
                 display: flex;
                 justify-content: flex-end;
                 align-items: center;
                 gap: var(--spacing-1);
            }
            td.title-cell { font-weight: 500; cursor: pointer; }
            td.title-cell:hover { color: var(--color-primary); text-decoration: underline; }
            td.type-cell { text-align: center; }
            td.type-cell svg { width: 1rem; height: 1rem; margin: 0 auto; display: block; color: var(--color-muted-foreground); }
            td.type-cell svg.unit-icon { color: var(--color-primary); }
            td.tags-cell .tags-wrapper { display: flex; flex-wrap: wrap; gap: var(--spacing-1); }
            app-button { vertical-align: middle; }
            .no-documents { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
            .text-xs { font-size: 0.75rem; }
            .italic { font-style: italic; }
            .text-muted { color: var(--color-muted-foreground); }
            .action-placeholder {
                 display: inline-block;
                 width: 2.25rem; /* Match icon button size */
                 height: 2.25rem; /* Match icon button size */
                 vertical-align: middle;
             }
             /* Ensure SVGs inside buttons are sized correctly */
             td.actions app-button svg {
                 width: 1rem;
                 height: 1rem;
             }
        `;
    }

    protected get template(): string {
        return `<div class="table-container"></div>`;
    }

    connectedCallback() {
        super.connectedCallback();
        this.addEventListeners();
        this.renderTable();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Handles removing listeners
    }

    addEventListeners(): void {
        this.shadow.addEventListener('click', this.handleTableClick as EventListener);
    }
    removeEventListeners(): void {
        this.shadow.removeEventListener('click', this.handleTableClick as EventListener);
    }

    private handleTableClick(event: MouseEvent): void {
        const target = event.target as HTMLElement;
        const button = target.closest<AppButton>('app-button[data-action]');
        const titleCell = target.closest<HTMLTableCellElement>('td.title-cell');
        const row = target.closest<HTMLTableRowElement>('tr[data-id]');
        const docId = parseInt(row?.dataset.id || '', 10);

        if (isNaN(docId)) return;

        const doc = this._documents.find(d => d.archiveDocumentId === docId);
        if (!doc) return;

        if (button) {
            event.stopPropagation(); // Prevent row click if button is clicked
            const action = button.dataset.action;
            if (action === 'edit') {
                 this.dispatchEvent(new CustomEvent<EditEventDetail>('edit', { detail: { element: doc }, bubbles: true, composed: true }));
            } else if (action === 'delete') {
                 this.dispatchEvent(new CustomEvent<DeleteEventDetail>('delete', { detail: { elementId: docId }, bubbles: true, composed: true }));
            }
        } else if (titleCell) {
             // Click on title opens unit or previews document
             if (doc.type === 'unit') {
                this.dispatchEvent(new CustomEvent<OpenUnitEventDetail>('open-unit', { detail: { element: doc }, bubbles: true, composed: true }));
             } else {
                this.dispatchEvent(new CustomEvent<PreviewEventDetail>('preview', { detail: { element: doc }, bubbles: true, composed: true }));
             }
        }
    }

    private renderTable(): void {
        if (!this.isConnected) return;
        const container = this.shadow.querySelector('.table-container');
        if (!container) return;

        if (this._documents.length === 0) {
            container.innerHTML = `<div class="no-documents">No documents or units found.</div>`;
            return;
        }

        const currentUserId = this.auth.user?.userId;
        const isAdmin = this.auth.isAdmin;
        const unitIcon = icons.folderOpen ?? '';
        const docIcon = icons.fileText ?? '';

        const tableRows = this._documents.map(doc => {
            const isOwner = doc.ownerUserId === currentUserId;
            const canModify = isAdmin || isOwner;
            const typeIcon = doc.type === 'unit' ? unitIcon : docIcon;
            const typeClass = doc.type === 'unit' ? 'unit-icon' : '';
            const titleClickAction = doc.type === 'unit' ? 'Click to open unit' : `Click to preview '${escapeHtml(doc.title)}'`;

            const tagBadges = (doc.tags || [])
                .slice(0, 2) // Limit displayed tags more aggressively
                .map(tag => `<app-badge variant="secondary">${escapeHtml(tag.name)}</app-badge>`)
                .join('');
            const moreTags = (doc.tags?.length || 0) > 2 ? `<app-badge variant="outline">+${(doc.tags?.length || 0) - 2} more</app-badge>` : '';
            const noTags = (!doc.tags || doc.tags.length === 0) ? `<span class="text-xs italic text-muted">No tags</span>` : '';

            // Use icon attribute now
            const editButtonHtml = canModify ? `
                <app-button variant="ghost" size="icon" data-action="edit" data-doc-id="${doc.archiveDocumentId}" title="Edit Item" icon="edit"></app-button>
             ` : `<span class="action-placeholder"></span>`;

             const deleteButtonHtml = canModify && doc.active ? `
                 <app-button variant="ghost" size="icon" data-action="delete" data-doc-id="${doc.archiveDocumentId}" title="Disable Item" icon="trash2"></app-button>
             ` : `<span class="action-placeholder"></span>`;


            return `
                <tr data-id="${doc.archiveDocumentId}">
                    <td class="type-cell" title="${doc.type}">
                        <svg class="${typeClass}" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                             ${typeof typeIcon === 'function' ? typeIcon() : typeIcon}
                        </svg>
                    </td>
                    <td class="title-cell" title="${titleClickAction}">${escapeHtml(doc.title)}</td>
                    <td>${escapeHtml(doc.creator)}</td>
                    <td>${formatDate(doc.creationDate)}</td>
                     <td class="tags-cell"><div class="tags-wrapper">${tagBadges}${moreTags}${noTags}</div></td>
                    <td class="status-cell">
                         ${doc.active ? '<app-badge variant="success">Active</app-badge>' : '<app-badge variant="destructive">Inactive</app-badge>'}
                     </td>
                    <td class="actions">
                        ${editButtonHtml}
                        ${deleteButtonHtml}
                    </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table>
                <colgroup>
                     <col class="col-type">
                     <col class="col-title">
                     <col class="col-creator">
                     <col class="col-date">
                     <col class="col-tags">
                     <col class="col-status">
                     <col class="col-actions">
                 </colgroup>
                <thead>
                    <tr>
                        <th class="col-type">Type</th>
                        <th class="col-title">Title</th>
                        <th class="col-creator">Creator</th>
                        <th class="col-date">Created</th>
                        <th class="col-tags">Tags</th>
                        <th class="col-status">Status</th>
                        <th class="actions-header">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        `;
    }
}

// Define the component unless already defined
if (!customElements.get('document-list')) {
    customElements.define('document-list', DocumentList);
}