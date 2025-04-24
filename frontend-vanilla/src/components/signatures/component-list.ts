import { BaseComponent } from '../base-component';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { icons } from '../../lib/icons';
import { escapeHtml } from '../../lib/utils'; // Import escapeHtml
// Import components and types
import '../ui/app-button';
import '../ui/app-badge';
// Import types explicitly
import type { AppButton } from '../ui/app-button';

// Event detail types
interface EditEventDetail { component: SignatureComponent; }
interface DeleteEventDetail { componentId: number; }
interface OpenComponentEventDetail { component: SignatureComponent; }
interface ReindexEventDetail { componentId: number; }

export class ComponentList extends BaseComponent {
    private _components: SignatureComponent[] = [];

    set components(value: SignatureComponent[]) {
        this._components = value;
        this.renderTable();
    }
    get components(): SignatureComponent[] { return this._components; }

    constructor() {
        super();
        this.handleTableClick = this.handleTableClick.bind(this);
    }

    protected get styles(): string {
        return `
            :host { display: block; }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; table-layout: fixed; }
            col.col-name { width: 30%; }
            col.col-desc { width: auto; }
            col.col-index { width: 180px; }
            col.col-count { width: 100px; }
            col.col-actions { width: 150px; }

            th, td { padding: var(--spacing-2) var(--spacing-3); text-align: left; border-bottom: 1px solid var(--color-border); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
            th { font-weight: 500; color: var(--color-muted-foreground); background-color: var(--color-muted); }
            th.actions-header { text-align: center; }
            tr:last-child td { border-bottom: none; }
            tr { cursor: pointer; transition: background-color 150ms; }
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
            td.name-cell { font-weight: 500; display: flex; align-items: center; gap: var(--spacing-2); }
            td.name-cell svg { width: 1rem; height: 1rem; color: var(--color-muted-foreground); flex-shrink: 0;}
            td.description-cell { color: var(--color-muted-foreground); }
            td.count-cell { text-align: center; }
            app-button { vertical-align: middle; }
            .no-components { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
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

    private handleTableClick(event: MouseEvent) {
        const target = event.target as HTMLElement;
        const button = target.closest<AppButton>('app-button[data-action]');
        const row = target.closest<HTMLTableRowElement>('tr[data-id]');
        if (!row) return;

        const componentId = parseInt(row.dataset.id || '', 10);
        if (isNaN(componentId)) return;

        const component = this._components.find(c => c.signatureComponentId === componentId);
        if (!component) return;

        if (button) { // Click was on an action button
            event.stopPropagation();
            const action = button.dataset.action;
            if (action === 'edit') {
                 this.dispatchEvent(new CustomEvent<EditEventDetail>('edit', { detail: { component }, bubbles: true, composed: true }));
            } else if (action === 'delete') {
                 this.dispatchEvent(new CustomEvent<DeleteEventDetail>('delete', { detail: { componentId }, bubbles: true, composed: true }));
            } else if (action === 'reindex') {
                 this.dispatchEvent(new CustomEvent<ReindexEventDetail>('reindex', { detail: { componentId }, bubbles: true, composed: true }));
            }
        } else { // Click was on the row itself
            const nameCell = target.closest('td.name-cell');
             if (nameCell) {
                this.dispatchEvent(new CustomEvent<OpenComponentEventDetail>('open-component', { detail: { component }, bubbles: true, composed: true }));
             }
        }
    }

     private renderTable(): void {
        if (!this.isConnected) return;
        const container = this.shadow.querySelector('.table-container');
        if (!container) return;

        if (this._components.length === 0) {
            container.innerHTML = `<div class="no-components">No components created yet.</div>`;
            return;
        }

        const canModify = this.auth.isAdmin;
        const indexTypeLabels: Record<string, string> = {
             dec: 'Decimal (1, 2)',
             roman: 'Roman (I, II)',
             small_char: 'Letters (a, b)',
             capital_char: 'Capital Letters (A, B)'
         };
        const folderIcon = typeof icons.folderOpen === 'function' ? icons.folderOpen() : icons.folderOpen ?? '';


        const tableRows = this._components.map(component => {
             const escapedName = escapeHtml(component.name);
             const escapedDescription = escapeHtml(component.description || '');
             return `
                 <tr data-id="${component.signatureComponentId}">
                     <td class="name-cell" title="Click to view elements in ${escapedName}">${folderIcon} ${escapedName}</td>
                     <td class="description-cell" title="${escapedDescription}">${escapedDescription || '<em>None</em>'}</td>
                     <td class="index-type-cell"><app-badge variant="outline">${indexTypeLabels[component.index_type] || component.index_type}</app-badge></td>
                     <td class="count-cell">${component.index_count ?? 0}</td>
                     <td class="actions">
                         ${canModify ? `
                             <app-button variant="ghost" size="icon" data-action="reindex" data-component-id="${component.signatureComponentId}" title="Re-index Elements" icon="listRestart"></app-button>
                             <app-button variant="ghost" size="icon" data-action="edit" data-component-id="${component.signatureComponentId}" title="Edit Component" icon="edit"></app-button>
                             <app-button variant="ghost" size="icon" data-action="delete" data-component-id="${component.signatureComponentId}" title="Delete Component" icon="trash2"></app-button>
                         ` : `<span class="action-placeholder"></span><span class="action-placeholder"></span><span class="action-placeholder"></span>`}
                     </td>
                 </tr>
             `;
        }).join('');

        container.innerHTML = `
            <table>
                 <colgroup>
                     <col class="col-name">
                     <col class="col-desc">
                     <col class="col-index">
                     <col class="col-count">
                     <col class="col-actions">
                 </colgroup>
                <thead>
                    <tr>
                        <th class="col-name">Name</th>
                        <th class="col-desc">Description</th>
                        <th class="col-index">Index Type</th>
                        <th class="col-count">Elements</th>
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
if (!customElements.get('component-list')) {
    customElements.define('component-list', ComponentList);
}