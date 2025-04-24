import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
// Import backend types without SearchCondition as it's not exported
import type { SearchRequest, SearchQuery, SearchQueryElement } from '../../../../backend/src/utils/search'; // Adjust path as needed
import type { Tag } from '../../../../backend/src/functionalities/tag/models'; // Adjust path
// Import specific component types
import type { AppSelect } from '../ui/app-select';
import type { AppInput } from '../ui/app-input';
import type { AppCheckbox } from '../ui/app-checkbox';
import type { AppLabel } from '../ui/app-label';
import type { AppButton } from '../ui/app-button';
import type { TagSelector } from './tag-selector';
// Import definitions to ensure they are loaded/defined
import '../ui/app-select';
import '../ui/app-input';
import '../ui/app-checkbox';
import '../ui/app-label';
import '../ui/app-button';
import './tag-selector'; // Ensure tag selector is defined

// Define SearchCondition locally as it's not exported from backend
export type SearchCondition = // Export this type
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'LTE'
  | 'GT'
  | 'GTE'
  | 'LIKE'
  | 'ILIKE' // Case-insensitive LIKE
  | 'FRAGMENT' // For substring matching (often maps to LIKE %value%)
  | 'STARTS_WITH'
  | 'ENDS_WITH'
  | 'IN'
  | 'NOT_IN'
  | 'ANY_OF' // Specifically for array fields (e.g., tags)
  | 'ALL_OF' // Specifically for array fields (e.g., tags)
  | 'IS_NULL'
  | 'IS_NOT_NULL';


export type FieldType = 'text' | 'number' | 'boolean' | 'select' | 'date' | 'tags';

export interface SearchFieldOption {
  value: string; // Field name (e.g., 'title')
  label: string; // User-friendly label (e.g., 'Title')
  type: FieldType;
  options?: { value: string | number | boolean; label: string }[]; // For select type
}

// Define available conditions per field type
const conditionsByType: Record<FieldType, { value: SearchCondition; label: string }[]> = {
  text: [ { value: 'FRAGMENT', label: 'Contains' }, { value: 'EQ', label: 'Equals' }, { value: 'STARTS_WITH', label: 'Starts With' }, { value: 'ENDS_WITH', label: 'Ends With' }, { value: 'IS_NULL', label: 'Is Empty' }, { value: 'IS_NOT_NULL', label: 'Is Not Empty' } ],
  number: [ { value: 'EQ', label: '=' }, { value: 'GT', label: '>' }, { value: 'GTE', label: '>=' }, { value: 'LT', label: '<' }, { value: 'LTE', label: '<=' }, { value: 'IS_NULL', label: 'Is Empty' }, { value: 'IS_NOT_NULL', label: 'Is Not Empty' } ],
  boolean: [ { value: 'EQ', label: 'Is' } ], // Null checks not typical for boolean
  select: [ { value: 'EQ', label: 'Is' }, { value: 'ANY_OF', label: 'Is Any Of' }, { value: 'IS_NULL', label: 'Is Empty' }, { value: 'IS_NOT_NULL', label: 'Is Not Empty' } ],
  tags: [ { value: 'ANY_OF', label: 'Has Any Of' }, { value: 'ALL_OF', label: 'Has All Of' }, /* { value: 'EQ', label: 'Has Only' } */ { value: 'IS_NULL', label: 'Is Empty' }, { value: 'IS_NOT_NULL', label: 'Is Not Empty' } ],
  date: [ { value: 'EQ', label: 'Is' }, { value: 'GT', label: 'After' }, { value: 'GTE', label: 'On or After' }, { value: 'LT', label: 'Before' }, { value: 'LTE', label: 'On or Before' }, { value: 'IS_NULL', label: 'Is Empty' }, { value: 'IS_NOT_NULL', label: 'Is Not Empty' } ],
};

interface CriterionState {
    field: string;
    condition: SearchCondition;
    value: string | number | boolean | number[] | (string | number | boolean)[]; // Array for tags/multi-select
    not: boolean;
    key: string; // Unique key for managing criteria rows
    fieldType: FieldType; // Store the type for rendering
}

export class SearchBar extends BaseComponent {
    static observedAttributes = ['fields', 'loading', 'show-reset-button'];

    private _fields: SearchFieldOption[] = [];
    private criteria: CriterionState[] = [];
    private criteriaContainer: HTMLElement | null = null;
    private isDirty: boolean = false; // Track if criteria changed from default
    private listenersAttached: boolean = false;


