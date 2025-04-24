import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

export class AppSelect extends BaseComponent {
    static get observedAttributes() {
        return ['value', 'placeholder', 'disabled', 'required', 'name', 'aria-invalid', 'aria-label'];
    }

    private selectElement: HTMLSelectElement | null = null;
    private _optionsAdded: boolean = false; // Flag to track if options have been added/processed

    protected get styles(): string {
        return `
            :host {
                display: inline-block; /* Or block depending on usage */
                position: relative; /* For positioning the arrow */
                width: 100%; /* Default to full width */
            }
            select {
                appearance: none; /* Remove default arrow */
                -webkit-appearance: none;
                -moz-appearance: none;
                display: flex;
                width: 100%;
                height: 2.25rem; /* h-9 */
                border-radius: var(--radius, 0.5rem);
                border: 1px solid var(--color-input-border, #cbd5e0);
                background-color: var(--color-input-bg, white);
                padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
                padding-right: 2.5rem; /* Space for custom arrow */
                font-size: 0.875rem; /* text-sm */
                line-height: 1.25rem;
                color: var(--color-foreground, #1a202c);
                box-shadow: var(--shadow-sm);
                transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                outline: none;
                cursor: pointer;
                /* Use initial color for placeholder */
                color: var(--color-muted-foreground, #718096);
            }
            /* Style when a non-placeholder option is selected */
            select:not(:required:invalid) {
                color: var(--color-foreground, #1a202c);
            }
            select:required:invalid { /* Style placeholder state */
                color: var(--color-muted-foreground, #718096);
            }
            option[value=""][disabled] {
                 display: none; /* Hide the placeholder option in dropdown */
            }
            option {
                 color: var(--color-foreground); /* Ensure options have text color */
                 background-color: var(--color-background); /* Match background */
            }

            select:disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }
            select:focus-visible {
                border-color: var(--color-ring, #3182ce);
                box-shadow: 0 0 0 3px hsla(from var(--color-ring) h s l / 0.5);
            }
            /* Basic invalid styling */
            select[aria-invalid="true"] {
                 border-color: var(--color-destructive, #e53e3e);
                 box-shadow: 0 0 0 3px hsla(from var(--color-destructive) h s l / 0.2);
            }
            .arrow-icon {
                position: absolute;
                right: var(--spacing-3, 0.75rem);
                top: 50%;
                transform: translateY(-50%);
                pointer-events: none; /* Don't interfere with select click */
                width: 1rem; /* w-4 */
                height: 1rem; /* h-4 */
                color: var(--color-muted-foreground);
                opacity: 0.5;
            }
             select:disabled + .arrow-icon {
                 opacity: 0.2;
             }
        `;
    }

