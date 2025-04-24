import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

export class LoadingSpinner extends BaseComponent {
    static get observedAttributes() { return ['size', 'class']; }

    protected get styles(): string {
        return `
            :host {
                display: inline-block;
                line-height: 0; /* Prevent extra space */
            }
            svg {
                animation: spin 1s linear infinite;
                color: var(--color-primary, #2b6cb0); /* Use primary color */
            }
            /* Size variants */
            :host([size="sm"]) svg { width: 1rem; height: 1rem; }
            :host([size="md"]) svg { width: 2rem; height: 2rem; }
            :host([size="lg"]) svg { width: 3rem; height: 3rem; }
            /* Default size */
            :host(:not([size])) svg { width: 1.5rem; height: 1.5rem; } /* Adjusted default */

            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
        `;
    }

    protected get template(): string {
        // Embed the loader icon directly, providing a fallback
        const loaderIcon = icons.loader ?? '<svg viewBox="0 0 24 24"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
        return typeof loaderIcon === 'function' ? loaderIcon() : loaderIcon;
    }

     // attributeChanged is not needed here as CSS handles visual updates
}

// Define the component unless already defined
if (!customElements.get('loading-spinner')) {
    customElements.define('loading-spinner', LoadingSpinner);
}