// Basic Implementation for document-form
import { BaseComponent } from '../base-component';
import { createArchiveDocumentFormSchema, type CreateArchiveDocumentFormData } from '../../lib/zodSchemas';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import api from '../../lib/api';
import { showToast } from '../ui/toast-handler';
import type { ArchiveDocument, ArchiveDocumentType, CreateArchiveDocumentInput, UpdateArchiveDocumentInput } from '../../../../backend/src/functionalities/archive/document/models';
import { icons } from '../../lib/icons';

// Import components used in the template (ensure definitions are loaded)
import '../ui/app-input';
import '../ui/app-textarea';
import '../ui/app-select';
import '../ui/app-checkbox';
import '../ui/app-button';
import '../ui/app-label';
import '../ui/error-display';
import '../shared/tag-selector';
import '../shared/signature-selector'; // Assuming this exists for signature input
import '../ui/loading-spinner'; // Import loading spinner

// Import types
import type { AppInput } from '../ui/app-input';
import type { AppTextarea } from '../ui/app-textarea';
import type { AppSelect } from '../ui/app-select';
import type { AppCheckbox } from '../ui/app-checkbox';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';
import type { TagSelector } from '../shared/tag-selector';
import type { SignatureSelector } from '../shared/signature-selector'; // Assuming this exists


export class DocumentForm extends BaseComponent {
    private _docToEdit: ArchiveDocument | null = null;
    private _forceType: ArchiveDocumentType | undefined = undefined;
    private _forcedParentId: number | undefined = undefined;
    private _forcedParentTitle: string | undefined = undefined;
    private _selectedTagIds: number[] = [];
    private _topographicSignatures: number[][] = []; // [[1,2],[3]]
    private _descriptiveSignatures: number[][] = []; // [[4,5],[6]]

    private tagSelector: TagSelector | null = null;
    private topoSigSelector: SignatureSelector | null = null;
    private descSigSelector: SignatureSelector | null = null;

    // --- Properties ---
    set docToEdit(value: ArchiveDocument | null) {
        this._docToEdit = value;
        this.populateForm();
    }
    get docToEdit(): ArchiveDocument | null { return this._docToEdit; }

    set forceType(value: ArchiveDocumentType | undefined) {
        this._forceType = value;
        this.populateForm(); // Update form state if type is forced
    }
    get forceType(): ArchiveDocumentType | undefined { return this._forceType; }

    set forcedParentId(value: number | undefined) {
        this._forcedParentId = value;
        this.populateForm();
    }
    get forcedParentId(): number | undefined { return this._forcedParentId; }

     set forcedParentTitle(value: string | undefined) {
        this._forcedParentTitle = value;
        this.populateForm();
    }
    get forcedParentTitle(): string | undefined { return this._forcedParentTitle; }

