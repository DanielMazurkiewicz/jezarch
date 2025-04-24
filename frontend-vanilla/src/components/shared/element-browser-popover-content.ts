import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import api from '../../lib/api';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, CreateSignatureElementInput } from '../../../../backend/src/functionalities/signature/element/models';
import type { SearchRequest } from '../../../../backend/src/utils/search';
import { debounce } from '../../lib/utils';
import { showToast } from '../ui/toast-handler';
// Import specific component types needed
import type { AppSelect } from '../ui/app-select';
import type { AppCommand, AppCommandItem, AppCommandGroup } from '../ui/app-command';
import type { AppBadge } from '../ui/app-badge';
import type { AppButton } from '../ui/app-button';
import type { AppLabel } from '../ui/app-label';
import type { AppToggleGroup } from '../ui/app-toggle-group';
import type { AppDialog } from '../ui/app-dialog';
import type { ElementForm } from '../signatures/element-form';
// Import definitions to ensure they are loaded
import '../ui/app-select';
import '../ui/app-command';
import '../ui/app-badge';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/app-toggle-group';
import '../ui/app-dialog';
import '../signatures/element-form'; // Import element form

type SelectionMode = "free" | "hierarchical";
const MAX_SEARCH_RESULTS = 200;
const DEBOUNCE_DELAY = 300; // ms

// Helper to compare elements for sorting
const compareElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name ?? '';
    const valB = b.index ?? b.name ?? '';
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return String(valA).localeCompare(String(valB));
};

export class ElementBrowserPopoverContent extends BaseComponent {

    // --- State & Properties ---
    private components: SignatureComponent[] = [];
    private elements: SignatureElement[] = [];
    private currentSignatureElements: SignatureElement[] = [];
    private selectedComponentId: string = '';
    private mode: SelectionMode = "hierarchical";
    private searchTerm: string = '';
    private debouncedSearchHandler: (term: string) => void;
    private isLoadingComponents: boolean = false;
    private isLoadingElements: boolean = false;
    private error: string | null = null;
    private componentForCreate: SignatureComponent | null = null;
    // Store reference to dynamically created dialog
    private activeCreateDialog: AppDialog | null = null;


    // --- Custom Events ---
    static readonly E_SELECT_SIGNATURE = 'select-signature';
    static readonly E_CLOSE = 'close-browser';


    constructor() {
        super();
        this.debouncedSearchHandler = debounce(this.fetchElements, DEBOUNCE_DELAY);
        // Bind methods
        this.handleModeChange = this.handleModeChange.bind(this);
        this.handleComponentChange = this.handleComponentChange.bind(this);
        this.handleSearchInput = this.handleSearchInput.bind(this);
        this.handleElementSelect = this.handleElementSelect.bind(this);
        this.handleOpenCreateElementDialog = this.handleOpenCreateElementDialog.bind(this);
        this.handleRemoveLastElement = this.handleRemoveLastElement.bind(this);
        this.handleConfirmSignature = this.handleConfirmSignature.bind(this);
        this.handleCancel = this.handleCancel.bind(this);
        this.handleElementCreated = this.handleElementCreated.bind(this); // Bind handler for save event
    }

    protected get styles(): string {
        // Styles remain the same
        return `
            :host { display: block; width: 100%; }
            .container { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); width: 100%; }
            .current-signature { display: flex; flex-wrap: wrap; align-items: center; gap: var(--spacing-1); border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--spacing-2); background-color: var(--color-muted); min-height: 40px; }
            .current-signature app-label { margin-right: var(--spacing-2); font-size: 0.75rem; font-weight: 600; flex-shrink: 0; }
            .current-signature .placeholder { font-size: 0.75rem; font-style: italic; color: var(--color-muted-foreground); }
            app-badge { font-family: var(--font-mono); font-size: 0.75rem; }
            .controls { display: flex; flex-direction: column; gap: var(--spacing-2); }
            app-command { border-radius: var(--radius); border: 1px solid var(--color-border); box-shadow: var(--shadow-sm); }
             app-command input { height: 2rem; font-size: 0.8rem; }
             app-command .list-wrapper { max-height: 200px; }
             app-command app-command-item { display: flex !important; justify-content: space-between; align-items: center; font-size: 0.8rem; padding: var(--spacing-1) var(--spacing-2); }
             app-command app-command-item .item-content { display: flex; align-items: center; gap: 0.5rem; overflow: hidden; }
             app-command app-command-item .item-index { font-family: var(--font-mono); font-size: 0.75rem; width: 2.5rem; text-align: right; display: inline-block; color: var(--color-muted-foreground); flex-shrink: 0; }
             app-command app-command-item .item-name { flex-grow: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
             app-command app-command-item .add-icon { color: var(--color-muted-foreground); opacity: 0.7; flex-shrink: 0; }
             app-toggle-group { width: 100%; }
             app-toggle-group-item { flex: 1; font-size: 0.8rem; height: 2rem; }
             app-toggle-group-item svg { width: 1rem; height: 1rem; margin-right: var(--spacing-1); }
            .actions { display: flex; justify-content: space-between; align-items: center; margin-top: var(--spacing-3); padding-top: var(--spacing-3); border-top: 1px solid var(--color-border); }
            .actions-left { display: flex; gap: var(--spacing-2); }
            .create-button-area { padding: var(--spacing-2); border-top: 1px solid var(--color-border); }
            .create-button-area app-button { width: 100%; justify-content: flex-start; color: var(--color-muted-foreground);}
            .create-button-area app-button svg { margin-right: var(--spacing-1); }
        `;
    }