    protected get template(): string {
        // Use a slot to allow passing <option> elements
        const placeholder = this.getAttribute('placeholder');
        const chevronDownIcon = icons.chevronDown ?? ''; // Provide fallback
        // Add required attribute to select if placeholder exists to enable :invalid styling
        return `
            <select ${placeholder ? 'required' : ''}>
                ${placeholder ? `<option value="" disabled selected hidden>${placeholder}</option>` : ''}
                <slot></slot>
            </select>
            <span class="arrow-icon">${chevronDownIcon}</span>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        this.selectElement = this.shadow.querySelector('select');
        this.updateSelectAttributes();
        this.attachSelectListeners();
        // Initial placeholder color state check
        this.updatePlaceholderVisualState();
        // Process initial slotted options
        this.processSlottedOptions();
    }

     disconnectedCallback() {
        super.disconnectedCallback();
        this.removeSelectListeners();
    }

     attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        if (this.selectElement) {
            this.updateSelectAttributes();
             if (name === 'value') {
                 this.updatePlaceholderVisualState();
             }
        }
         // Re-render if placeholder changes to update the default option
         if (name === 'placeholder' && oldValue !== newValue && this.isConnected) {
             this.render();
             this.selectElement = this.shadow.querySelector('select'); // Re-query
             this.updateSelectAttributes();
             this.attachSelectListeners();
             this.updatePlaceholderVisualState();
         }
    }

    private attachSelectListeners(): void {
        if (!this.selectElement) return;
        this.selectElement.addEventListener('change', this.handleChange);
        this.selectElement.addEventListener('blur', this.handleBlur);
        this.selectElement.addEventListener('focus', this.handleFocus);
        this.shadow.querySelector('slot')?.addEventListener('slotchange', this.handleSlotChange);
    }

     private removeSelectListeners(): void {
        if (!this.selectElement) return;
        this.selectElement.removeEventListener('change', this.handleChange);
        this.selectElement.removeEventListener('blur', this.handleBlur);
        this.selectElement.removeEventListener('focus', this.handleFocus);
        this.shadow.querySelector('slot')?.removeEventListener('slotchange', this.handleSlotChange);
    }

    private handleSlotChange = () => {
        // console.log(`${this.tagName} slotchange triggered`);
        this.processSlottedOptions();
        // Re-apply value after options are potentially updated
        this.updateSelectAttributes();
        this.updatePlaceholderVisualState();
    }

     private processSlottedOptions() {
        if (!this.selectElement) return;
        const slot = this.shadow.querySelector('slot');
        if (!slot) return;

        const assignedNodes = slot.assignedNodes({ flatten: true });
        // Move slotted options into the select element directly
        // This makes them part of the select's children, simplifying selection logic
        assignedNodes.forEach(node => {
             if (node instanceof HTMLOptionElement || node instanceof HTMLOptGroupElement) {
                this.selectElement?.appendChild(node);
             }
         });
         this._optionsAdded = true; // Mark options as processed
    }

    private handleChange = (event: Event): void => {
        const newValue = (event.target as HTMLSelectElement).value;
        // Check if the selected value is the placeholder value
        if (this.getAttribute('placeholder') && newValue === "") {
             // Don't set the attribute value to empty string if placeholder selected
             // Let the :invalid CSS handle the visual state
             // console.log(`${this.tagName} changed to placeholder, not updating value attribute`);
        } else {
            this.setAttribute('value', newValue); // Reflect change to attribute
        }
        this.updatePlaceholderVisualState(); // Update visual state based on selection
        this.dispatchEvent(new CustomEvent('change', {
            detail: { value: newValue },
            bubbles: true,
            composed: true
        }));
    }
    private handleBlur = (event: FocusEvent): void => {
        this.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));
    }
     private handleFocus = (event: FocusEvent): void => {
         this.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
     }

    // Update visual state (color) based on whether placeholder is selected
    private updatePlaceholderVisualState(): void {
        if (this.selectElement) {
            // Check if the placeholder option exists and is selected
            const isPlaceholderSelected = !!this.getAttribute('placeholder') && this.selectElement.value === "";
            // CSS now handles this via :required:invalid
            // this.selectElement.style.color = isPlaceholderSelected
            //     ? 'var(--color-muted-foreground, #718096)'
            //     : 'var(--color-foreground, #1a202c)';
        }
    }


    private updateSelectAttributes(): void {
        if (!this.selectElement) return;

        const value = this.getAttribute('value'); // Can be null
        const disabled = this.getBoolAttribute('disabled');
        const required = this.getBoolAttribute('required');
        const name = this.getAttribute('name') || '';
        const ariaInvalid = this.getAttribute('aria-invalid');
        const ariaLabel = this.getAttribute('aria-label');
        const placeholder = this.getAttribute('placeholder');

        // Update native select attributes
        this.selectElement.disabled = disabled;
        this.selectElement.required = required || !!placeholder; // If placeholder exists, treat as required for styling
        this.selectElement.name = name;
        if (ariaInvalid) this.selectElement.setAttribute('aria-invalid', ariaInvalid); else this.selectElement.removeAttribute('aria-invalid');
        if (ariaLabel) this.selectElement.setAttribute('aria-label', ariaLabel); else this.selectElement.removeAttribute('aria-label');

        // Set value: Ensure options are available before setting value
        // Use requestAnimationFrame to defer setting value slightly, allowing options to render
        requestAnimationFrame(() => {
             if (this.selectElement) { // Check again inside rAF
                 // Ensure the placeholder option exists if needed
                 const firstOption = this.selectElement.options[0];
                 if (placeholder && (!firstOption || firstOption.value !== "" || !firstOption.disabled)) {
                    // console.warn(`${this.tagName}: Placeholder specified but missing/incorrect placeholder option. Re-rendering might be needed.`);
                    // We added placeholder in template, so this shouldn't be necessary often
                 }

                // If value attribute is set and different from current select value
                if (value !== null && this.selectElement.value !== value) {
                     // console.log(`${this.tagName}: Setting select value to attribute: ${value}`);
                     this.selectElement.value = value;
                      // Verify if the value was actually set (option exists)
                     if (this.selectElement.value !== value) {
                        // console.warn(`${this.tagName}: Attempted to set value "${value}", but no matching option exists.`);
                         // If setting the value failed (no matching option), select placeholder if available
                         if (placeholder && this.selectElement.options[0]?.value === "") {
                             this.selectElement.selectedIndex = 0;
                         }
                     }
                }
                // If value attribute is null/undefined, select placeholder (if exists) or first option
                else if (value === null || value === undefined) {
                     if (placeholder && this.selectElement.options[0]?.value === "") {
                        // console.log(`${this.tagName}: Value attribute is null, selecting placeholder.`);
                         this.selectElement.selectedIndex = 0;
                     } else if (this.selectElement.options.length > 0) {
                        // console.log(`${this.tagName}: Value attribute is null, selecting first option.`);
                        this.selectElement.selectedIndex = 0; // Select first available option
                     }
                }
                // Final visual state check after setting value
                this.updatePlaceholderVisualState();
             }
        });
    }

    // --- Public Properties/Methods ---
    get value(): string {
        // Return the select element's value directly if available, otherwise attribute
        return this.selectElement?.value ?? this.getAttribute('value') ?? '';
    }
    set value(newValue: string) {
         this.setAttribute('value', newValue); // Setting attribute triggers update logic
    }

    get selectedIndex(): number {
        return this.selectElement?.selectedIndex ?? -1;
    }
    set selectedIndex(index: number) {
        if (this.selectElement && index >= 0 && index < this.selectElement.options.length) {
            this.selectElement.selectedIndex = index;
            this.setAttribute('value', this.selectElement.value); // Update attribute
            this.updatePlaceholderVisualState(); // Update visuals
        }
    }

    get name(): string {
        return this.selectElement?.name || '';
    }

    focus(options?: FocusOptions): void {
        this.selectElement?.focus(options);
    }

    blur(): void {
        this.selectElement?.blur();
    }

     // Method to dynamically add options
     addOption(value: string, text: string): void {
        if (this.selectElement) {
             const option = document.createElement('option');
             option.value = value;
             option.textContent = text;
             this.selectElement.appendChild(option);
             // If this is the first *real* option added after placeholder,
             // and no value is set, we might need to re-evaluate selection.
             if (this.selectElement.options.length === (this.getAttribute('placeholder') ? 2 : 1)) {
                this.updateSelectAttributes(); // Re-evaluate value/selection
             }
        }
     }

     // Method to clear options (keeping placeholder if it exists)
     clearOptions(): void {
         if (!this.selectElement) return;
         const placeholderOption = this.getAttribute('placeholder') ? this.selectElement.options[0] : null;
         this.selectElement.innerHTML = ''; // Clear all
         if (placeholderOption) {
             this.selectElement.appendChild(placeholderOption.cloneNode(true)); // Re-add placeholder
             this.selectElement.selectedIndex = 0;
         }
         this.value = ''; // Reset value
     }
}

// Define the component unless already defined
if (!customElements.get('app-select')) {
    customElements.define('app-select', AppSelect);
}
