import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

export class AppCheckbox extends BaseComponent {
    static get observedAttributes() {
        return ['checked', 'disabled', 'required', 'name', 'value', 'aria-invalid', 'aria-label'];
    }

    // Reference to the internal input element
    public inputElement: HTMLInputElement | null = null;
    private wrapperElement: HTMLElement | null = null;

    // Bind method in constructor
    constructor() {
        super();
        this.handleChange = this.handleChange.bind(this);
        // REMOVED: No longer binding handleHostClick
    }

    get checked(): boolean {
        return this.hasAttribute('checked');
    }
    set checked(isChecked: boolean) {
        this.toggleAttribute('checked', isChecked);
        // Also update the internal input's checked state
        if (this.inputElement) this.inputElement.checked = isChecked;
    }

     get value(): string {
        return this.getAttribute('value') || 'on'; // Default checkbox value
    }
    set value(newValue: string) {
        this.setAttribute('value', newValue);
    }

    // Use disabled getter/setter to manage attribute and internal element
    get disabled(): boolean {
        return this.hasAttribute('disabled');
    }
    set disabled(isDisabled: boolean) {
        this.toggleAttribute('disabled', isDisabled);
        // Also update the internal input's disabled state
        if (this.inputElement) this.inputElement.disabled = isDisabled;
    }

    protected get styles(): string {
        return `
            :host {
                display: inline-flex; /* Align with labels easily */
                align-items: center;
                gap: var(--spacing-2, 0.5rem);
                /* Apply cursor to host for better feedback */
                cursor: pointer;
                user-select: none;
                /* Ensure host is positioned for absolute child */
                position: relative;
            }
            :host([disabled]) {
                cursor: not-allowed;
                opacity: 0.5;
            }
            /* Wrapper is the visible box */
            .checkbox-wrapper {
                position: relative; /* Needed for positioning checkmark */
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 1rem; /* w-4 */
                height: 1rem; /* h-4 */
                flex-shrink: 0;
                border-radius: 4px; /* Custom rounding */
                border: 1px solid var(--color-input-border, #cbd5e0);
                background-color: var(--color-input-bg, white);
                box-shadow: var(--shadow-sm);
                transition: all 150ms ease-out;
            }
            /* Hidden native checkbox - stretched over the wrapper */
            input[type="checkbox"] {
                position: absolute;
                top: 0;
                left: 0;
                opacity: 0;
                width: 100%; /* Cover the host/wrapper dimensions */
                height: 100%; /* Cover the host/wrapper dimensions */
                /* Apply cursor to the input itself */
                cursor: pointer;
                margin: 0;
                padding: 0; /* Reset padding */
                z-index: 1; /* Ensure it's clickable above wrapper */
            }
             input[type="checkbox"]:disabled {
                 cursor: not-allowed;
             }

            /* Custom checkmark inside the wrapper */
            .checkmark {
                position: absolute; /* Position relative to wrapper */
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                display: none; /* Hidden by default */
                color: var(--color-primary-foreground, white);
                width: 0.875rem; /* size-3.5 */
                height: 0.875rem;
                pointer-events: none; /* Non-interactive */
            }
            .checkmark svg {
                display: block; /* Remove small space below */
                width: 100%;
                height: 100%;
            }


            /* Checked state styling (on host) */
            :host([checked]) .checkbox-wrapper {
                background-color: var(--color-primary, #2b6cb0);
                border-color: var(--color-primary, #2b6cb0);
            }
            :host([checked]) .checkmark {
                display: block;
            }

            /* Focus state (on host via internal input) */
             :host(:focus-within) .checkbox-wrapper {
                outline: 2px solid transparent;
                outline-offset: 2px;
                box-shadow: 0 0 0 3px hsla(from var(--color-ring) h s l / 0.5);
            }

             /* Invalid state (on host) */
            :host([aria-invalid="true"]) .checkbox-wrapper {
                 border-color: var(--color-destructive, #e53e3e);
                 box-shadow: 0 0 0 3px hsla(from var(--color-destructive) h s l / 0.2);
             }
        `;
    }

    protected get template(): string {
        const checkIcon = icons.check ?? ''; // Handle potentially missing icon
        // Hidden native checkbox controls state, styled div provides visual
        return `
            <!-- Wrapper for visual -->
            <span class="checkbox-wrapper" aria-hidden="true">
                <span class="checkmark">${checkIcon}</span>
            </span>
            <!-- Native input overlays everything -->
            <input type="checkbox" />
            <slot></slot> <!-- For label text -->
        `;
    }

     connectedCallback() {
        super.connectedCallback();
        this.inputElement = this.shadow.querySelector('input[type="checkbox"]');
        this.wrapperElement = this.shadow.querySelector('.checkbox-wrapper');
        this.updateCheckboxAttributes();
        this.attachCheckboxListeners();

        // REMOVED: Host click listener registration
    }

     disconnectedCallback() {
        super.disconnectedCallback();
        this.removeCheckboxListeners();
        // REMOVED: Host click listener removal
    }

     attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        // No need to call super.attributeChangedCallback if BaseComponent doesn't use it
        if (this.inputElement) {
            this.updateCheckboxAttributes();
        }
        // No direct style updates needed as CSS :host selectors handle checked/disabled/invalid
     }

    private attachCheckboxListeners(): void {
        if (!this.inputElement) return;
        // Listen to CHANGE on the native input to update the attribute and dispatch event
        this.inputElement.addEventListener('change', this.handleChange);
    }

    private removeCheckboxListeners(): void {
         if (!this.inputElement) return;
         this.inputElement.removeEventListener('change', this.handleChange);
    }

    // REMOVED: handleHostClick method


    // Update 'checked' attribute based on the native checkbox state
    private handleChange(event: Event): void {
        const target = event.target as HTMLInputElement;
        // Update the host attribute via setter (which already handles the internal input state)
        this.checked = target.checked;
        // Forward the change event
        this.dispatchEvent(new CustomEvent('change', {
            detail: { checked: target.checked, value: this.value },
            bubbles: true,
            composed: true
        }));
    }

    private updateCheckboxAttributes(): void {
        if (!this.inputElement) return;

        // Use setters which also update internal input state
        this.checked = this.hasAttribute('checked');
        this.disabled = this.hasAttribute('disabled');

        const required = this.getBoolAttribute('required');
        const name = this.getAttribute('name') || '';
        const value = this.getAttribute('value') || 'on';
        const ariaInvalid = this.getAttribute('aria-invalid');
        const ariaLabel = this.getAttribute('aria-label');

        this.inputElement.required = required;
        this.inputElement.name = name;
        this.inputElement.value = value;

        if (ariaInvalid) this.inputElement.setAttribute('aria-invalid', ariaInvalid); else this.inputElement.removeAttribute('aria-invalid');
        if (ariaLabel) this.inputElement.setAttribute('aria-label', ariaLabel); else this.inputElement.removeAttribute('aria-label');

        // CSS :host selectors handle styling based on attributes
    }

    // --- Public Methods ---
    focus(options?: FocusOptions): void {
        this.inputElement?.focus(options);
    }

    blur(): void {
        this.inputElement?.blur();
    }
}

// Define the component unless already defined
if (!customElements.get('app-checkbox')) {
    customElements.define('app-checkbox', AppCheckbox);
}