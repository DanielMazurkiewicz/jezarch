import { BaseComponent } from '../base-component';
import type { SignatureElementSearchResult } from '../../../../backend/src/functionalities/signature/element/models';
import { icons } from '../../lib/icons';
// Import components and types
import '../ui/app-button';
import '../ui/app-badge';
// Import types explicitly
import type { AppButton } from '../ui/app-button';

// Event detail types
interface EditEventDetail { element: SignatureElementSearchResult; }
interface DeleteEventDetail { elementId: number; }

export class ElementList extends BaseComponent {
    private _elements: SignatureElementSearchResult[] = [];

    set elements(value: SignatureElementSearchResult[]) {
        this._elements = value;
        this.renderTable();
    }
    get elements(): SignatureElementSearchResult[] {
        return this._elements;
    }

    constructor() {
        super();
        this.handleTableClick = this.handleTableClick.bind(this);
    }

    protected get styles(): string {
        return `
            :host { display: block; }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
            th, td { padding: var(--spacing-2) var(--spacing-3); text-align: left; border-bottom: 1px solid var(--color-border); vertical-align: middle; }
            th { font-weight: 500; color: var(--color-muted-foreground); background-color: var(--color-muted); }
            th.actions-header { text-align: center; }
            tr:last-child td { border-bottom: none; }
            tr:hover { background-color: var(--color-muted); }
            td.actions {
                 text-align: right;
                 white-space: nowrap;
                 padding-right: var(--spacing-2);
                 width: 100px;
                 display: flex;
                 justify-content: flex-end;
                 align-items: center;
                 gap: var(--spacing-1);
            }
            td.index-cell { font-family: var(--font-mono); text-align: center; width: 80px; }
            td.name-cell { font-weight: 500; }
            td.description-cell { color: var(--color-muted-foreground); max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            app-button { vertical-align: middle; }
            .no-elements { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
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
        if (!button) return;

        const action = button.dataset.action;
        const elementId = parseInt(button.dataset.elementId || '', 10);
        if (isNaN(elementId)) return;

        if (action === 'edit') {
             const element = this._elements.find(el => el.signatureElementId === elementId);
             if (element) {
                 this.dispatchEvent(new CustomEvent<EditEventDetail>('edit', { detail: { element }, bubbles: true, composed: true }));
             }
        } else if (action === 'delete') {
             this.dispatchEvent(new CustomEvent<DeleteEventDetail>('delete', { detail: { elementId }, bubbles: true, composed: true }));
        }
    }

    private renderTable(): void {
        if (!this.isConnected) return;

        const container = this.shadow.querySelector('.table-container');
        if (!container) return;

        if (this._elements.length === 0) {
            container.innerHTML = `<div class="no-elements">No elements found.</div>`;
            return;
        }

        const canModify = this.auth.isAdmin; // Assume only admin can modify for now

        const tableRows = this._elements.map(element => `
            <tr data-id="${element.signatureElementId}">
                <td class="index-cell">${element.index || '<em>Auto</em>'}</td>
                <td class="name-cell">${element.name}</td>
                <td class="description-cell" title="${element.description || ''}">${element.description || '<em>None</em>'}</td>
                ${canModify ? `
                    <td class="actions">
                        <app-button variant="ghost" size="icon" data-action="edit" data-element-id="${element.signatureElementId}" title="Edit Element" icon="edit"></app-button>
                        <app-button variant="ghost" size="icon" data-action="delete" data-element-id="${element.signatureElementId}" title="Delete Element" icon="trash2"></app-button>
                    </td>
                ` : '<td class="actions"><span class="action-placeholder"></span><span class="action-placeholder"></span></td>'}
            </tr>
        `).join('');

        container.innerHTML = `
            <table>
                 <colgroup>
                     <col class="col-index" style="width: 80px;">
                     <col class="col-name" style="width: auto;">
                     <col class="col-desc" style="width: 40%;">
                     ${canModify ? `<col class="col-actions" style="width: 100px;">` : ''}
                 </colgroup>
                <thead>
                    <tr>
                        <th class="index-cell">Index</th>
                        <th>Name</th>
                        <th>Description</th>
                        ${canModify ? `<th class="actions-header">Actions</th>` : ''}
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
if (!customElements.get('element-list')) {
    customElements.define('element-list', ElementList);
}