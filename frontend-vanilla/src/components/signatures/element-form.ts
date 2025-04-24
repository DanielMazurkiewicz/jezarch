import { BaseComponent } from '../base-component';
import api from '../../lib/api';
import { showToast } from '../ui/toast-handler';
import type { SignatureComponent } from '../../../../backend/src/functionalities/signature/component/models';
import type { SignatureElement, CreateSignatureElementInput, UpdateSignatureElementInput } from '../../../../backend/src/functionalities/signature/element/models';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
// Import necessary components and types
import '../ui/app-input';
import '../ui/app-textarea';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/error-display';
import '../shared/parent-element-selector'; // Import parent selector definition

// Import types
import type { AppInput } from '../ui/app-input';
import type { AppTextarea } from '../ui/app-textarea';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';
import type { ParentElementSelector } from '../shared/parent-element-selector'; // Import type


export class ElementForm extends BaseComponent {

    // --- Properties ---
    component: SignatureComponent | null = null; // The component this element belongs to
    private _elementToEdit: SignatureElement | null = null; // Renamed internal property

    // --- State ---
    private _elementName: string = '';
    private _elementIndex: string = '';
    private _elementDescription: string = '';
    private _selectedParentIds: number[] = [];
    // _isLoading and _error inherited from BaseComponent

    private formElement: HTMLFormElement | null = null;

