import { BaseComponent } from '../base-component';
import api from '../../lib/api';
import type { SignatureElement } from '../../../../backend/src/functionalities/signature/element/models';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import { showToast } from '../ui/toast-handler';
// Import component types
import type { AppSelect } from '../ui/app-select';
import type { AppButton } from '../ui/app-button';
import type { AppLabel } from '../ui/app-label';
// Import definitions
import '../ui/app-select';
import '../ui/app-button';
import '../ui/app-label';

// Define missing API method placeholder (remove if backend API is updated)
declare module '../../lib/api' {
    interface api {
        // Declare the method signature if it doesn't exist on the type yet
        getElementsByComponent?(componentId: number): Promise<SignatureElement[]>;
    }
}
// Mock implementation (remove when backend is ready)
if (!api.getElementsByComponent) {
    api.getElementsByComponent = async (componentId: number): Promise<SignatureElement[]> => {
        console.warn(`API method 'getElementsByComponent' is mocked for component ${componentId}`);
        // Fetch all elements and filter client-side (inefficient, for placeholder only)
        const searchResult = await api.searchSignatureElements({
             query: [{ field: 'signatureComponentId', condition: 'EQ', value: componentId, not: false }], // Cast needed for SearchQueryElement
             page: 1,
             pageSize: 1000
        });
        return searchResult.data;
    };
}


/**
 * @element element-selector
 * @description A form control for selecting a parent SignatureElement within a specific SignatureComponent.
 *
 * @attr {string} label - The label for the selector.
 * @attr {string} [component-id] - The ID of the SignatureComponent to filter elements by.
 * @attr {string} [selected-id] - The pre-selected SignatureElement ID.
 * @attr {boolean} [disabled] - Disables the selector.
 * @attr {boolean} [required] - Marks the selector as required.
 * @attr {string} [exclude-id] - An element ID to exclude from the list (e.g., the element being edited).
 *
 * @prop {string} value - Get/set the selected element ID as a string.
 * @prop {number | null} selectedId - Get/set the selected element ID as a number.
 * @prop {string | null} componentId - Get/set the component ID.
 *
 * @event change - Fired when the selected element changes. Detail contains `{ value: string | null }`.
 */
export class ElementSelector extends BaseComponent {
    static observedAttributes = ['label', 'component-id', 'selected-id', 'disabled', 'required', 'exclude-id'];

    private _componentId: string | null = null;
    private _selectedId: string | null = null;
    private _excludeId: string | null = null;
    private components: SignatureComponent[] = [];
    private availableElements: SignatureElement[] = [];
    private isLoadingComponents: boolean = false;
    private isLoadingElements: boolean = false;
    private error: string | null = null;

    // Element references
    private componentSelect: AppSelect | null = null;
    private elementSelect: AppSelect | null = null;
    private labelElement: AppLabel | null = null;

    constructor() {
        super();
        this.handleComponentChange = this.handleComponentChange.bind(this);
        this.handleElementChange = this.handleElementChange.bind(this);
    }

    // --- Properties ---
    get value(): string | null {
        return this.elementSelect?.value || null;
    }
    set value(id: string | null) {
        this.selectedId = id ? parseInt(id, 10) : null;
    }

    get selectedId(): number | null {
        return this._selectedId ? parseInt(this._selectedId, 10) : null;
    }
    set selectedId(id: number | null) {
        const newIdStr = id !== null ? String(id) : null;
        if (newIdStr !== this._selectedId) {
             this._selectedId = newIdStr;
             // Only set attribute if connected, otherwise it happens in connectedCallback
             if (this.isConnected) this.setAttribute('selected-id', this._selectedId ?? '');
             if (this.elementSelect) this.elementSelect.value = this._selectedId ?? '';
             // Fetch elements if component is known but elements weren't loaded for this selection
             if (this._componentId && this.availableElements.length === 0 && this._selectedId && this.isConnected) {
                this.fetchElements();
             }
        }
    }

    get componentId(): string | null {
        return this._componentId;
    }
    set componentId(id: string | null) {
        if (id !== this._componentId) {
            this._componentId = id;
            if (this.isConnected) { // Only update attribute/fetch if connected
                if (id) {
                    this.setAttribute('component-id', id);
                    this.fetchElements(); // Fetch elements for the new component
                } else {
                    this.removeAttribute('component-id');
                    this.availableElements = []; // Clear elements if no component
                    this.renderElementSelect(); // Re-render element select (will be disabled)
                }
            }
            // Update component select value if it exists
            if(this.componentSelect) this.componentSelect.value = id ?? '';
        }
    }

