import { BaseComponent } from '../base-component';

export class AppCard extends BaseComponent {
    static get observedAttributes() { return ['shadow']; } // Observe shadow attribute

    protected get styles(): string {
        return `
            :host {
                display: block; /* Changed to block */
                /* display: flex; */
                /* flex-direction: column; */
                /* gap: var(--spacing-6, 1.5rem); /* Removed gap from host */
                border-radius: var(--radius, 0.5rem); /* Use calc for lg */
                border: 1px solid var(--color-card-border, var(--color-border));
                /* padding-top: var(--spacing-6, 1.5rem); /* Removed padding from host */
                /* padding-bottom: var(--spacing-6, 1.5rem); */
                background-color: var(--color-card-bg, white);
                color: var(--color-card-foreground, inherit);
            }
            /* Shadow variants */
            :host([shadow="sm"]) { box-shadow: var(--shadow-sm); }
            :host([shadow="md"]) { box-shadow: var(--shadow-md); }
            :host([shadow="lg"]) { box-shadow: var(--shadow-lg); }
            /* Default shadow if attribute exists but no value */
            :host([shadow]:not([shadow="sm"]):not([shadow="md"]):not([shadow="lg"])) {
                 box-shadow: var(--shadow-sm);
             }


            ::slotted([slot="header"]),
            ::slotted([slot="content"]),
            ::slotted([slot="footer"]) {
                padding: var(--spacing-6, 1.5rem); /* Apply consistent padding to slots */
            }

             ::slotted([slot="header"]) {
                 padding-bottom: var(--spacing-2); /* Reduce bottom padding for header */
                 /* Add grid styles for potential action slot */
                 display: grid;
                 grid-template-rows: auto auto;
                 align-items: start;
                 gap: var(--spacing-1, 0.25rem);
                 border-bottom: 1px solid var(--color-card-border, var(--color-border)); /* Optional separator */
             }
            ::slotted([slot="content"]) {
                /* Content padding applied above */
            }
            ::slotted([slot="footer"]) {
                 padding-top: var(--spacing-2); /* Reduce top padding for footer */
                 display: flex;
                 align-items: center;
                 border-top: 1px solid var(--color-card-border, var(--color-border)); /* Optional separator */
            }

            /* Handle header with action */
            ::slotted([slot="header"]:has(> [slot="action"])) {
                grid-template-columns: 1fr auto;
            }
             ::slotted([slot="header"] > [slot="action"]) {
                 grid-column-start: 2;
                 grid-row-start: 1;
                 grid-row-end: 3; /* Span both rows */
                 align-self: start;
                 justify-self: end;
             }

            /* Add styling for title/description if elements are used directly */
            /* e.g., h2 within header slot */
            ::slotted([slot="header"] > h2) {
                 font-size: 1.25rem; /* text-lg approx */
                 font-weight: 600;
                 line-height: 1.3;
                 margin: 0; /* Reset heading margin */
            }
            ::slotted([slot="header"] > p) {
                 font-size: 0.875rem; /* text-sm */
                 color: var(--color-muted-foreground);
                 margin: 0; /* Reset paragraph margin */
                 grid-row-start: 2; /* Ensure description is below title */
                 grid-column-start: 1;
            }
        `;
    }

    protected get template(): string {
        // Use slots for content projection
        return `
            <slot name="header"></slot>
            <slot name="content"></slot>
            <slot name="footer"></slot>
        `;
    }

     // No specific logic needed in connected/attributeChanged for basic card structure
}

// Define the component unless already defined
if (!customElements.get('app-card')) {
    customElements.define('app-card', AppCard);
}