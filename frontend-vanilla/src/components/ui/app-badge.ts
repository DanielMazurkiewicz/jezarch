import { BaseComponent } from '../base-component';
// No need to import icons if not used directly in the template

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export class AppBadge extends BaseComponent {
    static get observedAttributes() { return ['variant', 'class']; }

    // Add properties for programmatic access if needed
    get variant(): BadgeVariant {
        return (this.getAttribute('variant') as BadgeVariant) || 'default';
    }
    set variant(value: BadgeVariant) {
        this.setAttribute('variant', value);
    }

    protected get styles(): string {
        return `
            :host {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                border-radius: var(--radius, 0.5rem);
                border: 1px solid transparent;
                padding: 2px var(--spacing-2, 0.5rem); /* Adjusted padding py-0.5 px-2 */
                font-size: 0.75rem; /* text-xs */
                font-weight: 500; /* font-medium */
                white-space: nowrap;
                flex-shrink: 0; /* Prevent shrinking */
                gap: var(--spacing-1);
                transition: color 150ms, background-color 150ms;
            }
            :host svg {
                 width: 0.75rem; /* size-3 */
                 height: 0.75rem;
            }

            /* Variants */
            :host([variant="default"]), :host(:not([variant])) {
                background-color: var(--color-primary);
                color: var(--color-primary-foreground);
                border-color: transparent;
            }
            :host([variant="secondary"]) {
                background-color: var(--color-secondary);
                color: var(--color-secondary-foreground);
                border-color: transparent;
            }
             :host([variant="destructive"]) {
                background-color: var(--color-destructive);
                color: var(--color-destructive-foreground);
                border-color: transparent;
            }
             :host([variant="outline"]) {
                color: var(--color-foreground);
                border-color: var(--color-border); /* Use standard border color */
                 background-color: transparent;
            }
            :host([variant="success"]) {
                 background-color: hsla(from var(--color-success) h s l / 0.15);
                 color: var(--color-success);
                 border-color: hsla(from var(--color-success) h s l / 0.3);
             }
             :host([variant="warning"]) {
                 background-color: hsla(from var(--color-warning) h s l / 0.15);
                 color: var(--color-warning);
                 border-color: hsla(from var(--color-warning) h s l / 0.3);
             }
              /* Example hover for outline */
            :host([variant="outline"]:hover) {
                 /* background-color: var(--color-secondary); */
                 /* color: var(--color-secondary-foreground); */
            }
        `;
    }

    protected get template(): string {
        // Use slot for badge content
        return `<slot></slot>`;
    }

     // attributeChanged is not needed here as CSS handles visual updates
}

// Define the component unless already defined
if (!customElements.get('app-badge')) {
    customElements.define('app-badge', AppBadge);
}