import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import type { AppButton } from './app-button'; // Import AppButton type if needed

type DialogSize = 'default' | 'sm' | 'lg' | 'xl' | 'full';

export class AppDialog extends BaseComponent {
    static observedAttributes = ['open', 'size', 'disable-close', 'aria-labelledby', 'aria-describedby'];

    private dialogElement: HTMLDialogElement | null = null;
    private _isOpen: boolean = false;
    private focusableElements: HTMLElement[] = [];
    private firstElement: HTMLElement | undefined = undefined;
    private lastElement: HTMLElement | undefined = undefined;
    private previouslyFocusedElement: HTMLElement | null = null;

    constructor() {
        super();
        this._handleKeydown = this._handleKeydown.bind(this);
        this._handleBackdropClick = this._handleBackdropClick.bind(this);
        this._handleCloseButtonClick = this._handleCloseButtonClick.bind(this);
    }

    get open(): boolean {
        return this._isOpen;
    }

    set open(value: boolean) {
        if (Boolean(value)) {
            this.show();
        } else {
            this.hide();
        }
    }

    get size(): DialogSize {
        return (this.getAttribute('size') as DialogSize) || 'default';
    }

    set size(value: DialogSize) {
        this.setAttribute('size', value);
    }

    get disableClose(): boolean {
        return this.hasAttribute('disable-close');
    }

    set disableClose(value: boolean) {
        this.toggleAttribute('disable-close', value);
    }

    // Styles remain largely the same, adjust sizing based on attributes
    protected get styles(): string {
        return `
            :host {
                display: contents; /* Let the dialog element control layout */
            }
            dialog {
                /* Reset native styles */
                padding: 0;
                margin: auto; /* Center */
                border: none;
                background: transparent; /* Allow backdrop filter */
                overflow: visible; /* Allow content overflow */
                position: fixed;
                inset: 0;
                z-index: var(--z-dialog, 50);
                 /* Make backdrop clickable unless disabled */
                 /* Remove this - click handled on dialog directly */
                 /* pointer-events: none; */
                 /* Instead, apply pointer-events to children */
                 /* > * { pointer-events: auto; } */
            }
             /* Ensure dialog itself IS clickable for backdrop clicks */
             dialog::backdrop {
                 /* Default backdrop */
                 background-color: hsla(var(--color-background-raw, 0 0 0) / 0.8);
                 /* backdrop-filter: blur(4px); */ /* Optional blur */
                 transition: opacity 0.3s ease;
                 opacity: 0;
             }
             dialog[open]::backdrop {
                 opacity: 1;
             }
             /* Prevent interaction with underlying content when open */
             dialog[open] {
                 pointer-events: auto;
             }


             .dialog-content-wrapper {
                 position: fixed; /* Position relative to viewport */
                 top: 50%;
                 left: 50%;
                 transform: translate(-50%, -50%);
                 z-index: calc(var(--z-dialog, 50) + 1); /* Ensure content is above backdrop */
                 background-color: var(--color-background, white);
                 color: var(--color-foreground, #1a202c);
                 border-radius: var(--radius-lg, 0.75rem);
                 box-shadow: var(--shadow-lg);
                 display: flex;
                 flex-direction: column;
                 max-height: calc(100vh - 4rem); /* Limit height */
                 opacity: 0;
                 transform: translate(-50%, -48%) scale(0.95);
                 transition: opacity 0.3s ease, transform 0.3s ease;
                 overflow: hidden; /* Clip content within rounded corners */
                 pointer-events: auto; /* Enable clicks on content */
             }
              dialog[open] .dialog-content-wrapper {
                 opacity: 1;
                 transform: translate(-50%, -50%) scale(1);
             }


             /* --- Sizing --- */
             .dialog-content-wrapper { width: 90vw; max-width: 500px; } /* default */
             :host([size="sm"]) .dialog-content-wrapper { max-width: 400px; }
             :host([size="lg"]) .dialog-content-wrapper { max-width: 800px; }
             :host([size="xl"]) .dialog-content-wrapper { max-width: 1140px; }
             :host([size="full"]) .dialog-content-wrapper {
                 width: calc(100vw - 4rem);
                 max-width: none;
                 height: calc(100vh - 4rem);
                 max-height: none;
             }
             /* Adjust centering for full size */
             :host([size="full"]) .dialog-content-wrapper { top: 2rem; left: 2rem; transform: none; }


             .dialog-header {
                 flex-shrink: 0;
                 padding: var(--spacing-4) var(--spacing-6);
                 border-bottom: 1px solid var(--color-border);
                 display: flex;
                 justify-content: space-between;
                 align-items: flex-start; /* Align items to top */
                 gap: var(--spacing-4);
             }
             .dialog-header ::slotted(h2) { /* Style slotted header */
                 font-size: 1.125rem; /* text-lg */
                 font-weight: 600;
                 margin: 0;
                 line-height: 1.5; /* Adjust line height */
             }
             .dialog-header ::slotted(p) { /* Style slotted description */
                 font-size: 0.875rem;
                 color: var(--color-muted-foreground);
                 margin: 0;
                 margin-top: var(--spacing-1);
             }
             .close-button {
                 flex-shrink: 0;
                 margin-left: auto; /* Push button to the right */
                 margin-top: -4px; /* Align nicely with text */
                 margin-right: -8px;
                 opacity: 0.7;
             }
             .close-button:hover { opacity: 1; }
             .close-button svg { width: 1.25rem; height: 1.25rem; }


             .dialog-body {
                 flex-grow: 1;
                 padding: var(--spacing-6);
                 overflow-y: auto; /* Scrollable body */
             }
             .dialog-body ::slotted(*) { /* Ensure slotted content doesn't have weird margins */
                 margin: 0;
             }


             .dialog-footer {
                 flex-shrink: 0;
                 padding: var(--spacing-3) var(--spacing-6);
                 border-top: 1px solid var(--color-border);
                 display: flex;
                 justify-content: flex-end;
                 gap: var(--spacing-3);
                 background-color: var(--color-muted);
             }
             .dialog-footer ::slotted(*) {
                 /* Styles for slotted footer elements if needed */
             }

             /* Hide header/footer if slots are empty */
             .dialog-header:has(slot[name="header"]:empty) { display: none; }
             .dialog-footer:has(slot[name="footer"]:empty) { display: none; }
        `;
    }