    protected get template(): string {
        // *** ENSURED static dialog is REMOVED ***
         const selectedComponentName = this.components.find(c => String(c.signatureComponentId) === this.selectedComponentId)?.name;
         const canTriggerCreateElement = !!this.selectedComponentId && !this.isLoadingComponents &&
                                     (this.mode === 'free' || this.currentSignatureElements.length === 0);
         const networkIcon = typeof icons.network === 'function' ? icons.network() : icons.network ?? '';
         const arrowRightIcon = typeof icons.arrowRight === 'function' ? icons.arrowRight() : icons.arrowRight ?? '';
         const plusCircleIcon = typeof icons.plusCircle === 'function' ? icons.plusCircle() : icons.plusCircle ?? '';
         const xIcon = typeof icons.x === 'function' ? icons.x() : icons.x ?? '';
         const banIcon = typeof icons.ban === 'function' ? icons.ban() : icons.ban ?? '';
         const plusIcon = typeof icons.plus === 'function' ? icons.plus() : icons.plus ?? '';
        return `
            <div class="container">
                <!-- Mode Selector -->
                <div class="controls">
                    <app-label class="text-xs font-medium">Selection Mode</app-label>
                    <app-toggle-group type="single" value="${this.mode}" id="mode-toggle">
                        <app-toggle-group-item value="hierarchical" aria-label="Hierarchical"> ${networkIcon} Hierarchical</app-toggle-group-item>
                        <app-toggle-group-item value="free" aria-label="Free"> ${arrowRightIcon} Free</app-toggle-group-item>
                    </app-toggle-group>
                    <p class='text-xs text-muted px-1'>${this.mode === 'hierarchical' ? 'Select elements based on parent-child relationships.' : 'Select any element from the chosen component.'}</p>
                </div>
                 <!-- Current Signature Display -->
                <div class="current-signature">
                     <app-label>Current Signature:</app-label>
                     ${this.currentSignatureElements.length === 0
                         ? `<span class="placeholder">Build signature below...</span>`
                         : this.currentSignatureElements.map((el, index) => `${index > 0 ? `<span class="text-xs text-muted">/</span>` : ''}<app-badge variant="secondary">${el.index ? `[${el.index}] ` : ''}${el.name}</app-badge>`).join('')
                     }
                </div>
                 <!-- Component Selector -->
                ${(this.currentSignatureElements.length === 0 || this.mode === 'free') ? `<div class="controls"><app-label class="text-xs font-medium" for="component-select">${this.getNextStepPrompt()}</app-label><app-select id="component-select" placeholder="Select Component..." ${this.isLoadingComponents || (this.mode === 'hierarchical' && this.currentSignatureElements.length > 0) ? 'disabled' : ''}></app-select></div>` : ''}
                <!-- Element Selector/Search -->
                 ${((this.mode === 'hierarchical' && (this.currentSignatureElements.length > 0 || this.selectedComponentId)) || (this.mode === 'free' && this.selectedComponentId)) ? `<div class="controls"><app-label class="text-xs font-medium">${this.getElementSelectorLabel(selectedComponentName)}</app-label><app-command id="element-command" placeholder="Search available elements..." ${this.isLoadingElements ? 'loading' : ''}><div slot="list"></div><div slot="empty">No elements found.</div><div slot="loading"><loading-spinner size="sm"></loading-spinner> Loading elements...</div>${canTriggerCreateElement ? `<div slot="footer" class="create-button-area"><app-button type="button" variant="outline" size="sm" id="create-element-button">${plusCircleIcon} Create New Element in "${selectedComponentName}"...</app-button></div>` : ''}</app-command></div>` : ''}
                 <!-- Action Buttons -->
                <div class="actions">
                     <div class="actions-left">
                        <app-button variant="outline" size="sm" id="remove-last-button" ${this.currentSignatureElements.length === 0 ? 'disabled' : ''}>${xIcon} Remove Last</app-button>
                        <app-button variant="ghost" size="sm" id="cancel-button"> ${banIcon} Cancel</app-button>
                    </div>
                     <app-button variant="default" size="sm" id="confirm-button" ${this.currentSignatureElements.length === 0 ? 'disabled' : ''}>Add This Signature</app-button>
                 </div>
             </div>
             <!-- No static dialog here -->
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.fetchComponents();
        this.updateComponentSelect();
        this.updateElementCommand();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback();
        this.activeCreateDialog?.remove();
    }

    addEventListeners() {
         this.qsOptional<AppToggleGroup>('#mode-toggle')?.addEventListener('change', this.handleModeChange);
         this.qsOptional<AppSelect>('#component-select')?.addEventListener('change', this.handleComponentChange);
         this.qsOptional<AppCommand>('#element-command')?.addEventListener('input', this.handleSearchInput);
         this.qsOptional<AppCommand>('#element-command')?.addEventListener('select', this.handleElementSelect);
         this.qsOptional<AppButton>('#create-element-button')?.addEventListener('click', this.handleOpenCreateElementDialog);
         this.qsOptional<AppButton>('#remove-last-button')?.addEventListener('click', this.handleRemoveLastElement);
         this.qsOptional<AppButton>('#confirm-button')?.addEventListener('click', this.handleConfirmSignature);
         this.qsOptional<AppButton>('#cancel-button')?.addEventListener('click', this.handleCancel);
         // *** No listeners for static dialog ***
    }

    removeEventListeners() {
          this.qsOptional<AppToggleGroup>('#mode-toggle')?.removeEventListener('change', this.handleModeChange);
          this.qsOptional<AppSelect>('#component-select')?.removeEventListener('change', this.handleComponentChange);
          this.qsOptional<AppCommand>('#element-command')?.removeEventListener('input', this.handleSearchInput);
          this.qsOptional<AppCommand>('#element-command')?.removeEventListener('select', this.handleElementSelect);
          this.qsOptional<AppButton>('#create-element-button')?.removeEventListener('click', this.handleOpenCreateElementDialog);
          this.qsOptional<AppButton>('#remove-last-button')?.removeEventListener('click', this.handleRemoveLastElement);
          this.qsOptional<AppButton>('#confirm-button')?.removeEventListener('click', this.handleConfirmSignature);
          this.qsOptional<AppButton>('#cancel-button')?.removeEventListener('click', this.handleCancel);
         // *** No listeners for static dialog ***
    }

    private handleModeChange = (event: Event): void => { /* ... (implementation removed for brevity) ... */ }
    private handleComponentChange = (event: Event): void => { /* ... (implementation removed for brevity) ... */ }
    private handleSearchInput = (event: Event): void => { /* ... (implementation removed for brevity) ... */ }
    private handleElementSelect = (event: Event): void => { /* ... (implementation removed for brevity) ... */ }
    private handleRemoveLastElement = (): void => { /* ... (implementation removed for brevity) ... */ }
    private handleConfirmSignature = (): void => { /* ... (implementation removed for brevity) ... */ }
    private handleCancel = (): void => { /* ... (implementation removed for brevity) ... */ }

    // --- Dynamic Create Element Dialog Logic ---
    private handleOpenCreateElementDialog = (): void => {
         const component = this.components.find(c => String(c.signatureComponentId) === this.selectedComponentId);
         if (!component) { showToast("Select a component first.", "warning"); return; }
         this.activeCreateDialog?.remove(); // Clean up previous

         this.componentForCreate = component;

         // 1. Create Dialog
         const dialog = document.createElement('app-dialog') as AppDialog;
         dialog.innerHTML = `<h2 slot="header">Create New Element in "${component.name}"</h2>`;

         // 2. Create Form
         const form = document.createElement('element-form') as ElementForm;
         form.component = component;
         form.elementToEdit = null;

         // 3. Append Form to Dialog
         dialog.appendChild(form);

         // 4. Append Dialog to *this component's* shadow DOM
         this.shadowRoot?.appendChild(dialog);
         this.activeCreateDialog = dialog;

         // 5. Add Listeners
         const saveListener = (event: Event) => this.handleElementCreated(event);
         form.addEventListener('save', saveListener);

         dialog.addEventListener('close', () => {
            form.removeEventListener('save', saveListener);
            dialog.remove();
            this.activeCreateDialog = null;
            this.componentForCreate = null;
         }, { once: true });

         // 6. Show Dialog
         dialog.show();
         console.log("Create Element Dialog dynamically created and shown."); // Debug log
     };

     private handleElementCreated = (event?: Event): void => { // Make event optional
        this.activeCreateDialog?.hide(); // Ensure dialog closes
        const customEvent = event as CustomEvent;
        const createdElement = customEvent?.detail?.element as SignatureElement | null;

        if (createdElement) {
            showToast(`Element "${createdElement.name}" created successfully.`, "success");
            this.fetchElements(); // Refresh the element list in the popover
        } else {
             console.warn("Element creation reported failure or no change.");
        }
     };

    private async fetchComponents() { /* ... (implementation removed for brevity) ... */ }
    private async fetchElements() { /* ... (implementation removed for brevity) ... */ }
    private updateComponentSelect() { /* ... (implementation removed for brevity) ... */ }
    private updateElementCommand() { /* ... (implementation removed for brevity) ... */ }
    render() { /* ... (implementation removed for brevity) ... */ }

    // Added return statements to satisfy TS2355
    private getNextStepPrompt(): string { return ''; /* ... (implementation removed for brevity) ... */ }
    private getElementSelectorLabel(componentName?: string): string { return ''; /* ... (implementation removed for brevity) ... */ }
    private resetState() { /* ... (implementation removed for brevity) ... */ }
}

// Define the component unless already defined
if (!customElements.get('element-browser-popover-content')) {
    customElements.define('element-browser-popover-content', ElementBrowserPopoverContent);
}