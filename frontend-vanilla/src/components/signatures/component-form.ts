import { BaseComponent } from '../base-component';
import { createSignatureComponentFormSchema, type CreateSignatureComponentFormData } from '../../lib/zodSchemas';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import api from '../../lib/api';
import { showToast } from '../ui/toast-handler';
import type { SignatureComponent, CreateSignatureComponentInput, UpdateSignatureComponentInput, SignatureComponentIndexType } from '../../../../backend/src/functionalities/signature/component/models';
// Import components and types (ensure definitions are loaded)
import '../ui/app-input';
import '../ui/app-textarea';
import '../ui/app-select';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/error-display';
import '../ui/loading-spinner';

// Import component types
import type { AppInput } from '../ui/app-input';
import type { AppTextarea } from '../ui/app-textarea';
import type { AppSelect } from '../ui/app-select';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';

export class ComponentForm extends BaseComponent {
    private _componentToEdit: SignatureComponent | null = null;

    // --- Properties ---
    set componentToEdit(component: SignatureComponent | null) {
        this._componentToEdit = component;
        this.populateForm();
    }
    get componentToEdit(): SignatureComponent | null {
        return this._componentToEdit;
    }

    // --- Constructor ---
    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
    }


    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
            form { display: flex; flex-direction: column; gap: var(--spacing-3); position: relative; }
            .form-group { display: flex; flex-direction: column; gap: var(--spacing-1); }
            .error-message { color: var(--color-destructive); font-size: 0.75rem; min-height: 1em; display: none; } /* Hide by default */
            span[data-visible="true"] { display: block; } /* Show when populated */
            .loading-overlay {
                 position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.5);
                 display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius);
             }
             app-button[type="submit"] { align-self: flex-start; margin-top: var(--spacing-2); }
        `;
    }

    protected get template(): string {
        return `
            <form id="component-form">
                <div class="loading-overlay" style="display: none;">
                    <loading-spinner></loading-spinner>
                </div>
                <error-display id="form-error" hidden></error-display>

                 <div class="form-group">
                    <app-label for="name">Component Name *</app-label>
                    <app-input type="text" id="name" name="name" required></app-input>
                    <span id="name-error" class="error-message"></span>
                </div>

                 <div class="form-group">
                    <app-label for="description">Description (Optional)</app-label>
                    <app-textarea id="description" name="description" rows="3"></app-textarea>
                    <span id="description-error" class="error-message"></span>
                </div>

                 <div class="form-group">
                    <app-label for="index_type">Index Formatting *</app-label>
                    <app-select id="index_type" name="index_type" required>
                        <option value="dec">Decimal (1, 2, 3...)</option>
                        <option value="roman">Roman (I, II, III...)</option>
                        <option value="small_char">Lowercase Letters (a, b, c...)</option>
                        <option value="capital_char">Uppercase Letters (A, B, C...)</option>
                    </app-select>
                    <span id="index_type-error" class="error-message"></span>
                </div>

                <app-button type="submit" id="submit-button">
                    ${this._componentToEdit ? 'Update Component' : 'Create Component'}
                </app-button>
            </form>
        `;
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        this.addEventListeners(); // Add listeners after initial render
        this.populateForm();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base removes listeners
    }

    // Wrapper for the async submit handler
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during component form submission:", error);
            const formError = this.qsOptional<ErrorDisplay>('#form-error');
            if (formError) {
                formError.message = error?.message || "An unexpected error occurred during submission.";
                formError.hidden = false;
            }
            const submitButton = this.qsOptional<AppButton>('#submit-button');
            if(submitButton) submitButton.disabled = false;
            const loadingOverlay = this.qsOptional<HTMLElement>('.loading-overlay');
            if(loadingOverlay) loadingOverlay.style.display = 'none';
        });
    }

    addEventListeners(): void {
        this.shadow.querySelector('#component-form')?.addEventListener('submit', this.submitHandlerWrapper);
    }

    removeEventListeners(): void {
        this.shadow.querySelector('#component-form')?.removeEventListener('submit', this.submitHandlerWrapper);
    }

    private populateForm(): void {
        if (!this.isConnected) return;
        const form = this.shadow.querySelector('#component-form') as HTMLFormElement;
        if (!form) return;
        const nameInput = this.qs<AppInput>('#name');
        const descTextarea = this.qs<AppTextarea>('#description');
        const indexSelect = this.qs<AppSelect>('#index_type');
        const submitButton = this.qs<AppButton>('#submit-button');

        if (this._componentToEdit) {
            nameInput.value = this._componentToEdit.name || '';
            descTextarea.value = this._componentToEdit.description || '';
            indexSelect.value = this._componentToEdit.index_type || 'dec';
            submitButton.textContent = 'Update Component';
        } else {
             nameInput.value = '';
             descTextarea.value = '';
             indexSelect.value = 'dec'; // Default
             submitButton.textContent = 'Create Component';
        }
        clearValidationErrors(this.shadow);
        const formError = this.qsOptional<ErrorDisplay>('#form-error');
        if (formError) formError.hidden = true;
    }


    private async handleSubmit(event: SubmitEvent): Promise<void> {
        if (!this.auth.isAdmin || !this.auth.token) {
            showToast("Admin privileges required to manage components.", "error");
            return;
        }

        const form = event.target as HTMLFormElement;
        const submitButton = this.qs<AppButton>('#submit-button');
        const formError = this.qs<ErrorDisplay>('#form-error');
        const loadingOverlay = this.qs<HTMLElement>('.loading-overlay');

        submitButton.disabled = true;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';
        formError.hidden = true;
        clearValidationErrors(this.shadow);

        // Query values directly for reliability with custom elements
        const data = {
             name: this.qs<AppInput>('#name').value,
             description: this.qs<AppTextarea>('#description').value,
             index_type: this.qs<AppSelect>('#index_type').value,
        };


        const validation = validateForm(createSignatureComponentFormSchema, data);

        if (!validation.success) {
            displayValidationErrors(validation.errors, this.shadow);
            submitButton.disabled = false;
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }

        const validatedData = validation.data as CreateSignatureComponentFormData;

        try {
            let result: SignatureComponent;
            if (this._componentToEdit?.signatureComponentId) {
                const updatePayload: UpdateSignatureComponentInput = {};
                 if (validatedData.name !== this._componentToEdit.name) updatePayload.name = validatedData.name;
                 const newDesc = validatedData.description?.trim() || null;
                 if (newDesc !== (this._componentToEdit.description || null)) updatePayload.description = newDesc;
                 if (validatedData.index_type !== this._componentToEdit.index_type) updatePayload.index_type = validatedData.index_type as SignatureComponentIndexType;

                 if (Object.keys(updatePayload).length > 0) {
                      result = await api.updateSignatureComponent(this._componentToEdit.signatureComponentId, updatePayload);
                      showToast("Component updated successfully.", "success");
                 } else {
                     showToast("No changes detected.", "info");
                     result = this._componentToEdit; // Return original if no change
                 }

            } else {
                 const createPayload: CreateSignatureComponentInput = {
                     name: validatedData.name,
                     description: validatedData.description || undefined,
                     index_type: validatedData.index_type as SignatureComponentIndexType
                 };
                result = await api.createSignatureComponent(createPayload);
                showToast("Component created successfully.", "success");
            }
            this.dispatchEvent(new CustomEvent('save', { detail: { component: result } }));

        } catch (err: any) {
             const message = err.message || `Failed to ${this._componentToEdit ? 'update' : 'create'} component`;
             formError.message = message;
             formError.hidden = false;
             showToast(message, "error");
             console.error("Component save error:", err);
             throw err;
        } finally {
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            if (formError.hidden) submitButton.disabled = false;
        }
    }
}

// Define the component unless already defined
if (!customElements.get('component-form')) {
    customElements.define('component-form', ComponentForm);
}
