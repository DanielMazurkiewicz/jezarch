import { BaseComponent } from '../base-component';

export class AppTextarea extends BaseComponent {
    static get observedAttributes() {
        return ['value', 'placeholder', 'disabled', 'required', 'name', 'rows', 'aria-invalid', 'aria-label'];
    }

    private textareaElement: HTMLTextAreaElement | null = null;

    protected get styles(): string {
        return `
            :host {
                display: block; /* Textareas are usually block level */
                width: 100%;
            }
            textarea {
                display: flex;
                width: 100%; /* Ensure internal textarea fills host */
                min-height: 4rem; /* min-h-16 */
                border-radius: var(--radius, 0.5rem);
                border: 1px solid var(--color-input-border, #cbd5e0);
                background-color: var(--color-input-bg, white);
                padding: var(--spacing-2, 0.5rem) var(--spacing-3, 0.75rem);
                font-size: 0.875rem; /* text-sm */
                line-height: 1.25rem;
                color: var(--color-foreground, #1a202c);
                box-shadow: var(--shadow-sm);
                transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                outline: none;
                resize: vertical; /* Allow vertical resize */
                box-sizing: border-box; /* Include padding/border in size */
            }
            textarea::placeholder {
                color: var(--color-muted-foreground, #718096);
                opacity: 1;
            }
            textarea:disabled {
                cursor: not-allowed;
                opacity: 0.5;
            }
            textarea:focus-visible {
                border-color: var(--color-ring, #3182ce);
                box-shadow: 0 0 0 3px hsla(from var(--color-ring) h s l / 0.5);
            }
            /* Basic invalid styling */
            textarea[aria-invalid="true"] {
                 border-color: var(--color-destructive, #e53e3e);
                 box-shadow: 0 0 0 3px hsla(from var(--color-destructive) h s l / 0.2);
            }
        `;
    }

    protected get template(): string {
        return `<textarea></textarea>`;
    }

     connectedCallback() {
        super.connectedCallback();
        this.textareaElement = this.shadow.querySelector('textarea');
        this.updateTextareaAttributes();
        this.attachTextareaListeners();
    }

     disconnectedCallback() {
        super.disconnectedCallback();
        this.removeTextareaListeners();
    }

     attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        if (this.textareaElement) {
            this.updateTextareaAttributes();
        }
    }

    private attachTextareaListeners(): void {
        if (!this.textareaElement) return;
        this.textareaElement.addEventListener('input', this.handleInput);
        this.textareaElement.addEventListener('change', this.handleChange);
        this.textareaElement.addEventListener('blur', this.handleBlur);
        this.textareaElement.addEventListener('focus', this.handleFocus);
    }

    private removeTextareaListeners(): void {
         if (!this.textareaElement) return;
         this.textareaElement.removeEventListener('input', this.handleInput);
         this.textareaElement.removeEventListener('change', this.handleChange);
         this.textareaElement.removeEventListener('blur', this.handleBlur);
         this.textareaElement.removeEventListener('focus', this.handleFocus);
    }

    private handleInput = (event: Event): void => {
        // Reflect value change to attribute for consistency
        this.setAttribute('value', (event.target as HTMLTextAreaElement).value);
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


    private updateTextareaAttributes(): void {
        if (!this.textareaElement) return;

        const value = this.getAttribute('value') || '';
        const placeholder = this.getAttribute('placeholder') || '';
        const disabled = this.getBoolAttribute('disabled');
        const required = this.getBoolAttribute('required');
        const name = this.getAttribute('name') || '';
        const rows = this.getNumAttribute('rows') || 3; // Default rows
        const ariaInvalid = this.getAttribute('aria-invalid');
        const ariaLabel = this.getAttribute('aria-label');

        // Only set value if it differs
        if (this.textareaElement.value !== value) {
            this.textareaElement.value = value;
        }
        this.textareaElement.placeholder = placeholder;
        this.textareaElement.disabled = disabled;
        this.textareaElement.required = required;
        this.textareaElement.name = name;
        this.textareaElement.rows = rows;
        if (ariaInvalid) this.textareaElement.setAttribute('aria-invalid', ariaInvalid); else this.textareaElement.removeAttribute('aria-invalid');
        if (ariaLabel) this.textareaElement.setAttribute('aria-label', ariaLabel); else this.textareaElement.removeAttribute('aria-label');
    }

    // --- Public Properties/Methods ---
    get value(): string {
        return this.textareaElement?.value || '';
    }
    set value(newValue: string) {
        // Update attribute first, which triggers updateTextareaAttributes
        this.setAttribute('value', newValue);
    }

     get name(): string {
        return this.textareaElement?.name || '';
    }

    focus(options?: FocusOptions): void {
        this.textareaElement?.focus(options);
    }

    blur(): void {
        this.textareaElement?.blur();
    }
}

// Define the component unless already defined
if (!customElements.get('app-textarea')) {
    customElements.define('app-textarea', AppTextarea);
}
