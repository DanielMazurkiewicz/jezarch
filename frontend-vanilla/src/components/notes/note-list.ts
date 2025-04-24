import { BaseComponent } from '../base-component';
import type { NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
import { icons } from '../../lib/icons';
import { formatDate, escapeHtml } from '../../lib/utils'; // Import escapeHtml
// Import component definitions to ensure they are loaded
import '../ui/app-button';
import '../ui/app-badge';
// Import type if needed
import type { AppButton } from '../ui/app-button';


// Event detail types
interface EditEventDetail { note: NoteWithDetails; }
interface DeleteEventDetail { noteId: number; }
interface PreviewEventDetail { note: NoteWithDetails; }

export class NoteList extends BaseComponent {
    private _notes: NoteWithDetails[] = [];

    set notes(value: NoteWithDetails[]) {
        this._notes = value;
        this.renderTable();
    }
    get notes(): NoteWithDetails[] { return this._notes; }

    constructor() {
        super();
        this.handleTableClick = this.handleTableClick.bind(this);
    }

    protected get styles(): string {
         return `
            :host { display: block; }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow-x: auto; } /* Add overflow-x */
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; table-layout: fixed; } /* Revert to fixed layout */
            /* Define column widths */
            col.col-title { width: 30%; }
            col.col-author { width: 15%; }
            col.col-modified { width: 15%; }
            col.col-shared { width: 10%; }
            col.col-tags { width: 20%; }
            col.col-actions { width: 100px; min-width: 100px; } /* Fixed width for actions */

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

            td.title-cell { font-weight: 500; cursor: pointer; }
            td.title-cell:hover { color: var(--color-primary); text-decoration: underline; }
            td.author-cell { font-size: 0.8rem; color: var(--color-muted-foreground); display: inline-flex; align-items: center; gap: var(--spacing-1); }
            td.author-cell svg { width: 0.8rem; height: 0.8rem; flex-shrink: 0; vertical-align: middle; }
            td.author-cell.is-owner { color: var(--color-foreground); font-weight: 500; }
            td.author-cell.is-owner svg { color: var(--color-primary); }
            td.tags-cell .tags-wrapper { display: flex; flex-wrap: wrap; gap: var(--spacing-1); }
            app-button { vertical-align: middle; }
            .no-notes { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
            .text-xs { font-size: 0.75rem; }
            .italic { font-style: italic; }
            .text-muted { color: var(--color-muted-foreground); }
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
        super.disconnectedCallback(); // Base class removes listeners
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
        const noteId = parseInt(row?.dataset.id || '', 10);

        if (isNaN(noteId)) return;

        const note = this._notes.find(n => n.noteId === noteId);
        if (!note) return;

        if (button) {
            event.stopPropagation();
            const action = button.dataset.action;
            if (action === 'edit') {
                 this.dispatchEvent(new CustomEvent<EditEventDetail>('edit', { detail: { note }, bubbles: true, composed: true }));
            } else if (action === 'delete') {
                 this.dispatchEvent(new CustomEvent<DeleteEventDetail>('delete', { detail: { noteId }, bubbles: true, composed: true }));
            }
        } else if (titleCell) {
            this.dispatchEvent(new CustomEvent<PreviewEventDetail>('preview', { detail: { note }, bubbles: true, composed: true }));
        }
    }

    private renderTable(): void {
        if (!this.isConnected) return;
        const container = this.shadow.querySelector('.table-container');
        if (!container) return;

        if (this._notes.length === 0) {
            container.innerHTML = `<div class="no-notes">No notes found.</div>`;
            return;
        }

        const currentUserId = this.auth.user?.userId;
        const isAdmin = this.auth.isAdmin;
        const userIcon = typeof icons.user === 'function' ? icons.user() : (icons.user ?? `<svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/></svg>`);

        const tableRows = this._notes.map(note => {
            const isOwner = note.ownerUserId === currentUserId;
            const canEdit = isOwner || isAdmin;
            const canDelete = isOwner || isAdmin;
            const escapedTitle = escapeHtml(note.title);
            const escapedOwnerLogin = escapeHtml(note.ownerLogin || 'Unknown');

            const tagBadges = (note.tags || [])
                .slice(0, 3)
                .map(tag => `<app-badge variant="secondary">${escapeHtml(tag.name)}</app-badge>`)
                .join('');
            const moreTags = (note.tags?.length || 0) > 3 ? `<app-badge variant="outline">+${(note.tags?.length || 0) - 3} more</app-badge>` : '';
            const noTags = (!note.tags || note.tags.length === 0) ? `<span class="text-xs italic text-muted">No tags</span>` : '';

            const editButtonHtml = canEdit ? `
                <app-button variant="ghost" size="icon" data-action="edit" data-note-id="${note.noteId}" title="Edit Note" icon="edit"></app-button>
            ` : `<span class="action-placeholder"></span>`;

            const deleteButtonHtml = canDelete ? `
                <app-button variant="ghost" size="icon" data-action="delete" data-note-id="${note.noteId}" title="Delete Note" icon="trash2"></app-button>
            ` : `<span class="action-placeholder"></span>`;

            return `
                <tr data-id="${note.noteId}">
                    <td class="title-cell" title="Click to preview '${escapedTitle}'">${escapedTitle}</td>
                    <td>
                        <span class="author-cell ${isOwner ? 'is-owner' : ''}" title="${escapedOwnerLogin}">
                            ${userIcon}
                            <span>${escapedOwnerLogin}</span>
                        </span>
                    </td>
                    <td>${formatDate(note.modifiedOn)}</td>
                    <td>
                        ${note.shared
                            ? '<app-badge variant="outline">Shared</app-badge>'
                            : '<app-badge variant="secondary">Private</app-badge>'
                        }
                    </td>
                    <td class="tags-cell"><div class="tags-wrapper">${tagBadges}${moreTags}${noTags}</div></td>
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
                     <col class="col-title">
                     <col class="col-author">
                     <col class="col-modified">
                     <col class="col-shared">
                     <col class="col-tags">
                     <col class="col-actions">
                 </colgroup>
                <thead>
                    <tr>
                        <th>Title</th>
                        <th>Author</th>
                        <th>Modified</th>
                        <th>Sharing</th>
                        <th>Tags</th>
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
if (!customElements.get('note-list')) {
    customElements.define('note-list', NoteList);
}