import { BaseComponent } from '../base-component';
import { noteFormSchema, type NoteFormData } from '../../lib/zodSchemas';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import api from '../../lib/api';
import { showToast } from '../ui/toast-handler';
import type { NoteInput, NoteWithDetails } from '../../../../backend/src/functionalities/note/models';
// Explicitly import types from components
import type { AppInput } from '../ui/app-input';
import type { AppTextarea } from '../ui/app-textarea';
import type { AppCheckbox } from '../ui/app-checkbox';
import type { AppButton } from '../ui/app-button';
import type { AppLabel } from '../ui/app-label';
import type { ErrorDisplay } from '../ui/error-display';
import type { TagSelector } from '../shared/tag-selector'; // Import the type

// Import component definitions to ensure they are loaded
import '../ui/app-input';
import '../ui/app-textarea';
import '../ui/app-checkbox';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/error-display';
import '../shared/tag-selector';
import '../ui/loading-spinner';

export class NoteEditor extends BaseComponent {
    private _noteToEdit: NoteWithDetails | null = null;
    private tagSelector: TagSelector | null = null;
    private _selectedTagIds: number[] = []; // Local state for tags

    // --- Properties ---
    set noteToEdit(note: NoteWithDetails | null) {
        this._noteToEdit = note;
        this.populateForm();
    }
    get noteToEdit(): NoteWithDetails | null { return this._noteToEdit; }

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
            form { display: flex; flex-direction: column; gap: var(--spacing-3); position: relative; padding-top: var(--spacing-2); }
            .form-group { display: flex; flex-direction: column; gap: var(--spacing-1); position: relative; }
            .error-message { color: var(--color-destructive); font-size: 0.75rem; display: none; min-height: 1em; }
            span[data-visible="true"] { display: block; }
            .loading-overlay {
                 position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.5);
                 display: flex; align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius);
             }
             .share-group {
                 display: flex;
                 align-items: center; /* Keep vertical centering */
                 gap: var(--spacing-2);
                 /* Increased top margin significantly */
                 margin-top: var(--spacing-4);
                 width: max-content; /* Prevent group from expanding unnecessarily */
             }
             app-button[type="submit"] { align-self: flex-start; margin-top: var(--spacing-4); }
              app-label[data-disabled="true"] { cursor: not-allowed; opacity: 0.5; }
             /* Ensure textarea takes full width */
              app-textarea { width: 100%; }
             /* Ensure tag selector uses full width */
             tag-selector { width: 100%; }
        `;
    }

    protected get template(): string {
        return `
             <form id="note-form">
                <div class="loading-overlay" style="display: none;">
                    <loading-spinner></loading-spinner>
                </div>
                <error-display id="form-error" hidden></error-display>

                 <div class="form-group">
                    <app-label for="title">Title *</app-label>
                    <app-input type="text" id="title" name="title" required></app-input>
                    <span id="title-error" class="error-message"></span>
                </div>

                 <div class="form-group">
                    <app-label for="content">Content</app-label>
                    <app-textarea id="content" name="content" rows="6"></app-textarea>
                    <span id="content-error" class="error-message"></span>
                </div>

                 <div class="form-group">
                    <app-label for="tags">Tags</app-label>
                    <tag-selector id="tags"></tag-selector>
                    <span id="tagIds-error" class="error-message"></span>
                 </div>

                 <div class="share-group">
                     <app-checkbox id="shared" name="shared"></app-checkbox>
                     <app-label for="shared">Share this note publicly</app-label>
                     <span id="shared-error" class="error-message"></span>
                 </div>


                 <app-button type="submit" id="submit-button">
                     ${this._noteToEdit ? 'Update Note' : 'Create Note'}
                 </app-button>
            </form>
        `;
    }

    // Wrapper for the async submit handler
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during note submission:", error);
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

    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleTagSelectionChange = this.handleTagSelectionChange.bind(this);
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        this.tagSelector = this.qsOptional<TagSelector>('#tags');
        this.addEventListeners();
        this.populateForm();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Base class handles listener removal
    }

    addEventListeners(): void {
        this.shadow.querySelector('#note-form')?.addEventListener('submit', this.submitHandlerWrapper);
        // Use the correct event name from tag-selector
        this.tagSelector?.addEventListener('tag-selection-change', this.handleTagSelectionChange);
    }

    removeEventListeners(): void {
        this.shadow.querySelector('#note-form')?.removeEventListener('submit', this.submitHandlerWrapper);
        // Use the correct event name from tag-selector
        this.tagSelector?.removeEventListener('tag-selection-change', this.handleTagSelectionChange);
    }

    private populateForm(): void {
        if (!this.isConnected) return;
        const form = this.shadow.querySelector('#note-form') as HTMLFormElement;
        if (!form) return;
        const titleInput = this.qs<AppInput>('#title');
        const contentTextarea = this.qs<AppTextarea>('#content');
        const sharedCheckbox = this.qs<AppCheckbox>('#shared');
        const submitButton = this.qs<AppButton>('#submit-button');
        const sharedLabel = this.qs<AppLabel>('app-label[for="shared"]');
        const tagSel = this.qsOptional<TagSelector>('#tags'); // Re-query tag selector

        if (this._noteToEdit) {
            titleInput.value = this._noteToEdit.title || '';
            contentTextarea.value = this._noteToEdit.content || '';
            sharedCheckbox.checked = Boolean(this._noteToEdit.shared);
            this._selectedTagIds = this._noteToEdit.tags?.map(t => t.tagId!) ?? [];
             if (tagSel) {
                // Set selected IDs on the tag selector component
                tagSel.selectedTagIds = this._selectedTagIds;
             } else {
                 console.warn("NoteEditor: Could not find tag-selector to populate.");
             }
            submitButton.textContent = 'Update Note';

            const isOwner = this._noteToEdit.ownerUserId === this.auth.user?.userId;
            const canShare = isOwner || this.auth.isAdmin;
            sharedCheckbox.disabled = !canShare;
            sharedLabel.toggleAttribute('data-disabled', !canShare);
            sharedLabel.title = canShare ? '' : 'Only owner or admin can change sharing';

        } else {
             titleInput.value = '';
             contentTextarea.value = '';
             sharedCheckbox.checked = false;
             sharedCheckbox.disabled = false; // Always enable for new notes
             sharedLabel.removeAttribute('data-disabled');
             sharedLabel.title = '';
             this._selectedTagIds = [];
             if (tagSel) tagSel.selectedTagIds = []; // Reset tag selector
             submitButton.textContent = 'Create Note';
        }

        clearValidationErrors(this.shadow);
        const formError = this.qsOptional<ErrorDisplay>('#form-error');
        if (formError) formError.hidden = true;
    }

     private handleTagSelectionChange(event: Event): void {
         const customEvent = event as CustomEvent;
         // Ensure detail.selectedIds exists and is an array before assigning
         this._selectedTagIds = Array.isArray(customEvent.detail?.selectedIds) ? customEvent.detail.selectedIds : [];
         // console.log("NoteEditor received tag change:", this._selectedTagIds); // Debug log
     }


    private async handleSubmit(event: SubmitEvent): Promise<void> {
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
         const titleValue = this.qs<AppInput>('#title').value;
         const contentValue = this.qs<AppTextarea>('#content').value;
         const sharedValue = this.qs<AppCheckbox>('#shared').checked;

         const data = {
            title: titleValue,
            content: contentValue,
            shared: sharedValue,
            tagIds: this._selectedTagIds // Use the locally tracked state
         };

         const validation = validateForm(noteFormSchema, data);

         if (!validation.success) {
             displayValidationErrors(validation.errors, this.shadow);
             submitButton.disabled = false;
             if (loadingOverlay) loadingOverlay.style.display = 'none';
             return;
         }

         const validatedData = validation.data as NoteFormData;

         try {
             let result: NoteWithDetails;
             const payload: NoteInput = {
                 title: validatedData.title,
                 content: validatedData.content ?? '',
                 shared: Boolean(validatedData.shared),
                 tagIds: validatedData.tagIds,
             };

             if (this._noteToEdit?.noteId) {
                  const isOwner = this._noteToEdit.ownerUserId === this.auth.user?.userId;
                  const canShare = isOwner || this.auth.isAdmin;
                  if (payload.shared !== this._noteToEdit.shared && !canShare) {
                      showToast("Forbidden: Only the owner or an admin can change the shared status.", "error");
                      const sharedCheckbox = this.qs<AppCheckbox>('#shared');
                      sharedCheckbox.checked = this._noteToEdit.shared;
                      payload.shared = this._noteToEdit.shared;
                      console.warn("Attempted to change shared status without permission, ignoring change.");
                  }

                 result = await api.updateNote(this._noteToEdit.noteId, payload);
                 showToast("Note updated successfully.", "success");
             } else {
                 result = await api.createNote(payload);
                 showToast("Note created successfully.", "success");
             }
             this.dispatchEvent(new CustomEvent('save', { detail: { note: result } }));

         } catch (err: any) {
              const message = err.message || `Failed to ${this._noteToEdit ? 'update' : 'create'} note`;
              formError.message = message;
              formError.hidden = false;
              showToast(message, "error");
              console.error("Note save error:", err);
              throw err; // Re-throw for wrapper
         } finally {
              if (loadingOverlay) loadingOverlay.style.display = 'none';
              // Let wrapper handle button state on error
              if (formError.hidden) submitButton.disabled = false;
         }
     }
}

// Define the component unless already defined
if (!customElements.get('note-editor')) {
    customElements.define('note-editor', NoteEditor);
}