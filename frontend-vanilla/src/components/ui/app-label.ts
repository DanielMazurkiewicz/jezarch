import { BaseComponent } from '../base-component';

export class AppLabel extends BaseComponent {
    static get observedAttributes() { return ['for']; }

    protected get styles(): string {
        return `
            :host {
                display: inline-block; /* Or block depending on usage */
                font-size: 0.875rem; /* text-sm */
                line-height: 1; /* leading-none */
                font-weight: 500; /* font-medium */
                color: var(--color-foreground, #1a202c);
                user-select: none; /* Non-selectable */
                cursor: default; /* Default cursor unless 'for' is set */
            }
             :host([for]) {
                 cursor: pointer; /* Pointer cursor when 'for' is set */
             }
             /* Style when associated input is disabled (requires JS or parent scope) */
             /* Example using a data attribute set by JS: */
            :host([data-disabled="true"]) {
                 cursor: not-allowed;
                 opacity: 0.5;
            }
        `;
    }

    protected get template(): string {
        return `<label><slot></slot></label>`;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this.updateLabelAttributes();
    }

    attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        if (name === 'for' && this.isConnected) {
            this.updateLabelAttributes();
        }
    }

    private updateLabelAttributes(): void {
        const labelElement = this.shadow.querySelector('label');
        if (!labelElement) return;

        const forValue = this.getAttribute('for');
        if (forValue) {
            labelElement.setAttribute('for', forValue);
        } else {
            labelElement.removeAttribute('for');
        }
    }
}

// Define the component unless already defined
if (!customElements.get('app-label')) {
    customElements.define('app-label', AppLabel);
}