    // --- Input Element References ---
    private nameInput: AppInput | null = null;
    private indexInput: AppInput | null = null;
    private descriptionInput: AppTextarea | null = null;
    private parentSelector: ParentElementSelector | null = null;
    private submitButton: AppButton | null = null;
    private errorDisplay: ErrorDisplay | null = null;

    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleParentChange = this.handleParentChange.bind(this);
        this.submitHandlerWrapper = this.submitHandlerWrapper.bind(this); // Bind wrapper
    }

    // --- Getters/Setters for Properties ---
    set elementToEdit(element: SignatureElement | null) {
        this._elementToEdit = element;
        if (element) {
            this._elementName = element.name || '';
            this._elementIndex = element.index || '';
            this._elementDescription = element.description || '';
            // Fetch parent info only if component is connected
            if (this.isConnected) {
                this.fetchParentsForEdit();
            }
        } else {
            // Reset fields for new element
            this._elementName = '';
            this._elementIndex = '';
            this._elementDescription = '';
            this._selectedParentIds = [];
        }
        // Update form display only if component is connected
        if (this.isConnected) {
            this.updateFormValues();
        }
    }
    get elementToEdit(): SignatureElement | null {
        return this._elementToEdit;
    }

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
            form { display: flex; flex-direction: column; gap: var(--spacing-4); position: relative; }
            .form-row { display: flex; flex-direction: column; gap: var(--spacing-1); }
            app-label { font-weight: 500; font-size: 0.875rem; }
            .actions { display: flex; justify-content: flex-end; gap: var(--spacing-3); margin-top: var(--spacing-4); }
            .loading-overlay {
                position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.5);
                display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius);
            }
        `;
    }

    protected get template(): string {
         if (!this.component) {
             return `<error-display message="Component context is missing. Cannot render form."></error-display>`;
         }
        const isEditing = !!this.elementToEdit;
        const submitText = isEditing ? 'Save Changes' : 'Create Element';
        const componentId = this.component?.signatureComponentId ?? null;
        const elementId = this.elementToEdit?.signatureElementId ?? null;

        return `
            <form id="element-form">
                 <div class="loading-overlay" style="display: none;">
                    <loading-spinner></loading-spinner>
                 </div>
                <error-display id="form-error" hidden></error-display>
                <div class="form-row">
                    <app-label for="element-name">Name <span style="color:red">*</span></app-label>
                    <app-input type="text" id="element-name" name="name" required></app-input>
                </div>
                 <div class="form-row">
                    <app-label for="element-index">Index</app-label>
                    <app-input type="text" id="element-index" name="index" placeholder="e.g., A, 1, i"></app-input>
                </div>
                <div class="form-row">
                    <app-label for="element-description">Description</app-label>
                    <app-textarea id="element-description" name="description"></app-textarea>
                </div>
                <div class="form-row">
                     <parent-element-selector
                         id="parent-selector"
                         label="Parent Element(s)"
                         component-id="${componentId ?? ''}"
                         exclude-id="${elementId ?? ''}"
                     >
                     </parent-element-selector>
                </div>
                <div class="actions">
                    <app-button type="button" variant="outline" id="cancel-button">Cancel</app-button>
                    <app-button type="submit" id="submit-button" loading="${this._isLoading}" disabled="${this._isLoading}">
                        ${submitText}
                    </app-button>
                </div>
            </form>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.formElement = this.qs('#element-form') as HTMLFormElement; // Assert type
        this.nameInput = this.qs('#element-name') as AppInput; // Assert type
        this.indexInput = this.qs('#element-index') as AppInput; // Assert type
        this.descriptionInput = this.qs('#element-description') as AppTextarea; // Assert type
        this.parentSelector = this.qs('#parent-selector') as ParentElementSelector; // Assert type
        this.submitButton = this.qs('#submit-button') as AppButton; // Assert type
        this.errorDisplay = this.qs('#form-error') as ErrorDisplay; // Assert type

        // Fetch parents if editing and not already fetched
        if (this.elementToEdit && this._selectedParentIds.length === 0) {
             this.fetchParentsForEdit();
        }
        this.updateFormValues(); // Set initial values
        // Listeners added by base class render() call
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base class removes listeners
    }

    // Wrapper for async submit handler
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during element form submission:", error);
            this.setErrorState(error?.message || "An unexpected error occurred.");
            this.setLoadingState(false); // Ensure loading stops on error
        });
    }

    addEventListeners() {
        this.registerListener(this.formElement, 'submit', this.submitHandlerWrapper); // Use wrapper
        this.registerListener(this.qs('#cancel-button'), 'click', this.handleCancel);
        // Listen for changes from the parent selector
        this.registerListener(this.parentSelector, 'change', this.handleParentChange);

        // Update internal state on input changes
         this.registerListener(this.nameInput, 'input', (e) => this._elementName = (e.target as AppInput).value);
         this.registerListener(this.indexInput, 'input', (e) => this._elementIndex = (e.target as AppInput).value);
         this.registerListener(this.descriptionInput, 'input', (e) => this._elementDescription = (e.target as AppTextarea).value);
    }
    // removeEventListeners handled by BaseComponent

    private async fetchParentsForEdit() {
        if (!this.elementToEdit?.signatureElementId || !this.auth.token) return;
         // Temporarily disable parent selector while loading
         if (this.parentSelector) this.parentSelector.disabled = true;
        try {
            const elementId = this.elementToEdit.signatureElementId;
            // Fetch element *without* extra arguments
            const fullElement = await api.getSignatureElementById(elementId);
            // Assuming parentElements are directly on the returned element object
            // Adjust if the API returns parents differently
            this._selectedParentIds = fullElement.parentElements?.map(p => p.signatureElementId!) ?? [];
            this.updateFormValues(); // Update selector after fetching
        } catch (err: any) {
             console.error("Failed to fetch parent elements for editing:", err);
             showToast("Could not load parent element information.", "warning");
             // Keep selector empty or show an error? For now, keep empty.
             this._selectedParentIds = [];
             this.updateFormValues();
        } finally {
            // Re-enable based on *host* disabled state (inherited from BaseComponent)
             if (this.parentSelector) {
                 // Check if the parentSelector component has a 'disabled' property
                 if ('disabled' in this.parentSelector) {
                     this.parentSelector.disabled = this.hasAttribute('disabled');
                 } else {
                     this.parentSelector.toggleAttribute('disabled', this.hasAttribute('disabled'));
                 }
             }
        }
    }

    private updateFormValues() {
        if (this.nameInput) this.nameInput.value = this._elementName;
        if (this.indexInput) this.indexInput.value = this._elementIndex;
        if (this.descriptionInput) this.descriptionInput.value = this._elementDescription;
        // Update parent selector - assuming it takes an array of IDs
        if (this.parentSelector) {
            this.parentSelector.selectedIds = this._selectedParentIds;
            // Ensure component-id and exclude-id are set correctly
            if (this.component) this.parentSelector.componentId = String(this.component.signatureComponentId);
            if (this.elementToEdit) this.parentSelector.excludeId = this.elementToEdit.signatureElementId; else this.parentSelector.excludeId = null;
        }
        // Update submit button text
        const isEditing = !!this.elementToEdit;
        if (this.submitButton) this.submitButton.textContent = isEditing ? 'Save Changes' : 'Create Element';
    }

    private handleParentChange(event: Event) {
        const customEvent = event as CustomEvent<{ selectedIds: number[] }>;
        if (customEvent.detail && Array.isArray(customEvent.detail.selectedIds)) {
            this._selectedParentIds = customEvent.detail.selectedIds;
            // console.log("Parent IDs changed:", this._selectedParentIds);
        }
    }

    private handleCancel = () => {
        // Close the dialog/popover this form is in
        this.dispatchEvent(new CustomEvent('cancel', { bubbles: true, composed: true }));
        // Check if the host is within an app-dialog and close it
        const dialog = this.closest('app-dialog');
        dialog?.hide();
    }

    private setLoadingState(isLoading: boolean) {
        this._isLoading = isLoading;
        // Use qsOptional and check for existence
        const loadingOverlay = this.qsOptional<HTMLElement>('.loading-overlay');
        if (loadingOverlay) loadingOverlay.style.display = isLoading ? 'flex' : 'none';
        if (this.submitButton) this.submitButton.loading = isLoading;
        // Disable other inputs?
         if (this.nameInput) this.nameInput.disabled = isLoading;
         if (this.indexInput) this.indexInput.disabled = isLoading;
         if (this.descriptionInput) this.descriptionInput.disabled = isLoading;
         if (this.parentSelector) {
            if ('disabled' in this.parentSelector) this.parentSelector.disabled = isLoading;
            else this.parentSelector.toggleAttribute('disabled', isLoading);
         }
    }

    private setErrorState(error: string | null) {
        this._error = error;
        if (this.errorDisplay) {
            this.errorDisplay.message = error || '';
            this.errorDisplay.hidden = !error;
        }
    }

    private async handleSubmit(event: SubmitEvent) {
        // Removed preventDefault, handled by wrapper
        if (!this.component || this._isLoading) return;

        this.setLoadingState(true);
        this.setErrorState(null);

        const isEditing = !!this.elementToEdit;
        const elementData: CreateSignatureElementInput | UpdateSignatureElementInput = {
            name: this._elementName,
            index: this._elementIndex || null, // Send null if empty
            description: this._elementDescription || null, // Send null if empty
            parentIds: this._selectedParentIds, // Pass selected parent IDs
            // Component ID is required for creation, but usually not for update (or inferred)
            ...( !isEditing && { signatureComponentId: this.component.signatureComponentId })
        };

        try {
            let savedElement: SignatureElement;
            let originalParentIds: number[] = []; // Keep this if needed for complex diff logic later

            if (isEditing && this.elementToEdit) {
                // No need to fetch original parents unless update logic requires diffing
                savedElement = await api.updateSignatureElement(this.elementToEdit.signatureElementId!, elementData as UpdateSignatureElementInput);
                showToast("Element updated successfully!", "success");
            } else {
                savedElement = await api.createSignatureElement(elementData as CreateSignatureElementInput);
                showToast("Element created successfully!", "success");
            }

            this.dispatchEvent(new CustomEvent('save', {
                detail: { element: savedElement },
                bubbles: true, composed: true
            }));
             // Reset form after successful save (for create mode)
             if (!isEditing) {
                 this.elementToEdit = null; // This will trigger reset via setter
             }

        } catch (err: any) {
            const message = err.message || (isEditing ? 'Failed to update element' : 'Failed to create element');
            this.setErrorState(message);
            showToast(message, "error");
            throw err; // Re-throw for wrapper
        } finally {
            // Loading state handled by wrapper if error is re-thrown
            // this.setLoadingState(false);
        }
    }
}

// Define the component unless already defined
if (!customElements.get('element-form')) {
    customElements.define('element-form', ElementForm);
}
