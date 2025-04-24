import { BaseComponent } from '../base-component';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import { icons } from '../../lib/icons';
import { escapeHtml } from '../../lib/utils'; // Import escapeHtml
// Import components and types
import '../ui/app-button';
// Import types explicitly
import type { AppButton } from '../ui/app-button';

// Event detail types
interface EditEventDetail { tag: Tag; }
interface DeleteEventDetail { tagId: number; }

export class TagList extends BaseComponent {
    private _tags: Tag[] = [];

    set tags(value: Tag[]) {
        this._tags = value;
        this.renderTable();
    }
    get tags(): Tag[] { return this._tags; }

    constructor() {
        super();
        this.handleTableClick = this.handleTableClick.bind(this);
    }


    protected get styles(): string {
        return `
            :host { display: block; }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; table-layout: fixed; }
            th.col-name { width: 35%; }
            th.col-desc { width: auto; }
            th.col-actions { width: 100px; }

            th, td { padding: var(--spacing-2) var(--spacing-3); text-align: left; border-bottom: 1px solid var(--color-border); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
            th { font-weight: 500; color: var(--color-muted-foreground); background-color: var(--color-muted); }
            th.actions-header { text-align: center; }
            tr:last-child td { border-bottom: none; }
            tr:hover { background-color: var(--color-muted); }
            td.actions {
                 text-align: right;
                 white-space: nowrap;
                 padding-right: var(--spacing-2);
                 display: flex;
                 justify-content: flex-end;
                 align-items: center;
                 gap: var(--spacing-1);
            }
            td.name-cell { font-weight: 500; }
            td.description-cell { color: var(--color-muted-foreground); }
            app-button { vertical-align: middle; }
            .no-tags { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             em { font-style: italic; color: var(--color-muted-foreground); }
             .action-placeholder { display: inline-block; width: 2.25rem; height: 2.25rem; vertical-align: middle; }
             td.actions app-button svg { width: 1rem; height: 1rem; }
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
        super.disconnectedCallback(); // Base removes listeners
    }

    addEventListeners(): void {
        this.shadow.addEventListener('click', this.handleTableClick as EventListener);
    }

    removeEventListeners(): void {
        this.shadow.removeEventListener('click', this.handleTableClick as EventListener);
    }

    private handleTableClick = (event: MouseEvent): void => {
        const target = event.target as HTMLElement;
        const button = target.closest<AppButton>('app-button[data-action]');
        if (!button) return;

        const action = button.dataset.action;
        const tagId = parseInt(button.dataset.tagId || '', 10);
        if (isNaN(tagId)) return;

        if (action === 'edit') {
             const tag = this._tags.find(t => t.tagId === tagId);
             if (tag) {
                 this.dispatchEvent(new CustomEvent<EditEventDetail>('edit', { detail: { tag }, bubbles: true, composed: true }));
             }
        } else if (action === 'delete') {
             this.dispatchEvent(new CustomEvent<DeleteEventDetail>('delete', { detail: { tagId }, bubbles: true, composed: true }));
        }
    }

    private renderTable(): void {
        if (!this.isConnected) return;
        const container = this.shadow.querySelector('.table-container');
        if (!container) return;

        if (this._tags.length === 0) {
            container.innerHTML = `<div class="no-tags">No tags defined.</div>`;
            return;
        }

        const canModify = this.auth.isAdmin;

        const tableRows = this._tags.map(tag => {
            const escapedName = escapeHtml(tag.name);
            const escapedDescription = escapeHtml(tag.description || '');
            return `
                <tr data-id="${tag.tagId}">
                    <td class="name-cell">${escapedName}</td>
                    <td class="description-cell" title="${escapedDescription}">${escapedDescription || '<em>None</em>'}</td>
                    <td class="actions">
                         ${canModify ? `
                            <app-button variant="ghost" size="icon" data-action="edit" data-tag-id="${tag.tagId}" title="Edit Tag" icon="edit"></app-button>
                            <app-button variant="ghost" size="icon" data-action="delete" data-tag-id="${tag.tagId}" title="Delete Tag" icon="trash2"></app-button>
                         ` : '<span class="action-placeholder"></span><span class="action-placeholder"></span>'}
                     </td>
                </tr>
            `;
        }).join('');

        container.innerHTML = `
            <table>
                 <colgroup>
                     <col class="col-name">
                     <col class="col-desc">
                     <col class="col-actions">
                 </colgroup>
                <thead>
                    <tr>
                        <th class="col-name">Name</th>
                        <th class="col-desc">Description</th>
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
if (!customElements.get('tag-list')) {
    customElements.define('tag-list', TagList);
}