    set fields(value: SearchFieldOption[] | string) {
        if (typeof value === 'string') {
            try { this._fields = JSON.parse(value); }
            catch (e) { console.error("Failed to parse search fields attribute:", e); this._fields = []; }
        } else {
            this._fields = Array.isArray(value) ? value : []; // Ensure it's an array
        }
        // Reset criteria if fields change significantly
        this.resetCriteria();
        this.renderCriteria(); // Ensure initial render with new fields
    }
    get fields(): SearchFieldOption[] { return this._fields; }

    // Bind methods in constructor
    constructor() {
        super();
        this.handleAddCriterion = this.handleAddCriterion.bind(this);
        this.handleSearch = this.handleSearch.bind(this);
        this.handleReset = this.handleReset.bind(this);
        this.handleCriterionInputChange = this.handleCriterionInputChange.bind(this);
        this.handleCriterionRemoveClick = this.handleCriterionRemoveClick.bind(this);
        this.handleTagSelectionChange = this.handleTagSelectionChange.bind(this);
    }


    protected get styles(): string {
        // Styles remain the same...
        return `
            :host { display: block; }
            .search-bar-container {
                padding: var(--spacing-4);
                border: 1px solid var(--color-border);
                border-radius: var(--radius);
                background-color: var(--color-card-bg); /* Use card bg */
                box-shadow: var(--shadow-sm);
                position: relative; /* Ensure it doesn't unnecessarily interfere with layout below */
                z-index: 1; /* Keep it above static content but below popovers/dialogs */
            }
            .criteria-list {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-3);
                margin-bottom: var(--spacing-3);
            }
            .criterion-row {
                display: grid; /* Switch to grid for better control */
                grid-template-columns: minmax(150px, 1.5fr) auto minmax(120px, 1fr) minmax(180px, 2fr) auto; /* Field, NOT, Condition, Value, Remove */
                align-items: flex-end; /* Align bottoms */
                gap: var(--spacing-2);
                padding: var(--spacing-2);
                border: 1px dashed var(--color-border);
                border-radius: var(--radius);
                background-color: var(--color-background);
            }
            /* Responsive adjustments for grid */
             @media (max-width: 768px) {
                 .criterion-row {
                    grid-template-columns: 1fr 1fr; /* Stack more on smaller screens */
                    grid-template-areas:
                        "field condition"
                        "not value"
                        "remove remove"; /* Span remove button */
                 }
                 .field-selector { grid-area: field; }
                 .not-toggle { grid-area: not; justify-self: start; } /* Align left */
                 .condition-selector { grid-area: condition; }
                 .value-input { grid-area: value; }
                 .remove-button { grid-area: remove; justify-self: end; } /* Align right */
             }
              @media (max-width: 480px) {
                 .criterion-row {
                    grid-template-columns: 1fr; /* Single column */
                    grid-template-areas:
                        "field"
                        "not"
                        "condition"
                        "value"
                        "remove";
                 }
                 .not-toggle, .remove-button { justify-self: start; } /* Align all left */
             }


            .actions {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding-top: var(--spacing-3);
                border-top: 1px solid var(--color-border);
                flex-wrap: wrap;
                gap: var(--spacing-2);
            }
            .action-buttons { display: flex; gap: var(--spacing-2); }

            /* Reduce label margin */
            app-label { margin-bottom: 2px; font-size: 0.75rem; display: block; }
             /* Make inputs slightly smaller */
            app-input, app-select { height: 2rem; font-size: 0.8rem; }
             .not-toggle { display: flex; align-items: center; padding-bottom: 0.25rem; /* Align checkbox label better */ }
             .not-toggle app-label { margin-bottom: 0; margin-left: var(--spacing-1);}
             .remove-button app-button { /* Ensure remove button aligns nicely */
                 margin-bottom: 2px;
             }

            /* Hide reset button if not shown */
            :host(:not([show-reset-button])) #reset-button { display: none; }

            /* Styling for TagSelector within SearchBar */
             tag-selector {
                 /* Override default padding/border/bg */
                 padding: 0;
                 border: none;
                 background: none;
                 /* Ensure tag selector can be placed in the grid */
                 width: 100%; /* Take full width of grid area */
                 margin-bottom: 2px; /* Align with bottom of remove button */
             }
             tag-selector::part(trigger-button) { /* Style the internal button if tag-selector uses parts */
                 height: 2rem;
                 font-size: 0.8rem;
             }
        `;
    }

