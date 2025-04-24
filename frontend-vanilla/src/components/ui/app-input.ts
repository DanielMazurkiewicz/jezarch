import { BaseComponent } from '../base-component';

export class AppInput extends BaseComponent {
    static get observedAttributes() {
        return ['type', 'value', 'placeholder', 'disabled', 'required', 'name', 'aria-invalid', 'aria-label', 'minlength', 'maxlength', 'pattern', 'step', 'min', 'max'];
    }

    // Make internal input accessible for specific use cases (like password toggle)
    public inputElement: HTMLInputElement | null = null;

    protected get styles(): string {
        return `
            :host {
                display: block; /* Changed to block by default */
                width: 100%; /* Default to full width */
            }
            /* NEW: Wrapper for suffix/prefix */
            .input-wrapper {
                display: flex;
                align-items: center; /* Vertically center suffix/prefix */
                width: 100%;
                height: 2.25rem; /* h-9 */
                border-radius: var(--radius, 0.5rem);
                border: 1px solid var(--color-input-border, #cbd5e0);
                background-color: var(--color-input-bg, white);
                box-shadow: var(--shadow-sm);
                transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                outline: none; /* Outline handled on focus */
                box-sizing: border-box;
            }
            input {
                flex-grow: 1; /* Input takes remaining space */
                height: 100%; /* Fill wrapper height */
                min-width: 0;
                border: none; /* Remove border from input itself */
                background-color: transparent; /* Inherit wrapper background */
                padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
                font-size: 0.875rem; /* text-sm */
                line-height: 1.25rem;
                color: var(--color-foreground, #1a202c);
                outline: none; /* Remove input outline */
                box-shadow: none; /* Remove input shadow */
                 /* Adjust border-radius for first/last child */
                border-top-left-radius: var(--radius, 0.5rem);
                border-bottom-left-radius: var(--radius, 0.5rem);
                border-top-right-radius: var(--radius, 0.5rem);
                border-bottom-right-radius: var(--radius, 0.5rem);
            }
            input::placeholder {
                color: var(--color-muted-foreground, #718096);
                opacity: 1;
            }
            input:disabled {
                cursor: not-allowed;
                /* Opacity handled by host */
            }
            /* Focus styling on the wrapper */
             .input-wrapper:focus-within {
                 border-color: var(--color-ring, #3182ce);
                 box-shadow: 0 0 0 3px hsla(from var(--color-ring) h s l / 0.5);
             }
             /* Invalid styling on the wrapper */
             .input-wrapper[data-invalid="true"] {
                  border-color: var(--color-destructive, #e53e3e);
                  box-shadow: 0 0 0 3px hsla(from var(--color-destructive) h s l / 0.2);
             }
             /* Disabled styling on the host */
            :host([disabled]) .input-wrapper {
                 cursor: not-allowed;
                 opacity: 0.5;
             }
             /* Styling for slots */
            ::slotted([slot="prefix"]), ::slotted([slot="suffix"]) {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                color: var(--color-muted-foreground);
            }
            ::slotted([slot="prefix"]) {
                padding-left: var(--spacing-3);
                padding-right: var(--spacing-1); /* Small gap */
            }
            ::slotted([slot="suffix"]) {
                padding-right: var(--spacing-3);
                padding-left: var(--spacing-1); /* Small gap */
            }
            /* Adjust input padding/radius when slots are present */
            :host(:has(slot[name="prefix"])) input {
                 padding-left: var(--spacing-1);
                 border-top-left-radius: 0;
                 border-bottom-left-radius: 0;
            }
            :host(:has(slot[name="suffix"])) input {
                 padding-right: var(--spacing-1);
                 border-top-right-radius: 0;
                 border-bottom-right-radius: 0;
            }
        `;
    }

    protected get template(): string {
        // Wrap input with slots
        return `
            <div class="input-wrapper">
                <slot name="prefix"></slot>
                <input />
                <slot name="suffix"></slot>
            </div>
        `;
    }

    connectedCallback() {
        super.connectedCallback(); // Sets up shadow DOM and styles
        this.inputElement = this.shadow.querySelector('input');
        this.updateInputAttributes();
        this.attachInputListeners();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeInputListeners();
    }

    attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        // No need for super call
        if (this.inputElement) {
            this.updateInputAttributes();
        }
        // Update wrapper state for invalid styling
        if (name === 'aria-invalid') {
             const wrapper = this.shadowRoot?.querySelector('.input-wrapper');
             wrapper?.setAttribute('data-invalid', String(newValue === 'true'));
        }
    }

    private attachInputListeners(): void {
        if (!this.inputElement) return;
        // Forward common input events
        this.inputElement.addEventListener('input', this.handleInput);
        this.inputElement.addEventListener('change', this.handleChange);
        this.inputElement.addEventListener('blur', this.handleBlur);
        this.inputElement.addEventListener('focus', this.handleFocus);
    }

    private removeInputListeners(): void {
         if (!this.inputElement) return;
         this.inputElement.removeEventListener('input', this.handleInput);
         this.inputElement.removeEventListener('change', this.handleChange);
         this.inputElement.removeEventListener('blur', this.handleBlur);
         this.inputElement.removeEventListener('focus', this.handleFocus);
    }

    private handleInput = (event: Event): void => {
        this.setAttribute('value', (event.target as HTMLInputElement).value);
        this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
    private handleChange = (event: Event): void => {
        this.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    }
     private handleBlur = (event: FocusEvent): void => {
         this.dispatchEvent(new FocusEvent('blur', { bubbles: true, composed: true }));
     }
      private handleFocus = (event: FocusEvent): void => {
          this.dispatchEvent(new FocusEvent('focus', { bubbles: true, composed: true }));
      }


    private updateInputAttributes(): void {
        if (!this.inputElement) return;

        // Get all relevant attributes
        const type = this.getAttribute('type') || 'text';
        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.getBoolAttribute('disabled');
        const required = this.getBoolAttribute('required');
        const name = this.getAttribute('name') || '';
        const ariaInvalid = this.getAttribute('aria-invalid');
        const ariaLabel = this.getAttribute('aria-label');
        const minlength = this.getAttribute('minlength');
        const maxlength = this.getAttribute('maxlength');
        const pattern = this.getAttribute('pattern');
        const step = this.getAttribute('step');
        const min = this.getAttribute('min');
        const max = this.getAttribute('max');


        this.inputElement.type = type;
        if (this.inputElement.value !== value) {
            this.inputElement.value = value;
        }
        this.inputElement.placeholder = placeholder;
        this.inputElement.disabled = disabled;
        this.inputElement.required = required;
        this.inputElement.name = name;
        if (ariaInvalid) this.inputElement.setAttribute('aria-invalid', ariaInvalid); else this.inputElement.removeAttribute('aria-invalid');
        if (ariaLabel) this.inputElement.setAttribute('aria-label', ariaLabel); else this.inputElement.removeAttribute('aria-label');

        // Set optional attributes only if they exist
        if (minlength !== null) this.inputElement.minLength = parseInt(minlength, 10); else this.inputElement.removeAttribute('minlength');
        if (maxlength !== null) this.inputElement.maxLength = parseInt(maxlength, 10); else this.inputElement.removeAttribute('maxlength');
        if (pattern !== null) this.inputElement.pattern = pattern; else this.inputElement.removeAttribute('pattern');
        if (step !== null) this.inputElement.step = step; else this.inputElement.removeAttribute('step');
        if (min !== null) this.inputElement.min = min; else this.inputElement.removeAttribute('min');
        if (max !== null) this.inputElement.max = max; else this.inputElement.removeAttribute('max');

        // Update wrapper invalid state
        const wrapper = this.shadowRoot?.querySelector('.input-wrapper');
        wrapper?.setAttribute('data-invalid', String(ariaInvalid === 'true'));
    }

    // --- Public Properties/Methods ---
    get value(): string {
        return this.inputElement?.value || '';
    }
    set value(newValue: string) {
        this.setAttribute('value', newValue);
    }

    get type(): string { // Expose type getter/setter
        return this.inputElement?.type || 'text';
    }
    set type(newType: string) {
        this.setAttribute('type', newType);
    }

    get name(): string {
        return this.inputElement?.name || '';
    }

    get disabled(): boolean { // Expose disabled getter/setter
        return this.inputElement?.disabled ?? false;
    }
    set disabled(isDisabled: boolean) {
        this.toggleAttribute('disabled', isDisabled);
    }

    focus(options?: FocusOptions): void {
        this.inputElement?.focus(options);
    }

    blur(): void {
        this.inputElement?.blur();
    }
}

// Define the component unless already defined
if (!customElements.get('app-input')) {
    customElements.define('app-input', AppInput);
}