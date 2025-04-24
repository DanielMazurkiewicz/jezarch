import { BaseComponent } from '../base-component';
import { tagFormSchema, type TagFormData } from '../../lib/zodSchemas';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import api from '../../lib/api';
import { showToast } from '../ui/toast-handler';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
// Import components and types
import '../ui/app-input';
import '../ui/app-textarea';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/error-display';
import '../ui/loading-spinner';

// Import component types
import type { AppInput } from '../ui/app-input';
import type { AppTextarea } from '../ui/app-textarea';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';


export class TagForm extends BaseComponent {
    private _tagToEdit: Tag | null = null;

    // --- Properties ---
    set tagToEdit(tag: Tag | null) {
        this._tagToEdit = tag;
        this.populateForm();
    }
    get tagToEdit(): Tag | null { return this._tagToEdit; }

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
            .error-message { color: var(--color-destructive); font-size: 0.75rem; min-height: 1em; }
            .loading-overlay {
                 position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.5);
                 display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius);
             }
             app-button[type="submit"] { align-self: flex-start; margin-top: var(--spacing-2); }
        `;
    }

    protected get template(): string {
        return `
            <form id="tag-form">
                <div class="loading-overlay" style="display: none;">
                    <loading-spinner></loading-spinner>
                </div>
                <error-display id="form-error" hidden></error-display>

                 <div class="form-group">
                    <app-label for="name">Tag Name *</app-label>
                    <app-input type="text" id="name" name="name" required></app-input>
                    <span id="name-error" class="error-message"></span>
                </div>

                 <div class="form-group">
                    <app-label for="description">Description (Optional)</app-label>
                    <app-textarea id="description" name="description" rows="3"></app-textarea>
                    <span id="description-error" class="error-message"></span>
                </div>

                <app-button type="submit" id="submit-button">
                    ${this._tagToEdit ? 'Update Tag' : 'Create Tag'}
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
        super.disconnectedCallback(); // Base class removes listeners
    }

    // Wrapper for the async submit handler
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during tag form submission:", error);
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
        this.shadow.querySelector('#tag-form')?.addEventListener('submit', this.submitHandlerWrapper);
    }

    removeEventListeners(): void {
        this.shadow.querySelector('#tag-form')?.removeEventListener('submit', this.submitHandlerWrapper);
    }

     private populateForm(): void {
        if (!this.isConnected) return;
        const form = this.shadow.querySelector('#tag-form') as HTMLFormElement;
        if (!form) return;

        const nameInput = this.qs<AppInput>('#name');
        const descTextarea = this.qs<AppTextarea>('#description');
        const submitButton = this.qs<AppButton>('#submit-button');

        if (this._tagToEdit) {
            nameInput.value = this._tagToEdit.name || '';
            descTextarea.value = this._tagToEdit.description || '';
            submitButton.textContent = 'Update Tag';
        } else {
             nameInput.value = '';
             descTextarea.value = '';
             submitButton.textContent = 'Create Tag';
        }
        clearValidationErrors(this.shadow);
        const formError = this.qsOptional<ErrorDisplay>('#form-error');
        if (formError) formError.hidden = true;
    }


    private async handleSubmit(event: SubmitEvent) {
         if (!this.auth.token) {
             showToast("Authentication error.", "error");
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

         const formData = new FormData(form);
         const data = Object.fromEntries(formData.entries());

         const validation = validateForm(tagFormSchema, data);

         if (!validation.success) {
             displayValidationErrors(validation.errors, this.shadow);
             submitButton.disabled = false;
             if (loadingOverlay) loadingOverlay.style.display = 'none';
             return;
         }

         const validatedData = validation.data as TagFormData;

         try {
             let result: Tag;
             const payload: Pick<Tag, 'name' | 'description'> = {
                 name: validatedData.name,
                 description: validatedData.description || undefined,
             };

             if (this._tagToEdit?.tagId) {
                  if (!this.auth.isAdmin) {
                      showToast("Only administrators can update tags.", "error");
                      throw new Error("Forbidden: Only administrators can update tags.");
                  }
                 const updatePayload: Partial<typeof payload> = {};
                 if (payload.name !== this._tagToEdit.name) updatePayload.name = payload.name;
                 if (payload.description !== (this._tagToEdit.description || undefined)) updatePayload.description = payload.description;

                 if (Object.keys(updatePayload).length > 0) {
                      result = await api.updateTag(this._tagToEdit.tagId, updatePayload);
                      showToast("Tag updated successfully.", "success");
                 } else {
                      showToast("No changes detected.", "info");
                      result = this._tagToEdit; // Use original if no change
                 }

             } else {
                 result = await api.createTag(payload);
                 showToast("Tag created successfully.", "success");
             }
             this.dispatchEvent(new CustomEvent('save', { detail: { tag: result } }));

         } catch (err: any) {
              const message = err.message || `Failed to ${this._tagToEdit ? 'update' : 'create'} tag`;
              formError.message = message;
              formError.hidden = false;
              showToast(message, "error");
              console.error("Tag save error:", err);
              throw err; // Re-throw for wrapper
         } finally {
             if (loadingOverlay) loadingOverlay.style.display = 'none';
             // Let wrapper handle button state on error
             if (formError.hidden) submitButton.disabled = false;
         }
     }
}

// Define the component unless already defined
if (!customElements.get('tag-form')) {
    customElements.define('tag-form', TagForm);
}