import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export class AppButton extends BaseComponent {
    static get observedAttributes() {
        // Reflect native button attributes + custom ones
        return ['variant', 'size', 'disabled', 'loading', 'aria-label', 'title', 'type', 'form', 'icon', 'icon-position'];
    }

    private buttonElement: HTMLButtonElement | null = null;

    // Add property getters/setters for programmatic access
    get variant(): ButtonVariant { return (this.getAttribute('variant') as ButtonVariant) || 'default'; }
    set variant(value: ButtonVariant) { this.setAttribute('variant', value); }

    get size(): ButtonSize { return (this.getAttribute('size') as ButtonSize) || 'default'; }
    set size(value: ButtonSize) { this.setAttribute('size', value); }

    // Make disabled check internal state first before attribute
    get disabled(): boolean { return this._disabled || this.loading; }
    set disabled(value: boolean) {
        const newValue = Boolean(value);
        if (this._disabled !== newValue) {
            this._disabled = newValue;
            this.toggleAttribute('disabled', this._disabled); // Reflect attribute
            this.updateButtonAttributes(); // Update internal button state
        }
    }
    private _disabled: boolean = false; // Internal state for disabled


    get loading(): boolean { return this.hasAttribute('loading'); }
    set loading(value: boolean) {
        const newValue = Boolean(value);
        const changed = this.loading !== newValue;
        if (changed) {
            this.toggleAttribute('loading', newValue);
            // Loading state change might affect disabled state of internal button
            this.updateButtonAttributes();
            // Re-render might be needed if template changes based on loading
            this.render(); // Simple re-render to update spinner/content
        }
    }


    get type(): string { return this.getAttribute('type') || 'button'; }
    set type(value: string) { this.setAttribute('type', value); }

    // Add form property reflection
    get form(): string | null { return this.getAttribute('form'); }
    set form(value: string | null) { if (value) this.setAttribute('form', value); else this.removeAttribute('form'); }

    get icon(): string | null { return this.getAttribute('icon'); }
    set icon(value: string | null) { if (value) this.setAttribute('icon', value); else this.removeAttribute('icon'); }

    get iconPosition(): 'left' | 'right' { return (this.getAttribute('icon-position') as 'left' | 'right') || 'left'; }
    set iconPosition(value: 'left' | 'right') { this.setAttribute('icon-position', value); }


    protected get styles(): string {
        // Base styles mimicking Shadcn button + variants
        return `
            :host {
                display: block; /* Make host block-level by default */
                width: auto; /* Allow intrinsic width or explicit width set via CSS */
                vertical-align: middle; /* Align with text like a button */
                /* REMOVE host cursor style - rely on internal button */
                /* cursor: pointer; */
            }
             :host([disabled]), :host([loading]) {
                 cursor: not-allowed;
                 opacity: 0.5;
             }
            :host([size="icon"]) {
                 width: 2.25rem; /* Set explicit width for icon buttons */
                 height: 2.25rem;
            }


            button {
                display: inline-flex; /* Keep inner button inline-flex */
                align-items: center;
                justify-content: center;
                gap: var(--spacing-2, 0.5rem); /* Apply gap directly */
                white-space: nowrap;
                border-radius: var(--radius, 0.5rem);
                font-size: 0.875rem; /* text-sm */
                font-weight: 500; /* font-medium */
                line-height: 1.25rem;
                transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);
                cursor: pointer;
                border: 1px solid transparent;
                outline: none;
                box-shadow: var(--shadow-sm);
                flex-shrink: 0; /* Prevent shrinking */
                width: 100%; /* Fill the host */
                height: 100%; /* Fill the host */
                box-sizing: border-box; /* Include padding/border in size */
                color: inherit; /* Let variant styles on host control color */
                background-color: inherit; /* Let variant styles on host control bg */
            }
            button:disabled {
                /* Native button disabled state is handled, host style provides visual cue */
                 pointer-events: none; /* Already handled by host */
                 cursor: not-allowed; /* Already handled by host */
            }
            button:focus-visible {
                outline: 2px solid transparent;
                outline-offset: 2px;
                box-shadow: 0 0 0 3px hsla(from var(--color-ring) h s l / 0.5);
            }
            .icon, .spinner { /* Combine icon and spinner styles */
                width: 1rem; /* size-4 */
                height: 1rem; /* size-4 */
                flex-shrink: 0;
                display: inline-flex; /* Ensure they are treated as flex items */
                align-items: center;
                justify-content: center;
            }
            .spinner {
                 animation: spin 1s linear infinite;
            }
            .icon svg, .spinner svg { /* Ensure spinner SVG takes size */
                width: 100%;
                height: 100%;
                display: block; /* Prevent small gap below SVG */
            }
            /* Style the default slot to behave correctly in flex layout */
            ::slotted(*) {
                 /* Allow slotted content (text) to shrink and show ellipsis */
                 overflow: hidden;
                 text-overflow: ellipsis;
                 white-space: nowrap; /* Needed for ellipsis */
                 min-width: 0; /* Important for flex-shrink */
             }
             /* Hide icon/spinner gap if slot is empty */
             button:has(slot:empty) {
                gap: 0;
             }


            /* --- Sizes (Applied to host, button inherits height/padding) --- */
            :host([size="default"]), :host(:not([size])) { height: 2.25rem; }
            :host([size="sm"]) { height: 2rem; border-radius: calc(var(--radius) - 2px); }
            :host([size="lg"]) { height: 2.5rem; border-radius: calc(var(--radius) - 2px); }
            /* Icon size handled above by host width/height */
             /* Padding applied to button */
            button { padding: 0 var(--spacing-4, 1rem); } /* Default padding */
            :host([size="sm"]) button { padding: 0 var(--spacing-3, 0.75rem); font-size: 0.8rem; }
            :host([size="lg"]) button { padding: 0 var(--spacing-6, 1.5rem); }
            :host([size="icon"]) button { padding: 0; gap: 0; } /* No padding or gap for icon button */

            /* Spinner size adjustment based on host size */
            :host([size="default"]) .spinner, :host(:not([size])) .spinner { width: 1rem; height: 1rem; }
            :host([size="sm"]) .spinner { width: 0.875rem; height: 0.875rem; }
            :host([size="lg"]) .spinner { width: 1.125rem; height: 1.125rem; }
            :host([size="icon"]) .spinner { width: 1rem; height: 1rem; }


            /* --- Variants (Applied to host for inheritance) --- */
            :host([variant="default"]), :host(:not([variant])) {
                background-color: var(--color-primary, #2b6cb0);
                color: var(--color-primary-foreground, white);
                border-color: transparent;
            }
            :host([variant="default"]:not([disabled]):not([loading])) button:hover,
            :host(:not([variant]):not([disabled]):not([loading])) button:hover {
                background-color: var(--color-primary-hover, #2c5282);
            }

            :host([variant="destructive"]) {
                background-color: var(--color-destructive, #e53e3e);
                color: var(--color-destructive-foreground, white);
                border-color: transparent;
            }
             :host([variant="destructive"]:not([disabled]):not([loading])) button:hover {
                 background-color: var(--color-destructive-hover, #c53030);
             }

            :host([variant="outline"]) {
                border-color: var(--color-input-border, #cbd5e0);
                background-color: var(--color-background, white);
                color: var(--color-foreground, #1a202c);
            }
             :host([variant="outline"]:not([disabled]):not([loading])) button:hover {
                 background-color: var(--color-secondary, #e2e8f0); /* Use secondary as accent */
                 color: var(--color-secondary-foreground, #2d3748);
             }

            :host([variant="secondary"]) {
                background-color: var(--color-secondary, #e2e8f0);
                color: var(--color-secondary-foreground, #2d3748);
                border-color: transparent;
            }
             :host([variant="secondary"]:not([disabled]):not([loading])) button:hover {
                 background-color: var(--color-secondary-hover, #cbd5e0);
             }

            :host([variant="ghost"]) {
                background-color: transparent;
                border-color: transparent;
                color: var(--color-foreground, #1a202c);
                box-shadow: none;
            }
             :host([variant="ghost"]:not([disabled]):not([loading])) button:hover {
                 background-color: var(--color-secondary, #e2e8f0); /* Use secondary as accent */
                 color: var(--color-secondary-foreground, #2d3748);
             }

            :host([variant="link"]) {
                color: var(--color-primary, #2b6cb0);
                background-color: transparent;
                border-color: transparent;
                box-shadow: none;
                padding: 0;
                height: auto; /* Let content determine height */
                width: auto; /* Let content determine width */
            }
             :host([variant="link"]) button { /* Specific styles for link button */
                 text-underline-offset: 4px;
                 box-shadow: none;
                 height: auto;
                 width: auto;
                 padding: 0;
             }
             :host([variant="link"]:not([disabled]):not([loading])) button:hover {
                 text-decoration: underline;
             }

             @keyframes spin {
               from { transform: rotate(0deg); }
               to { transform: rotate(360deg); }
             }
        `;
    }

    protected get template(): string {
        const loading = this.getBoolAttribute('loading');
        const iconName = this.getAttribute('icon');
        const iconPosition = this.getAttribute('icon-position') || 'left';
        const spinnerIcon = icons.loader ?? ''; // Provide fallback
        const iconFn = iconName ? icons[iconName as keyof typeof icons] : null;
        let iconSvg = '';

        if (!loading && iconFn) {
             iconSvg = typeof iconFn === 'function' ? iconFn({ className: 'icon' }) : iconFn; // Pass class if function
        }

        const loadingSpinner = loading ? `<span class="spinner">${spinnerIcon}</span>` : '';
        // Use iconFn check result
        const finalIcon = !loading && iconSvg ? `<span class="icon">${iconSvg}</span>` : '';

        // Remove the wrapper span, use slot directly
        const slotContent = `<slot></slot>`;
        let content = '';

        // Build content order based on icon position and loading state
        if (loadingSpinner) { // Loading spinner takes precedence
            content = `${loadingSpinner}${slotContent}`;
        } else if (finalIcon) {
            if (iconPosition === 'right') {
                content = `${slotContent}${finalIcon}`;
            } else { // Default to left
                content = `${finalIcon}${slotContent}`;
            }
        } else {
            content = slotContent; // Just the slot content
        }

        // For icon size, only render the icon or spinner
        if (this.getAttribute('size') === 'icon') {
             content = loading ? loadingSpinner : finalIcon;
        }

        // Set initial disabled state based on host attributes
        const initialDisabled = this.hasAttribute('disabled') || this.hasAttribute('loading');
        // *** Ensure the button type is 'button' by default unless overridden ***
        const buttonType = this.getAttribute('type') || 'button';
        return `<button type="${buttonType}" ${initialDisabled ? 'disabled' : ''}>${content}</button>`;
    }


    connectedCallback() {
        super.connectedCallback(); // Sets up shadow DOM and styles
        this.buttonElement = this.shadow.querySelector('button');
        this._disabled = this.hasAttribute('disabled'); // Sync internal state
        this.updateButtonAttributes();
        // **** REMOVED HOST CLICK LISTENER ****
        // this.addEventListener('click', this.handleHostClick);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // **** REMOVED HOST CLICK LISTENER ****
        // this.removeEventListener('click', this.handleHostClick);
    }

    attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        // super.attributeChanged(name, oldValue, newValue); // Base class handles some attributes

        // Handle disabled internal state update
        if (name === 'disabled') {
             this._disabled = newValue !== null;
        }

        // Re-render template if attributes affecting structure change
        const needsReRender = ['loading', 'icon', 'icon-position', 'size'].includes(name);
        // Update attributes on internal button if template doesn't change OR if certain attributes change
        const needsAttrUpdate = this.buttonElement && (!needsReRender || ['size', 'variant', 'type', 'disabled', 'form', 'aria-label', 'title', 'loading'].includes(name));

        if (needsReRender && this.isConnected) {
            super.render(); // Call BaseComponent render which handles template update
            this.buttonElement = this.shadow.querySelector('button'); // Re-query button after render
            this.updateButtonAttributes(); // Apply attributes again
        } else if (needsAttrUpdate) {
             this.updateButtonAttributes(); // Just update attributes on the existing internal button
        }
    }

    // **** REMOVED HOST CLICK LISTENER ****
    // private handleHostClick = (event: MouseEvent): void => { ... };

    private updateButtonAttributes(): void {
        if (!this.buttonElement) return;

        const isLoading = this.loading; // Use getter
        const isDisabled = this.disabled; // Use getter which checks internal _disabled and loading
        const typeAttr = this.getAttribute('type') || 'button';
        const ariaLabel = this.getAttribute('aria-label');
        const title = this.getAttribute('title');
        const form = this.getAttribute('form'); // Get form attribute

        // Set native disabled property
        this.buttonElement.disabled = isDisabled;

        // Set native type property with assertion
        this.buttonElement.type = typeAttr as 'button' | 'submit' | 'reset';

        if (ariaLabel) this.buttonElement.setAttribute('aria-label', ariaLabel); else this.buttonElement.removeAttribute('aria-label');
        if (title) this.buttonElement.setAttribute('title', title); else this.buttonElement.removeAttribute('title');
        if (form) this.buttonElement.setAttribute('form', form); else this.buttonElement.removeAttribute('form');
    }

    // --- Public Methods ---
    click(): void {
        // Directly click the internal button if not disabled
        if (!this.disabled) {
             this.buttonElement?.click();
        }
    }

    focus(options?: FocusOptions): void {
        this.buttonElement?.focus(options);
    }

    blur(): void {
        this.buttonElement?.blur();
    }
}

// Define the component unless already defined
if (!customElements.get('app-button')) {
    customElements.define('app-button', AppButton);
}