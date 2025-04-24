import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

export class ErrorDisplay extends BaseComponent {
    static get observedAttributes() { return ['message', 'hidden']; } // Observe hidden as well

    protected get styles(): string {
        return `
            :host {
                display: flex;
                align-items: center;
                gap: var(--spacing-2, 0.5rem);
                padding: var(--spacing-3, 0.75rem);
                border-radius: var(--radius, 0.5rem);
                background-color: hsla(from var(--color-destructive, #e53e3e) h s l / 0.1); /* Light red background */
                color: var(--color-destructive, #e53e3e); /* Red text */
                border: 1px solid hsla(from var(--color-destructive, #e53e3e) h s l / 0.3);
                font-size: 0.875rem; /* text-sm */
                line-height: 1.25rem;
            }
            :host([hidden]) {
                display: none;
            }
            svg {
                flex-shrink: 0;
                width: 1rem; /* w-4 */
                height: 1rem; /* h-4 */
            }
        `;
    }

    // Keep template simple, update content via property/attribute
    protected get template(): string {
         const errorIcon = icons.alertCircle ?? ''; // Provide fallback
         const iconHtml = typeof errorIcon === 'function' ? errorIcon() : errorIcon;
        return `
            ${iconHtml}
            <span id="message-span"></span>
        `;
    }

    // Use properties for easier state management
    get message(): string | null {
        return this.getAttribute('message');
    }
    set message(value: string | null | undefined) { // Allow undefined
        const actualValue = value ?? null; // Treat undefined as null
        if (actualValue !== null) {
            this.setAttribute('message', actualValue);
        } else {
            this.removeAttribute('message');
        }
        this.updateMessageContent(); // Update content when set programmatically
    }

     // Expose hidden property matching the attribute
     get hidden(): boolean {
         return this.hasAttribute('hidden');
     }
     set hidden(value: boolean) {
         this.toggleAttribute('hidden', value);
     }

    connectedCallback() {
        super.connectedCallback(); // Renders initial template
        this.updateMessageContent();
    }

    attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        // No need for super call if BaseComponent doesn't implement it
        if (name === 'message' && oldValue !== newValue && this.isConnected) {
            this.updateMessageContent();
        }
        // 'hidden' attribute is handled by CSS :host([hidden])
    }

    private updateMessageContent(): void {
        const messageSpan = this.shadowRoot?.querySelector('#message-span');
        if (messageSpan) {
            messageSpan.textContent = this.message || 'An unknown error occurred.';
        }
    }
}

// Define the component unless already defined
if (!customElements.get('error-display')) {
    customElements.define('error-display', ErrorDisplay);
}