    protected get template(): string {
        // Icons are now handled by the icon attribute on app-button
        return `
            <div class="search-bar-container">
                <div class="criteria-list">
                    <!-- Criteria rows will be rendered here -->
                </div>
                <div class="actions">
                    <app-button variant="outline" size="sm" id="add-criterion-button" icon="plusCircle">Add Filter</app-button>
                    <div class="action-buttons">
                        <app-button variant="ghost" size="sm" id="reset-button" icon="refreshCcw">Reset</app-button>
                        <app-button variant="default" size="sm" id="search-button" icon="search">Search</app-button>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.criteriaContainer = this.qs('.criteria-list') as HTMLElement; // Assert type
        // Ensure _fields is populated if attribute exists
         if (this.hasAttribute('fields') && !this._fields.length) {
            this.fields = this.getAttribute('fields') || '[]';
         }
         // Initialize if fields are ready
         if (this._fields.length > 0 && this.criteria.length === 0) {
            this.resetCriteria(); // Initialize with one default criterion
         } else {
             this.renderCriteria(); // Render existing criteria if any survived field changes
         }
         // Ensure listeners are attached only once after initial connection
         if (!this.listenersAttached) {
             this.attachListeners();
             this.listenersAttached = true;
         }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Detach listeners on disconnect
        this.detachListeners();
        this.listenersAttached = false;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (name === 'fields' && oldValue !== newValue) {
             this.fields = newValue || '[]'; // Triggers reset and render
        }
        if (name === 'loading') {
            const isLoading = newValue !== null;
            // Use imported type
            const searchButton = this.qsOptional<AppButton>('#search-button');
            const resetButton = this.qsOptional<AppButton>('#reset-button');
            const addButton = this.qsOptional<AppButton>('#add-criterion-button');
            if (searchButton) {
                searchButton.loading = isLoading;
                searchButton.disabled = isLoading;
            }
            if (resetButton) {
                resetButton.disabled = isLoading || !this.isDirty;
            }
             if (addButton) {
                 addButton.disabled = isLoading;
             }
             // Disable all inputs within criteria rows while loading
             this.criteriaContainer?.querySelectorAll('app-input, app-select, app-checkbox, tag-selector, app-button[data-action="remove"]')
                .forEach(el => (el as HTMLElement & { disabled?: boolean })?.toggleAttribute('disabled', isLoading));

        }
         if (name === 'show-reset-button') {
            // Handled by CSS selector :host(:not([show-reset-button]))
         }
    }

    private attachListeners(): void {
        this.qsOptional<AppButton>('#add-criterion-button')?.addEventListener('click', this.handleAddCriterion);
        this.qsOptional<AppButton>('#search-button')?.addEventListener('click', this.handleSearch);
        this.qsOptional<AppButton>('#reset-button')?.addEventListener('click', this.handleReset);
        // Listen for changes/inputs within the criteria container using event delegation
        this.criteriaContainer?.addEventListener('change', this.handleCriterionInputChange);
        this.criteriaContainer?.addEventListener('input', this.handleCriterionInputChange); // Add listener for input
        this.criteriaContainer?.addEventListener('click', this.handleCriterionRemoveClick);
        // Ensure custom event name matches the dispatch in tag-selector
        this.criteriaContainer?.addEventListener('tag-selection-change', this.handleTagSelectionChange);
    }

     private detachListeners(): void {
        this.qsOptional<AppButton>('#add-criterion-button')?.removeEventListener('click', this.handleAddCriterion);
        this.qsOptional<AppButton>('#search-button')?.removeEventListener('click', this.handleSearch);
        this.qsOptional<AppButton>('#reset-button')?.removeEventListener('click', this.handleReset);
        this.criteriaContainer?.removeEventListener('change', this.handleCriterionInputChange);
        this.criteriaContainer?.removeEventListener('input', this.handleCriterionInputChange); // Remove listener for input
        this.criteriaContainer?.removeEventListener('click', this.handleCriterionRemoveClick);
        this.criteriaContainer?.removeEventListener('tag-selection-change', this.handleTagSelectionChange);
    }

     // --- Event Handlers ---

    private handleAddCriterion = () => {
        if (!this._fields.length) return;
        this.criteria.push(this.createDefaultCriterion());
        this.isDirty = true; // Adding a criterion makes it dirty
        this.renderCriteria();
        this.updateResetButtonState();
    }

    private handleSearch = () => {
        const query = this.buildQuery();
        this.dispatchEvent(new CustomEvent('search', { detail: { query }, bubbles: true, composed: true }));
    }

    private handleReset = () => {
        this.resetCriteria();
        this.renderCriteria();
        this.handleSearch(); // Trigger search with empty criteria
    }

     // Delegate input/select/checkbox changes
     private handleCriterionInputChange = (event: Event) => {
         // Use composedPath to get the actual target inside shadow DOM
         const target = event.composedPath()[0] as HTMLElement;
         if (!target) return;

         const row = target.closest<HTMLElement>('.criterion-row');
         const key = row?.dataset.key;
         if (!key) return;

         // Ensure the event target has a 'name' attribute to identify the field
         const fieldName = target.getAttribute('name');
         if (!fieldName) return;

         // Only process events from specific input/select/checkbox elements within the row
         const validTargets = ['app-input', 'app-select', 'app-checkbox'];
         const tagName = target.tagName?.toLowerCase();
         if (!tagName || !validTargets.includes(tagName)) return;

         const criterionIndex = this.criteria.findIndex(c => c.key === key);
         if (criterionIndex === -1) return;

         let newValue: any;
         let inputType = 'text'; // Default input type
         if (target instanceof AppInput) { // Use instanceof check for AppInput
            inputType = (target as AppInput).type || 'text'; // Use AppInput's 'type' getter
         }

         // Check target type and get value/checked state
         switch (tagName) {
            case 'app-checkbox':
                newValue = (target as AppCheckbox).checked;
                break;
            case 'app-select':
                newValue = (target as AppSelect).value;
                // For selects, ignore change event if value is the empty placeholder
                if (event.type === 'change' && newValue === "") return;
                break;
            case 'app-input':
                 // For text-like inputs, update on 'input'. For others, update on 'change'.
                 if (event.type === 'input' && !['text', 'search', 'url', 'tel', 'email', 'password'].includes(inputType)) {
                    return; // Ignore intermediate 'input' events for non-text fields
                 }
                 newValue = (target as AppInput).value;
                break;
            default:
                return; // Should not happen
         }

        // console.log(`Updating criterion ${key}: field=${fieldName}, newValue=${newValue}, eventType=${event.type}`);
        this.updateCriterionState(criterionIndex, fieldName as keyof CriterionState, newValue);
     }

    private handleTagSelectionChange = (event: Event) => {
        const customEvent = event as CustomEvent;
        const target = event.composedPath()[0] as HTMLElement; // The tag-selector component
        if (!target || target.tagName?.toLowerCase() !== 'tag-selector') return;

        const row = target.closest<HTMLElement>('.criterion-row');
        const key = row?.dataset.key;
        // Ensure it's the value selector and not some other tag selector on the page
        if (!key || target.getAttribute('name') !== 'value') return;

        const criterionIndex = this.criteria.findIndex(c => c.key === key);
        if (criterionIndex === -1) return;

        const selectedIds = customEvent.detail.selectedIds as number[];
        this.updateCriterionState(criterionIndex, 'value', selectedIds);
    }

     private handleCriterionRemoveClick = (event: Event) => {
         const target = event.composedPath()[0] as HTMLElement; // Use composedPath
         const removeButton = target?.closest<AppButton>('app-button[data-action="remove"]');
         if (!removeButton) return;

         event.stopPropagation();

         const row = removeButton.closest<HTMLElement>('.criterion-row');
         const key = row?.dataset.key;
         if (!key) return;

         this.removeCriterion(key);
     }

    // --- State Management & Rendering ---

    private createDefaultCriterion(): CriterionState {
        const defaultField = this._fields[0];
        if (!defaultField) {
            // Handle case where no fields are defined (should ideally not happen)
            console.error("SearchBar: Cannot create default criterion, no fields defined.");
            // Return a dummy state or throw an error
            return { field: '', condition: 'EQ', value: '', not: false, key: `crit-error-${Date.now()}`, fieldType: 'text' };
        }
        const defaultType = defaultField.type || 'text';
        const defaultCondition = conditionsByType[defaultType]?.[0]?.value || 'EQ';
        let defaultValue: any = '';
        if (defaultType === 'boolean') defaultValue = true; // Default boolean to true
        if (defaultType === 'tags' || (defaultType === 'select' && defaultCondition === 'ANY_OF')) defaultValue = [];

        return {
            field: defaultField.value || '',
            condition: defaultCondition,
            value: defaultValue,
            not: false,
            key: `crit-${Date.now()}-${Math.random().toString(16).substring(2, 8)}`,
            fieldType: defaultType,
        };
    }

    private resetCriteria() {
         this.criteria = this._fields.length > 0 ? [this.createDefaultCriterion()] : [];
         this.isDirty = false;
         this.updateResetButtonState();
    }


     private removeCriterion(keyToRemove: string) {
         if (this.criteria.length > 1) {
             this.criteria = this.criteria.filter(c => c.key !== keyToRemove);
         } else {
             this.resetCriteria();
         }
          this.isDirty = true; // Removing always makes it dirty unless reset
         this.renderCriteria();
         this.updateResetButtonState();
     }


    private updateCriterionState(index: number, fieldName: keyof CriterionState, newValue: any): void {
        if (index < 0 || index >= this.criteria.length) return;

        const currentCriterion = this.criteria[index];
        // Check if criterion exists before proceeding
        if (!currentCriterion) {
            console.warn(`SearchBar: Criterion at index ${index} not found for update.`);
            return;
        }
        const currentCriterionJSON = JSON.stringify(currentCriterion[fieldName]);
        const newValueJSON = JSON.stringify(newValue);

        if (currentCriterionJSON === newValueJSON) {
            // console.log(`State for ${fieldName} already ${newValueJSON}, skipping update.`);
            return;
        }

        const updatedCriterion = { ...currentCriterion } as CriterionState;
        // Explicitly assert the type for the assignment
        (updatedCriterion as any)[fieldName] = newValue;

        let fieldTypeChanged = false;
        let conditionChanged = fieldName === 'condition';
        let reRenderValueInput = false;

        if (fieldName === 'field') {
            const newFieldName = String(newValue);
            const newFieldDef = this._fields.find(f => f.value === newFieldName);
            const newFieldType = newFieldDef?.type || 'text';

            if (updatedCriterion.fieldType !== newFieldType) {
                // console.log(`Field type changed from ${updatedCriterion.fieldType} to ${newFieldType}`);
                updatedCriterion.fieldType = newFieldType;
                // Reset condition to the first valid one for the new type
                updatedCriterion.condition = conditionsByType[newFieldType]?.[0]?.value || 'EQ';
                conditionChanged = true; // Condition definitely changed
                // Reset value based on new type/condition
                updatedCriterion.value = newFieldType === 'boolean' ? true :
                                  (newFieldType === 'tags' || (newFieldType === 'select' && updatedCriterion.condition === 'ANY_OF')) ? [] : '';
                fieldTypeChanged = true;
                reRenderValueInput = true; // Need to render a completely different input type
            }
        }

        // If condition changed (either directly or due to field type change)
        if (conditionChanged) {
            const newCondition = updatedCriterion.condition;
            // Reset value if condition changes expectation (e.g., from EQ to IS_NULL)
            const expectsValue = !(newCondition === 'IS_NULL' || newCondition === 'IS_NOT_NULL');
            if (!expectsValue) {
                updatedCriterion.value = ''; // Clear value for IS_NULL/IS_NOT_NULL
            } else if (updatedCriterion.fieldType === 'tags' || updatedCriterion.fieldType === 'select') {
                 // Handle array vs non-array for select/tags based on condition
                 const expectsArray = newCondition === 'ANY_OF' || newCondition === 'ALL_OF';
                 const currentValueIsArray = Array.isArray(updatedCriterion.value);
                 if (expectsArray && !currentValueIsArray) updatedCriterion.value = [];
                 if (!expectsArray && currentValueIsArray) updatedCriterion.value = ''; // Reset to single value (empty string)
                 // If the condition changed the input type (e.g., select EQ vs select ANY_OF)
                 if (!fieldTypeChanged && updatedCriterion.fieldType === 'select') {
                      reRenderValueInput = true; // Need to re-render value input for select EQ vs ANY_OF
                 }
            } else if (!expectsValue && updatedCriterion.value !== '') {
                // If condition switched to one not expecting value, clear it
                updatedCriterion.value = '';
            }
             // If condition changed, we might need to re-render value input if it was a boolean select before
             if (!fieldTypeChanged && !reRenderValueInput && updatedCriterion.fieldType === 'boolean') {
                 reRenderValueInput = true;
             }
        }


        this.criteria[index] = updatedCriterion;
        this.isDirty = true;
        this.updateResetButtonState();

        // Re-render the specific row that changed
        const rowElement = this.shadow.querySelector(`.criterion-row[data-key="${updatedCriterion.key}"]`);
        if (rowElement instanceof HTMLElement) {
           // If only the value changed for certain types, update just the input's value attribute/prop
           const shouldUpdateOnlyValue = !reRenderValueInput &&
                                        (fieldName === 'value' || fieldName === 'not') &&
                                        !['boolean', 'select', 'tags'].includes(updatedCriterion.fieldType);

           if (shouldUpdateOnlyValue) {
                const valueInput = rowElement.querySelector<HTMLElement & { value?: any, checked?: boolean }>(`[name="${fieldName}"]`);
                if (valueInput) {
                    if (fieldName === 'not' && valueInput instanceof AppCheckbox) valueInput.checked = newValue;
                    else if (fieldName === 'value' && (valueInput instanceof AppInput || valueInput instanceof AppSelect)) valueInput.value = newValue;
                } else {
                    this.renderCriteriaRow(updatedCriterion, rowElement); // Fallback if element not found
                }
           } else {
               // console.log("Re-rendering row for key:", updatedCriterion.key, "Reason:", { fieldTypeChanged, conditionChanged, reRenderValueInput });
               this.renderCriteriaRow(updatedCriterion, rowElement); // Re-render the whole row
           }
        } else {
            console.warn(`Could not find row element for key ${updatedCriterion.key} to update, forcing full render.`);
            this.renderCriteria(); // Fallback to full render if row isn't found
        }
    }

    private renderCriteria() {
        if (!this.criteriaContainer) return;

        const currentRows = Array.from(this.criteriaContainer.querySelectorAll<HTMLElement>('.criterion-row'));
        const currentKeys = new Set(currentRows.map(row => row.dataset.key));
        const desiredKeys = new Set(this.criteria.map(crit => crit.key));

        // Remove rows that are no longer needed
        currentRows.forEach(row => {
            if (!desiredKeys.has(row.dataset.key!)) {
                row.remove();
            }
        });

        // Add or update rows
        let lastRow: HTMLElement | null = null;
        this.criteria.forEach(criterion => {
            const existingRow = this.criteriaContainer!.querySelector<HTMLElement>(`.criterion-row[data-key="${criterion.key}"]`);
            const renderedRow = this.renderCriteriaRow(criterion, existingRow);

            // Ensure rows are in the correct order
            if (renderedRow && !existingRow) {
                if (lastRow) {
                    lastRow.insertAdjacentElement('afterend', renderedRow);
                } else {
                    this.criteriaContainer!.prepend(renderedRow);
                }
            }
            lastRow = renderedRow || lastRow; // Update lastRow reference
        });

        this.updateResetButtonState();
    }


    private renderCriteriaRow(criterion: CriterionState, existingRow?: HTMLElement | null): HTMLElement | null {
         const isNewRow = !existingRow;
         const row = existingRow instanceof HTMLElement ? existingRow : document.createElement('div');
         if (isNewRow) {
            row.className = 'criterion-row';
            row.dataset.key = criterion.key;
         }
         // Always clear content before re-populating
         row.innerHTML = '';

         const fieldDef = this._fields.find(f => f.value === criterion.field);
         const fieldType = criterion.fieldType; // Use stored type
         const conditions = conditionsByType[fieldType] || [];
         const trashIconStr = typeof icons.trash2 === 'function' ? icons.trash2() : icons.trash2 ?? 'X';
         const expectsValue = !(criterion.condition === 'IS_NULL' || criterion.condition === 'IS_NOT_NULL');

        // --- Field Selector ---
         const fieldDiv = this.createElement('div', { classes: 'field-selector' });
         fieldDiv.appendChild(this.createElement('app-label', { text: 'Field', attributes: { for: `field-${criterion.key}` }}));
         const fieldSelect = this.createElement('app-select', { attributes: { name: 'field', id: `field-${criterion.key}` } }) as AppSelect;
         // Use clearOptions and addOption for better control
         fieldSelect.clearOptions(); // Clear any previous options
         fieldSelect.addOption("", "Select Field..."); // Add placeholder
         this._fields.forEach(f => fieldSelect.addOption(f.value, f.label));
         fieldSelect.value = criterion.field; // Set current value AFTER adding options
         fieldDiv.appendChild(fieldSelect);
         row.appendChild(fieldDiv);

        // --- NOT Toggle ---
         const notDiv = this.createElement('div', { classes: 'not-toggle' });
         const notCheckbox = this.createElement('app-checkbox', { attributes: { name: 'not', id: `not-${criterion.key}` }}) as AppCheckbox;
         notCheckbox.checked = criterion.not; // Set checked state
         notDiv.appendChild(notCheckbox);
         notDiv.appendChild(this.createElement('app-label', { text: 'NOT', attributes: { for: `not-${criterion.key}` }}));
         row.appendChild(notDiv);

        // --- Condition Selector ---
         const conditionDiv = this.createElement('div', { classes: 'condition-selector' });
         conditionDiv.appendChild(this.createElement('app-label', { text: 'Condition', attributes: { for: `condition-${criterion.key}` }}));
         const conditionSelect = this.createElement('app-select', { attributes: { name: 'condition', id: `condition-${criterion.key}` }}) as AppSelect;
         // Use clearOptions and addOption
         conditionSelect.clearOptions();
         conditions.forEach(c => conditionSelect.addOption(c.value, c.label));
         conditionSelect.value = criterion.condition; // Set current value AFTER adding options
         conditionDiv.appendChild(conditionSelect);
         row.appendChild(conditionDiv);

        // --- Value Input ---
         const valueDiv = this.createElement('div', { classes: 'value-input' });
         // Only show value input if the condition expects one
         if (expectsValue) {
             valueDiv.appendChild(this.createElement('app-label', { text: 'Value', attributes: { for: `value-${criterion.key}` }}));
             let valueInput: HTMLElement;
             const expectsArrayValue = criterion.condition === 'ANY_OF' || criterion.condition === 'ALL_OF';

             if (fieldType === 'boolean') {
                 const boolSelect = this.createElement('app-select', { attributes: { name: 'value', id: `value-${criterion.key}` }}) as AppSelect;
                 boolSelect.clearOptions(); // Clear previous
                 boolSelect.addOption('true', 'True');
                 boolSelect.addOption('false', 'False');
                 boolSelect.value = String(criterion.value ?? true); // Set current value AFTER adding options
                 valueInput = boolSelect;
             } else if (fieldType === 'select' && !expectsArrayValue) {
                 const singleSelect = this.createElement('app-select', { attributes: { name: 'value', id: `value-${criterion.key}`, placeholder: 'Select value...' }}) as AppSelect;
                 singleSelect.clearOptions(); // Clear previous
                 // Ensure placeholder is added correctly if needed
                 singleSelect.addOption("", "Select value...");
                 (fieldDef?.options || []).forEach(opt => singleSelect.addOption(String(opt.value), opt.label));
                 singleSelect.value = String(criterion.value ?? ''); // Set current value AFTER adding options
                 valueInput = singleSelect;
             } else if (fieldType === 'select' && expectsArrayValue) {
                  // **FIX:** Use TagSelector for multi-select of predefined options
                  const multiSelect = this.createElement('tag-selector') as TagSelector;
                  multiSelect.setAttribute('name', 'value');
                  multiSelect.setAttribute('id', `value-${criterion.key}`);
                  // Provide the options from fieldDef to the tag selector
                  // Assuming TagSelector can accept available tags/options programmatically
                  multiSelect.availableTags = (fieldDef?.options || []).map(opt => ({
                        tagId: typeof opt.value === 'number' ? opt.value : Number(opt.value), // Needs ID
                        name: opt.label,
                        // description: '', // Optional description
                    }));
                  multiSelect.selectedTagIds = Array.isArray(criterion.value) ? criterion.value as number[] : []; // Set current value
                  valueInput = multiSelect;
             }
              else if (fieldType === 'tags') {
                 const tagSelector = this.createElement('tag-selector') as TagSelector;
                 tagSelector.setAttribute('name', 'value');
                 tagSelector.setAttribute('id', `value-${criterion.key}`);
                 // TagSelector fetches its own available tags usually, or they can be set
                 tagSelector.selectedTagIds = Array.isArray(criterion.value) ? criterion.value as number[] : []; // Set current value
                 valueInput = tagSelector;
             } else { // text, number, date
                 const input = this.createElement('app-input', { attributes: {
                     name: 'value',
                     id: `value-${criterion.key}`,
                     // Use correct type for AppInput's internal input
                     type: fieldType === 'number' ? 'number' : fieldType === 'date' ? 'date' : 'text',
                     placeholder: 'Enter value...'
                 }}) as AppInput;
                 const displayValue = Array.isArray(criterion.value) ? criterion.value.join(', ') : String(criterion.value ?? '');
                 input.value = displayValue; // Set current value
                 valueInput = input;
             }
             valueDiv.appendChild(valueInput);
         } else {
            // Add empty div as placeholder to maintain grid structure
             valueDiv.appendChild(document.createElement('div'));
         }
         row.appendChild(valueDiv);

        // --- Remove Button ---
         const removeDiv = this.createElement('div', { classes: 'remove-button' });
         const removeButton = this.createElement('app-button', {
             attributes: {
                 variant: 'ghost', size: 'icon', 'aria-label': 'Remove filter criterion',
                 title: 'Remove criterion', 'data-action': 'remove'
             },
             classes: 'text-muted'
         }) as AppButton;
          if (this.criteria.length <= 1) removeButton.disabled = true;
         removeButton.innerHTML = trashIconStr;
         removeDiv.appendChild(removeButton);
         row.appendChild(removeDiv);

        // Append the new row only if it wasn't an existing one
         if (isNewRow && this.criteriaContainer) {
            this.criteriaContainer.appendChild(row);
         }
        return row; // Return the row (new or updated)
    }


     private updateResetButtonState() {
        const showReset = this.getBoolAttribute('show-reset-button');
        const resetButton = this.qsOptional<AppButton>('#reset-button');
        if (resetButton) {
             resetButton.disabled = !showReset || !this.isDirty || this.getBoolAttribute('loading');
        }
     }

    // --- Query Building ---

    private buildQuery(): SearchQuery {
        return this.criteria.map(crit => {
           const fieldDef = this._fields.find(f => f.value === crit.field);
           if (!crit.field || !crit.condition || !fieldDef) {
                console.warn("SearchBar: Skipping incomplete or invalid criterion:", crit);
                return null;
           }

           let parsedValue: any = crit.value;
           let isValid = true;
           const expectsValue = !(crit.condition === 'IS_NULL' || crit.condition === 'IS_NOT_NULL');

           if (!expectsValue) {
                parsedValue = null; // Value should be null for these conditions
           } else { // Only parse/validate if value is expected
               switch (fieldDef.type) {
                    case 'number':
                        if (typeof parsedValue === 'string' && parsedValue.trim() === '') isValid = false;
                        else {
                            const num = Number(parsedValue);
                            if (isNaN(num)) isValid = false;
                            else parsedValue = num;
                        }
                        break;
                    case 'boolean':
                         parsedValue = String(parsedValue).toLowerCase() === 'true';
                         break;
                     case 'tags':
                     case 'select': // Handle tags and select ANY_OF/ALL_OF together
                         const expectsArray = crit.condition === 'ANY_OF' || crit.condition === 'ALL_OF';
                         if (expectsArray) {
                             if (!Array.isArray(parsedValue) || parsedValue.length === 0) isValid = false;
                             else { // Ensure values are numbers if possible (for tag IDs, potentially select values)
                                 parsedValue = parsedValue.map(v => /^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : v).filter(v => v !== '');
                                 if(parsedValue.length === 0) isValid = false;
                             }
                         } else { // EQ condition for select
                             if (String(parsedValue ?? '').trim() === '') isValid = false;
                             else if (/^\d+(\.\d+)?$/.test(String(parsedValue))) parsedValue = Number(parsedValue); // Convert numeric strings to numbers
                         }
                         break;
                    case 'text':
                    case 'date':
                         if (String(parsedValue ?? '').trim() === '') isValid = false;
                        break;
               }
            }


           if (!isValid) {
                console.warn(`SearchBar: Skipping criterion due to invalid/empty value for condition ${crit.condition}:`, crit);
                return null;
           }

           return {
               field: crit.field!,
               condition: crit.condition!,
               value: parsedValue,
               not: crit.not || false,
           } as SearchQueryElement;

       }).filter((c): c is SearchQueryElement => c !== null);
    }

    /** Public method to reset criteria externally */
    public reset() {
        this.handleReset();
    }

}

// Define the component unless already defined
if (!customElements.get('search-bar')) {
    customElements.define('search-bar', SearchBar);
}