    protected get template(): string {
        const closeIcon = icons.x ?? 'X';
        const ariaLabelledBy = this.getAttribute('aria-labelledby');
        const ariaDescribedBy = this.getAttribute('aria-describedby');

        return `
            <dialog
                role="dialog"
                aria-modal="true"
                ${ariaLabelledBy ? `aria-labelledby="${ariaLabelledBy}"` : ''}
                ${ariaDescribedBy ? `aria-describedby="${ariaDescribedBy}"` : ''}
            >
                <div class="dialog-content-wrapper">
                    <div class="dialog-header">
                        <slot name="header"></slot>
                         ${!this.disableClose ? `
                             <app-button class="close-button" variant="ghost" size="icon" aria-label="Close dialog">
                                 ${closeIcon}
                             </app-button>
                         ` : ''}
                    </div>
                    <div class="dialog-body">
                        <slot></slot> <!-- Default slot for main content -->
                    </div>
                    <div class="dialog-footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </dialog>
        `;
    }

    connectedCallback() {
        super.connectedCallback();
        // Ensure querySelector returns HTMLDialogElement or null
        this.dialogElement = this.shadowRoot?.querySelector<HTMLDialogElement>('dialog') ?? null;
        this._isOpen = this.hasAttribute('open');
        if (this._isOpen && this.dialogElement && !this.dialogElement.open) {
             this.dialogElement.showModal(); // Sync state if initially open
             this.attachListeners(); // Attach listeners if initially open
             this.trapFocus();
        }
        this.updateCloseButtonListener(); // Ensure listener state matches disable-close
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeListeners(); // Clean up listeners
         // Restore focus if element still exists
         if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
            try { this.previouslyFocusedElement.focus(); } catch(e) {/* Element might not be focusable anymore */}
         }
         this.previouslyFocusedElement = null;
    }

    attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
        if (oldValue === newValue) return;

        if (name === 'open') {
            this.open = newValue !== null;
        }
        if (name === 'size') {
            // Handled by CSS
        }
        if (name === 'disable-close') {
            this.updateCloseButtonListener(); // Add/remove listener based on attribute
             if (this.dialogElement) {
                 this.dialogElement.classList.toggle('no-close-on-backdrop', newValue !== null);
             }
        }
        // Update aria attributes on the dialog if changed
        if (name === 'aria-labelledby' && this.dialogElement) {
            if (newValue) this.dialogElement.setAttribute('aria-labelledby', newValue);
            else this.dialogElement.removeAttribute('aria-labelledby');
        }
        if (name === 'aria-describedby' && this.dialogElement) {
            if (newValue) this.dialogElement.setAttribute('aria-describedby', newValue);
            else this.dialogElement.removeAttribute('aria-describedby');
        }
    }

    show() {
        if (this._isOpen || !this.dialogElement) return;

        this.previouslyFocusedElement = document.activeElement as HTMLElement; // Store focus
        this.dialogElement.showModal();
        this._isOpen = true;
        this.toggleAttribute('open', true);
        this.dispatchEvent(new CustomEvent('open', { bubbles: true, composed: true }));

        // Wait for transition before trapping focus
        this.dialogElement.addEventListener('transitionend', () => {
             this.trapFocus();
        }, { once: true });

        this.attachListeners();
        // Trigger layout repaint for transitions (optional but can help)
         void this.dialogElement.offsetWidth;
    }

    hide() {
        if (!this._isOpen || !this.dialogElement) return;

        this.dialogElement.close(); // This triggers the 'close' event
        this._isOpen = false;
        this.toggleAttribute('open', false);
        this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));

         // Restore focus if element still exists
         if (this.previouslyFocusedElement && typeof this.previouslyFocusedElement.focus === 'function') {
            try { this.previouslyFocusedElement.focus(); } catch(e) {/* Element might not be focusable anymore */}
         }
         this.previouslyFocusedElement = null;

        this.removeListeners();
    }

    private attachListeners() {
        document.addEventListener('keydown', this._handleKeydown);
        this.dialogElement?.addEventListener('click', this._handleBackdropClick);
        this.updateCloseButtonListener(); // Ensure close button listener is correct
    }

    private removeListeners() {
        document.removeEventListener('keydown', this._handleKeydown);
        this.dialogElement?.removeEventListener('click', this._handleBackdropClick);
        this.shadowRoot?.querySelector('.close-button')?.removeEventListener('click', this._handleCloseButtonClick);
    }

     private updateCloseButtonListener() {
         const closeButton = this.shadowRoot?.querySelector<AppButton>('.close-button');
         closeButton?.removeEventListener('click', this._handleCloseButtonClick); // Remove previous first
         if (!this.disableClose && this._isOpen) { // Only add if not disabled and dialog is open
             closeButton?.addEventListener('click', this._handleCloseButtonClick);
         }
     }

    private _handleKeydown(event: KeyboardEvent) {
        if (!this._isOpen) return;

        if (event.key === 'Escape' && !this.disableClose) {
            event.preventDefault();
            this.hide();
        }

        if (event.key === 'Tab') {
             // Ensure focusable elements are calculated correctly
             this.getFocusableElements();
             if (this.focusableElements.length === 0) {
                 event.preventDefault(); // Prevent tabbing out if nothing is focusable
                 return;
             }
             // Add null checks for firstElement and lastElement
             if (!this.firstElement || !this.lastElement) return;

            if (event.shiftKey) { // Shift + Tab
                if (document.activeElement === this.firstElement) {
                    this.lastElement.focus();
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === this.lastElement) {
                    this.firstElement.focus();
                    event.preventDefault();
                }
            }
        }
    }

    private _handleBackdropClick(event: MouseEvent) {
         if (!this._isOpen || this.disableClose || !this.dialogElement) return;
         // Check if the click is directly on the dialog element (the backdrop area)
         if (event.target === this.dialogElement) {
             this.hide();
         }
    }

    private _handleCloseButtonClick() {
        if (!this.disableClose) {
            this.hide();
        }
    }

    private getFocusableElements() {
        if (!this.dialogElement) {
             this.focusableElements = []; return;
        }
        const focusableSelector = [
            'a[href]',
            'button:not([disabled])',
            'input:not([disabled])',
            'select:not([disabled])',
            'textarea:not([disabled])',
            '[tabindex]:not([tabindex="-1"])',
            // Include custom elements that should be focusable (might need adjustment)
            'app-button:not([disabled])',
            'app-input:not([disabled])',
            'app-select:not([disabled])',
            'app-checkbox:not([disabled])',
            // Add other custom focusable elements here
        ].join(', ');

         this.focusableElements = Array.from(
             this.dialogElement.querySelectorAll<HTMLElement>(focusableSelector)
         ).filter(el => {
             // Check visibility and if element is truly focusable
             return el.offsetParent !== null && !el.hasAttribute('disabled');
         });
         this.firstElement = this.focusableElements[0];
         this.lastElement = this.focusableElements[this.focusableElements.length - 1];
    }

    private trapFocus() {
        this.getFocusableElements();
        // Add null check for firstElement
        if (this.firstElement) {
            // Slight delay can sometimes help ensure the element is ready
            // requestAnimationFrame(() => this.firstElement?.focus());
            try { this.firstElement.focus(); } catch(e) { console.warn("Failed to focus first element:", e); }
        } else {
            // If no focusable elements, maybe focus the wrapper? Or log warning.
            (this.shadowRoot?.querySelector('.dialog-content-wrapper') as HTMLElement)?.focus();
            console.warn("AppDialog: No focusable elements found inside the dialog.");
        }
    }
}

// Define the component unless already defined
if (!customElements.get('app-dialog')) {
    customElements.define('app-dialog', AppDialog);
}