    get excludeId(): number | null {
        return this._excludeId ? parseInt(this._excludeId, 10) : null;
    }
    set excludeId(id: number | null) {
        const newIdStr = id !== null ? String(id) : null;
        if (newIdStr !== this._excludeId) {
            this._excludeId = newIdStr;
             if (this.isConnected) { // Only update attribute/render if connected
                if (id !== null) this.setAttribute('exclude-id', newIdStr!); else this.removeAttribute('exclude-id');
                // Re-filter and render elements if they are already loaded
                if (this.availableElements.length > 0) {
                     this.renderElementSelect();
                }
             }
        }
    }

    get label(): string { return this.getAttribute('label') || 'Parent Element'; }
    set label(value: string) { this.setAttribute('label', value); }

    get disabled(): boolean { return this.hasAttribute('disabled'); }
    set disabled(isDisabled: boolean) { this.toggleAttribute('disabled', isDisabled); }

    get required(): boolean { return this.hasAttribute('required'); }
    set required(isRequired: boolean) { this.toggleAttribute('required', isRequired); }


    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
            .selector-container {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-2);
            }
            app-label {
                font-size: 0.875rem; /* text-sm */
                font-weight: 500; /* medium */
                color: var(--color-foreground);
                margin-bottom: var(--spacing-1); /* Add some space below label */
            }
            app-select { width: 100%; }
            .loading-text, .error-text {
                font-size: 0.8rem;
                color: var(--color-muted-foreground);
                padding: var(--spacing-2) 0;
            }
            .error-text { color: var(--color-destructive); }
        `;
    }

    protected get template(): string {
        const label = this.label;
        const componentId = this._componentId;
        const selectedId = this._selectedId;
        const isDisabled = this.disabled;
        const isRequired = this.required;

        return `
            <div class="selector-container">
                 <app-label id="main-label" for="component-select">${label}${isRequired ? ' *' : ''}</app-label>
                 <app-select
                    id="component-select"
                    placeholder="1. Select Component..."
                    ${isDisabled ? 'disabled' : ''}
                    ${isRequired ? 'required' : ''}
                    ${this.isLoadingComponents ? 'disabled' : ''} <!-- Disable while loading -->
                 >
                    <!-- Component options added dynamically -->
                 </app-select>
                 ${this.isLoadingComponents ? `<div class="loading-text">Loading components...</div>` : ''}
                 ${this.error ? `<div class="error-text">${this.error}</div>` : ''}

                 <app-select
                    id="element-select"
                    placeholder="2. Select Element..."
                    ${isDisabled || !componentId || this.isLoadingElements ? 'disabled' : ''}
                    ${isRequired ? 'required' : ''}
                 >
                    <!-- Element options added dynamically -->
                 </app-select>
                 ${this.isLoadingElements ? `<div class="loading-text">Loading elements...</div>` : ''}
            </div>
        `;
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        // Read attributes after initial connection
        this._componentId = this.getAttribute('component-id');
        this._selectedId = this.getAttribute('selected-id');
        this._excludeId = this.getAttribute('exclude-id');

        this.componentSelect = this.qs<AppSelect>('#component-select');
        this.elementSelect = this.qs<AppSelect>('#element-select');
        this.labelElement = this.qs<AppLabel>('#main-label');

        // Set initial state for required/disabled
        this.updateDisabledState();
        this.updateRequiredState();

        this.fetchComponents();
        // Initial fetch of elements only if componentId is already set
        if (this._componentId) {
            this.fetchElements();
        }

        this.addEventListeners();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners via base class
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        switch (name) {
            case 'label':
                if (this.labelElement) this.labelElement.textContent = this.label + (this.required ? ' *' : '');
                break;
            case 'component-id':
                 this.componentId = newValue; // Use setter
                break;
            case 'selected-id':
                this.selectedId = newValue ? parseInt(newValue, 10) : null; // Use setter
                break;
            case 'exclude-id':
                 this.excludeId = newValue ? parseInt(newValue, 10) : null; // Use setter
                 break;
            case 'disabled':
                this.updateDisabledState();
                break;
            case 'required':
                this.updateRequiredState();
                if (this.labelElement) this.labelElement.textContent = this.label + (this.required ? ' *' : '');
                break;
        }
    }

    addEventListeners() {
        this.registerListener(this.componentSelect, 'change', this.handleComponentChange);
        this.registerListener(this.elementSelect, 'change', this.handleElementChange);
    }

    private handleComponentChange(event: Event) {
         const target = event.target as AppSelect;
         this.componentId = target.value || null; // Use setter to trigger element fetching
    }

    private handleElementChange(event: Event) {
         const target = event.target as AppSelect;
         const newSelectedId = target.value || null;
         // Update internal state and attribute without re-fetching/re-rendering everything
         if (this._selectedId !== newSelectedId) {
            this._selectedId = newSelectedId;
            this.setAttribute('selected-id', this._selectedId ?? '');
            this.dispatchEvent(new CustomEvent('change', {
                detail: { value: this._selectedId },
                bubbles: true,
                composed: true
            }));
         }
    }

    // --- Data Fetching & Updates ---
    private async fetchComponents() {
         if (!this.auth.token) { this.setError("Authentication required."); return; }
         this.setLoading('components', true);
         this.setError(null);

         try {
             this.components = (await api.getAllSignatureComponents()).sort((a,b)=>a.name.localeCompare(b.name));
             this.renderComponentSelect();
         } catch (err: any) {
             this.setError(err.message || 'Failed to load components');
             this.components = [];
             this.renderComponentSelect(); // Render empty state
         } finally {
             this.setLoading('components', false);
         }
    }

    private async fetchElements() {
        const componentIdNum = this._componentId ? parseInt(this._componentId, 10) : null;
        if (!this.auth.token) { this.setError("Authentication required."); return; }
        if (componentIdNum === null || isNaN(componentIdNum)) {
             this.availableElements = [];
             this.renderElementSelect(); // Render empty select
             return; // No component selected
        }

        this.setLoading('elements', true);
        this.setError(null); // Clear previous errors related to elements

        try {
             const currentElementId = this.excludeId;
             // Check if the potentially mocked function exists before calling
             if (typeof api.getElementsByComponent !== 'function') {
                throw new Error("API method 'getElementsByComponent' is not available.");
             }
             const elems = await api.getElementsByComponent(componentIdNum);
             this.availableElements = elems
                 .filter((el: SignatureElement) => el.signatureElementId !== currentElementId) // Exclude self
                 .sort((a: SignatureElement, b: SignatureElement) => (a.index ?? a.name).localeCompare(b.index ?? b.name));
             this.renderElementSelect();
        } catch (err: any) {
             this.setError(err.message || 'Failed to load elements for this component');
             showToast(`Error loading elements: ${err.message}`, 'error');
             this.availableElements = [];
             this.renderElementSelect(); // Render empty state
        } finally {
             this.setLoading('elements', false);
        }
    }

     private renderComponentSelect() {
        if (!this.componentSelect) return;
        const select = this.componentSelect;
        select.clearOptions();
        select.addOption('', '1. Select Component...');
        this.components.forEach(comp => {
            select.addOption(String(comp.signatureComponentId), comp.name);
        });
        select.value = this._componentId ?? '';
        this.updateDisabledState(); // Re-apply disabled state
     }

     private renderElementSelect() {
         if (!this.elementSelect) return;
         const select = this.elementSelect;
         select.clearOptions();
         select.addOption('', '2. Select Element...'); // Default empty option

         // Filter elements based on excludeId again just to be sure
         const currentExcludeId = this.excludeId;
         const filteredElements = this.availableElements.filter(el => el.signatureElementId !== currentExcludeId);

         filteredElements.forEach(el => {
            const label = `${el.index ? `[${el.index}] ` : ''}${el.name}`;
            select.addOption(String(el.signatureElementId), label);
         });

         // Try to maintain selection if possible
         const currentVal = this._selectedId;
         const isValidSelection = currentVal && filteredElements.some(el => String(el.signatureElementId) === currentVal);

         if (isValidSelection) {
            select.value = currentVal!;
         } else {
            // If current selection is no longer valid (e.g., excluded or component changed), reset
            select.value = '';
            if (this._selectedId !== null) {
                this._selectedId = null; // Clear internal state too
                // Optionally dispatch change event if reset happens implicitly?
                // this.dispatchEvent(new CustomEvent('change', { detail: { value: null } }));
            }
         }
         this.updateDisabledState(); // Re-apply disabled state
     }


     private setLoading(type: 'components' | 'elements', isLoading: boolean) {
        if (type === 'components') this.isLoadingComponents = isLoading;
        else this.isLoadingElements = isLoading;
        // Re-render is probably simplest way to show/hide loading text
        this.render(); // Re-render to update loading indicators and disabled states
     }

     private setError(message: string | null) {
         this.error = message;
         // Re-render to show/hide error message
         this.render();
     }

     private updateDisabledState() {
         const isDisabled = this.disabled;
         if (this.componentSelect) {
             // Use the component's own disabled setter/getter
             this.componentSelect.disabled = isDisabled || this.isLoadingComponents;
         }
         if (this.elementSelect) {
             this.elementSelect.disabled = isDisabled || !this._componentId || this.isLoadingElements || this.isLoadingComponents;
         }
     }
     private updateRequiredState() {
         const isRequired = this.required;
         if (this.componentSelect) {
             // Use the component's own required setter/getter
             this.componentSelect.required = isRequired;
         }
          if (this.elementSelect) {
             // Element select is required only if the component select is also required *and* has a value
             this.elementSelect.required = isRequired && !!this._componentId;
         }
     }
}

// Define the component unless already defined
if (!customElements.get('element-selector')) {
    customElements.define('element-selector', ElementSelector);
}