    // --- Constructor ---
    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.handleTagSelectionChange = this.handleTagSelectionChange.bind(this);
        this.handleTopoSigChange = this.handleTopoSigChange.bind(this);
        this.handleDescSigChange = this.handleDescSigChange.bind(this);
    }

    // --- Styles ---
    protected get styles(): string {
         return `
             :host { display: block; max-height: 80vh; overflow-y: auto; padding-right: var(--spacing-2); }
             form { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: var(--spacing-4); position: relative; }
             .form-group { display: flex; flex-direction: column; gap: var(--spacing-1); }
             .full-width { grid-column: 1 / -1; } /* Span full width */
             .error-message { color: var(--color-destructive); font-size: 0.75rem; min-height: 1em; display: none; } /* Hide by default */
             span[data-visible="true"] { display: block; } /* Show when populated */
             .loading-overlay {
                 position: absolute; inset: 0; background-color: hsla(var(--color-background-raw, 0 0 100) / 0.5);
                 display: flex; /* Use flex by default */
                 align-items: center; justify-content: center; z-index: 10; border-radius: var(--radius);
             }
             app-button[type="submit"] { align-self: flex-start; margin-top: var(--spacing-4); grid-column: 1 / -1; /* Full width */ justify-self: start; }
             .parent-info { font-size: 0.875rem; padding: var(--spacing-2); background-color: var(--color-muted); border: 1px solid var(--color-border); border-radius: var(--radius); margin-bottom: var(--spacing-2); }
             .checkbox-group { display: flex; align-items: center; gap: var(--spacing-2); padding-top: var(--spacing-2); }
              fieldset { border: 1px solid var(--color-border); border-radius: var(--radius); padding: var(--spacing-3); margin-bottom: var(--spacing-3); }
              legend { font-weight: 500; padding: 0 var(--spacing-2); font-size: 0.875rem; color: var(--color-muted-foreground); }
             /* Ensure selectors take full width */
             tag-selector, signature-selector { width: 100%; }
         `;
    }

    // --- Template (Abbreviated for brevity) ---
    protected get template(): string {
        const isEditing = !!this._docToEdit;
        const parentDisplay = this._forcedParentTitle
            ? ` in Unit "${this._forcedParentTitle}"`
            : this._docToEdit?.parentUnitArchiveDocumentId
            ? ` (Parent ID: ${this._docToEdit.parentUnitArchiveDocumentId})` // Add lookup later if needed
            : '';

        // Define field groups based on backend model
        return `
            <form id="doc-form">
                <div class="loading-overlay" style="display: none;"><loading-spinner></loading-spinner></div>
                <error-display id="form-error" hidden class="full-width"></error-display>

                ${this._forcedParentId ? `<div class="parent-info full-width">Creating Document ${parentDisplay}</div>` : ''}

                <fieldset class="full-width">
                    <legend>Core Information</legend>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-3);">
                         <div class="form-group">
                            <app-label for="type">Type *</app-label>
                            <app-select id="type" name="type" required ${this._forceType ? 'disabled' : ''}>
                                <option value="document">Document</option>
                                <option value="unit">Unit</option>
                            </app-select>
                             <span id="type-error" class="error-message"></span>
                         </div>
                        <div class="form-group">
                            <app-label for="title">Title *</app-label>
                            <app-input type="text" id="title" name="title" required></app-input>
                            <span id="title-error" class="error-message"></span>
                        </div>
                        <div class="form-group">
                            <app-label for="creator">Creator *</app-label>
                            <app-input type="text" id="creator" name="creator" required></app-input>
                             <span id="creator-error" class="error-message"></span>
                         </div>
                         <div class="form-group">
                             <app-label for="creationDate">Creation Date *</app-label>
                             <app-input type="text" id="creationDate" name="creationDate" placeholder="e.g., 2023-10-26, circa 1950" required></app-input>
                             <span id="creationDate-error" class="error-message"></span>
                         </div>
                    </div>
                 </fieldset>

                 <fieldset class="full-width">
                     <legend>Signatures & Tags</legend>
                     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                         <div class="form-group">
                             <signature-selector id="topographicSignatureElementIds" label="Topographic Signatures"></signature-selector>
                         </div>
                         <div class="form-group">
                             <signature-selector id="descriptiveSignatureElementIds" label="Descriptive Signatures"></signature-selector>
                         </div>
                         <div class="form-group full-width"> {/* Tags span full width below signatures */}
                             <app-label for="tags">Tags</app-label>
                             <tag-selector id="tags"></tag-selector>
                             <span id="tagIds-error" class="error-message"></span>
                         </div>
                     </div>
                 </fieldset>

                 <fieldset class="full-width">
                    <legend>Physical Description</legend>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--spacing-3);">
                        <div class="form-group">
                             <app-label for="numberOfPages">Pages</app-label>
                             <app-input type="text" id="numberOfPages" name="numberOfPages"></app-input>
                         </div>
                        <div class="form-group">
                             <app-label for="documentType">Document Type</app-label>
                             <app-input type="text" id="documentType" name="documentType"></app-input>
                         </div>
                        <div class="form-group">
                             <app-label for="dimensions">Dimensions</app-label>
                             <app-input type="text" id="dimensions" name="dimensions"></app-input>
                         </div>
                         <div class="form-group">
                            <app-label for="binding">Binding</app-label>
                            <app-input type="text" id="binding" name="binding"></app-input>
                         </div>
                        <div class="form-group">
                             <app-label for="condition">Condition</app-label>
                             <app-input type="text" id="condition" name="condition"></app-input>
                        </div>
                        <div class="form-group">
                             <app-label for="documentLanguage">Language</app-label>
                             <app-input type="text" id="documentLanguage" name="documentLanguage"></app-input>
                         </div>
                    </div>
                     <div class="form-group full-width" style="margin-top: var(--spacing-3);">
                         <app-label for="contentDescription">Content Description</app-label>
                         <app-textarea id="contentDescription" name="contentDescription" rows="3"></app-textarea>
                     </div>
                 </fieldset>

                 <fieldset class="full-width">
                     <legend>Access & Digitization</legend>
                     <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--spacing-3);">
                         <div class="form-group">
                             <app-label for="accessLevel">Access Level</app-label>
                             <app-input type="text" id="accessLevel" name="accessLevel"></app-input>
                         </div>
                         <div class="form-group">
                             <app-label for="accessConditions">Access Conditions</app-label>
                             <app-input type="text" id="accessConditions" name="accessConditions"></app-input>
                         </div>
                         <div class="form-group checkbox-group">
                             <app-checkbox id="isDigitized" name="isDigitized"></app-checkbox>
                             <app-label for="isDigitized">Is Digitized?</app-label>
                         </div>
                         <div class="form-group">
                             <app-label for="digitizedVersionLink">Digitized Link (URL)</app-label>
                             <app-input type="url" id="digitizedVersionLink" name="digitizedVersionLink" placeholder="https://..."></app-input>
                             <span id="digitizedVersionLink-error" class="error-message"></span>
                         </div>
                     </div>
                 </fieldset>

                 <fieldset class="full-width">
                    <legend>Additional Information</legend>
                     <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--spacing-4);">
                         <div class="form-group">
                            <app-label for="remarks">Remarks</app-label>
                             <app-textarea id="remarks" name="remarks" rows="3"></app-textarea>
                        </div>
                         <div class="form-group">
                            <app-label for="additionalInformation">Other Info</app-label>
                             <app-textarea id="additionalInformation" name="additionalInformation" rows="3"></app-textarea>
                        </div>
                         <div class="form-group full-width">
                             <app-label for="relatedDocumentsReferences">Related Documents</app-label>
                             <app-textarea id="relatedDocumentsReferences" name="relatedDocumentsReferences" rows="2"></app-textarea>
                         </div>
                    </div>
                 </fieldset>


                <app-button type="submit" id="submit-button">
                    ${isEditing ? 'Update Item' : 'Create Item'}
                </app-button>
            </form>
        `;
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        this.tagSelector = this.qsOptional<TagSelector>('#tags');
        this.topoSigSelector = this.qsOptional<SignatureSelector>('#topographicSignatureElementIds');
        this.descSigSelector = this.qsOptional<SignatureSelector>('#descriptiveSignatureElementIds');
        this.addEventListeners();
        this.populateForm();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Handles removing event listeners
    }

    // Wrapper for async submit
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during document form submission:", error);
            const formError = this.qsOptional<ErrorDisplay>('#form-error');
            if (formError) {
                formError.message = error?.message || "An unexpected error occurred.";
                formError.hidden = false;
            }
            this.qsOptional<AppButton>('#submit-button')!.disabled = false;
            // Explicitly hide overlay on error
            const loadingOverlay = this.qsOptional<HTMLElement>('.loading-overlay');
            if (loadingOverlay) loadingOverlay.style.display = 'none';
        });
    }

    addEventListeners(): void {
        this.shadow.querySelector('#doc-form')?.addEventListener('submit', this.submitHandlerWrapper);
        // Ensure correct event names from child components
        this.tagSelector?.addEventListener('tag-selection-change', this.handleTagSelectionChange);
        this.topoSigSelector?.addEventListener('change', this.handleTopoSigChange);
        this.descSigSelector?.addEventListener('change', this.handleDescSigChange);
    }

    removeEventListeners(): void {
         this.shadow.querySelector('#doc-form')?.removeEventListener('submit', this.submitHandlerWrapper);
         this.tagSelector?.removeEventListener('tag-selection-change', this.handleTagSelectionChange);
         this.topoSigSelector?.removeEventListener('change', this.handleTopoSigChange);
         this.descSigSelector?.removeEventListener('change', this.handleDescSigChange);
    }

     private handleTagSelectionChange(event: Event): void {
         const customEvent = event as CustomEvent;
         this._selectedTagIds = customEvent.detail.selectedIds || [];
     }
     private handleTopoSigChange(event: Event): void {
        const customEvent = event as CustomEvent;
        this._topographicSignatures = customEvent.detail.signatures || [];
     }
     private handleDescSigChange(event: Event): void {
         const customEvent = event as CustomEvent;
         this._descriptiveSignatures = customEvent.detail.signatures || [];
     }

    private populateForm(): void {
        if (!this.isConnected) return;
        const form = this.shadow.querySelector('#doc-form') as HTMLFormElement;
        if (!form) return;
        const typeSelect = this.qs<AppSelect>('#type');
        const submitButton = this.qs<AppButton>('#submit-button');

        // Reset all fields first using native reset
        // NOTE: This works well if child components correctly handle form reset events
        // or if their 'value' property is the source of truth.
        // For custom components like app-input, ensure their internal state resets
        // or is updated when their `value` property changes.
        // If using native reset, ensure custom components reflect this.
        // Alternatively, manually reset each field:
        this.qs<AppInput>('#title').value = '';
        this.qs<AppInput>('#creator').value = '';
        this.qs<AppInput>('#creationDate').value = '';
        this.qs<AppInput>('#numberOfPages').value = '';
        this.qs<AppInput>('#documentType').value = '';
        this.qs<AppInput>('#dimensions').value = '';
        this.qs<AppInput>('#binding').value = '';
        this.qs<AppInput>('#condition').value = '';
        this.qs<AppInput>('#documentLanguage').value = '';
        this.qs<AppTextarea>('#contentDescription').value = '';
        this.qs<AppTextarea>('#remarks').value = '';
        this.qs<AppInput>('#accessLevel').value = '';
        this.qs<AppInput>('#accessConditions').value = '';
        this.qs<AppTextarea>('#additionalInformation').value = '';
        this.qs<AppTextarea>('#relatedDocumentsReferences').value = '';
        this.qs<AppCheckbox>('#isDigitized').checked = false;
        this.qs<AppInput>('#digitizedVersionLink').value = '';
        // Reset tag/signature selectors
        this._selectedTagIds = [];
        this._topographicSignatures = [];
        this._descriptiveSignatures = [];
        if (this.tagSelector) this.tagSelector.selectedTagIds = [];
        if (this.topoSigSelector) this.topoSigSelector.signatures = [];
        if (this.descSigSelector) this.descSigSelector.signatures = [];


        // Handle forced type
        if (this._forceType) {
            typeSelect.value = this._forceType;
            typeSelect.toggleAttribute('disabled', true);
        } else {
             typeSelect.toggleAttribute('disabled', false); // Ensure enabled if not forced
             typeSelect.value = this._docToEdit?.type || 'document'; // Set default or edit value
        }

        // Populate with editing data if available
        if (this._docToEdit) {
            typeSelect.value = this._docToEdit.type;
            typeSelect.toggleAttribute('disabled', true); // Cannot change type when editing
            this.qs<AppInput>('#title').value = this._docToEdit.title || '';
            this.qs<AppInput>('#creator').value = this._docToEdit.creator || '';
            this.qs<AppInput>('#creationDate').value = this._docToEdit.creationDate || '';
            this.qs<AppInput>('#numberOfPages').value = this._docToEdit.numberOfPages || '';
            this.qs<AppInput>('#documentType').value = this._docToEdit.documentType || '';
            this.qs<AppInput>('#dimensions').value = this._docToEdit.dimensions || '';
            this.qs<AppInput>('#binding').value = this._docToEdit.binding || '';
            this.qs<AppInput>('#condition').value = this._docToEdit.condition || '';
            this.qs<AppInput>('#documentLanguage').value = this._docToEdit.documentLanguage || '';
            this.qs<AppTextarea>('#contentDescription').value = this._docToEdit.contentDescription || '';
            this.qs<AppTextarea>('#remarks').value = this._docToEdit.remarks || '';
            this.qs<AppInput>('#accessLevel').value = this._docToEdit.accessLevel || '';
            this.qs<AppInput>('#accessConditions').value = this._docToEdit.accessConditions || '';
            this.qs<AppTextarea>('#additionalInformation').value = this._docToEdit.additionalInformation || '';
            this.qs<AppTextarea>('#relatedDocumentsReferences').value = this._docToEdit.relatedDocumentsReferences || '';
            this.qs<AppCheckbox>('#isDigitized').checked = Boolean(this._docToEdit.isDigitized);
            this.qs<AppInput>('#digitizedVersionLink').value = this._docToEdit.digitizedVersionLink || '';

            this._selectedTagIds = this._docToEdit.tags?.map(t => t.tagId!) ?? [];
            this._topographicSignatures = this._docToEdit.topographicSignatureElementIds ?? [];
            this._descriptiveSignatures = this._docToEdit.descriptiveSignatureElementIds ?? [];

            submitButton.textContent = 'Update Item';
        } else {
             // Create mode: set type if forced, otherwise default
             typeSelect.value = this._forceType || 'document'; // Default to document
             this._selectedTagIds = [];
             this._topographicSignatures = [];
             this._descriptiveSignatures = [];
             submitButton.textContent = 'Create Item';
        }

        // Update selectors after potentially setting initial values
        // Add checks for existence before accessing properties
        if (this.tagSelector) this.tagSelector.selectedTagIds = this._selectedTagIds;
        if (this.topoSigSelector) this.topoSigSelector.signatures = this._topographicSignatures;
        if (this.descSigSelector) this.descSigSelector.signatures = this._descriptiveSignatures;

        clearValidationErrors(this.shadow);
        this.qsOptional<ErrorDisplay>('#form-error')!.hidden = true;
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

        // Collect data from form elements and state
        // Using querySelector for each field is more reliable with custom elements
        const data = {
             type: this.qs<AppSelect>('#type').value,
             title: this.qs<AppInput>('#title').value,
             creator: this.qs<AppInput>('#creator').value,
             creationDate: this.qs<AppInput>('#creationDate').value,
             numberOfPages: this.qs<AppInput>('#numberOfPages').value || null,
             documentType: this.qs<AppInput>('#documentType').value || null,
             dimensions: this.qs<AppInput>('#dimensions').value || null,
             binding: this.qs<AppInput>('#binding').value || null,
             condition: this.qs<AppInput>('#condition').value || null,
             documentLanguage: this.qs<AppInput>('#documentLanguage').value || null,
             contentDescription: this.qs<AppTextarea>('#contentDescription').value || null,
             remarks: this.qs<AppTextarea>('#remarks').value || null,
             accessLevel: this.qs<AppInput>('#accessLevel').value || null,
             accessConditions: this.qs<AppInput>('#accessConditions').value || null,
             additionalInformation: this.qs<AppTextarea>('#additionalInformation').value || null,
             relatedDocumentsReferences: this.qs<AppTextarea>('#relatedDocumentsReferences').value || null,
             isDigitized: this.qs<AppCheckbox>('#isDigitized').checked,
             digitizedVersionLink: this.qs<AppInput>('#digitizedVersionLink').value || null,
             tagIds: this._selectedTagIds,
             topographicSignatureElementIds: this._topographicSignatures, // Correct property names if needed
             descriptiveSignatureElementIds: this._descriptiveSignatures, // Correct property names if needed
             parentUnitArchiveDocumentId: this._forcedParentId !== undefined ? this._forcedParentId : (this._docToEdit?.parentUnitArchiveDocumentId ?? null),
        };


        const validation = validateForm(createArchiveDocumentFormSchema, data);

        if (!validation.success) {
            displayValidationErrors(validation.errors, this.shadow);
            submitButton.disabled = false;
            if (loadingOverlay) loadingOverlay.style.display = 'none';
            return;
        }

        const validatedData = validation.data as CreateArchiveDocumentFormData;

        try {
            let result: ArchiveDocument;
             const apiPayload: CreateArchiveDocumentInput | UpdateArchiveDocumentInput = {
                 parentUnitArchiveDocumentId: validatedData.parentUnitArchiveDocumentId,
                 type: validatedData.type as ArchiveDocumentType,
                 title: validatedData.title,
                 creator: validatedData.creator,
                 creationDate: validatedData.creationDate,
                 numberOfPages: validatedData.numberOfPages,
                 documentType: validatedData.documentType,
                 dimensions: validatedData.dimensions,
                 binding: validatedData.binding,
                 condition: validatedData.condition,
                 documentLanguage: validatedData.documentLanguage,
                 contentDescription: validatedData.contentDescription,
                 remarks: validatedData.remarks,
                 accessLevel: validatedData.accessLevel,
                 accessConditions: validatedData.accessConditions,
                 additionalInformation: validatedData.additionalInformation,
                 relatedDocumentsReferences: validatedData.relatedDocumentsReferences,
                 isDigitized: validatedData.isDigitized,
                 digitizedVersionLink: validatedData.digitizedVersionLink,
                 topographicSignatureElementIds: this._topographicSignatures,
                 descriptiveSignatureElementIds: this._descriptiveSignatures,
                 tagIds: this._selectedTagIds,
             };

            if (this._docToEdit?.archiveDocumentId) {
                result = await api.updateArchiveDocument(this._docToEdit.archiveDocumentId, apiPayload as UpdateArchiveDocumentInput);
                showToast("Item updated successfully.", "success");
            } else {
                result = await api.createArchiveDocument(apiPayload as CreateArchiveDocumentInput);
                showToast("Item created successfully.", "success");
            }
            this.dispatchEvent(new CustomEvent('save', { detail: { doc: result } }));

        } catch (err: any) {
            const message = err.message || `Failed to ${this._docToEdit ? 'update' : 'create'} item`;
            formError.message = message;
            formError.hidden = false;
            showToast(message, "error");
            console.error("Document save error:", err);
            throw err; // Re-throw for wrapper
        } finally {
             if (loadingOverlay) loadingOverlay.style.display = 'none';
             // Let wrapper handle button state on error, re-enable only on success
             if(formError.hidden) submitButton.disabled = false;
        }
    }
}

// Define the component unless already defined
if (!customElements.get('document-form')) {
    customElements.define('document-form', DocumentForm);
}