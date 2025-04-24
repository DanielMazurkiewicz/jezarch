import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
    timerId?: ReturnType<typeof setTimeout>;
}

// Singleton instance
let toastHandlerInstance: ToastHandler | null = null;

export class ToastHandler extends BaseComponent {
    private toasts: Map<string, ToastMessage> = new Map();

    constructor() {
        super();
        if (toastHandlerInstance && toastHandlerInstance !== this) {
            console.warn("ToastHandler should be a singleton. Replacing existing instance reference.");
            // Optionally, remove the previous instance from DOM if desired,
            // but generally, just updating the reference is enough.
        }
        toastHandlerInstance = this;
    }

    static get instance(): ToastHandler {
        if (!toastHandlerInstance) {
            // Attempt to find existing instance first
             toastHandlerInstance = document.querySelector('toast-handler');

            if (!toastHandlerInstance) {
                // If not found, create and append
                console.log("Creating ToastHandler instance.");
                const handler = document.createElement('toast-handler') as ToastHandler;
                // Append to body or a dedicated container
                 document.body.appendChild(handler);
                toastHandlerInstance = handler;
            }

             if (!toastHandlerInstance) {
                // Final fallback - should not happen in normal flow
                 console.error("Failed to create or find ToastHandler instance.");
                 // Return a dummy object to prevent hard errors, though toasts won't work
                 return { show: (msg: string) => console.error("ToastHandler not initialized:", msg) } as any;
             }
        }
        return toastHandlerInstance;
    }

    protected get styles(): string {
        return `
            :host {
                position: fixed;
                bottom: var(--spacing-4, 1rem); /* Changed to bottom */
                right: var(--spacing-4, 1rem);
                z-index: 1000; /* High z-index */
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: var(--spacing-2, 0.5rem);
                pointer-events: none; /* Allow clicks through the container */
                max-width: calc(100% - 2 * var(--spacing-4, 1rem));
            }
            .toast {
                display: flex;
                align-items: center;
                gap: var(--spacing-3, 0.75rem);
                width: auto; /* Fit content */
                max-width: 350px;
                padding: var(--spacing-3, 0.75rem) var(--spacing-4, 1rem);
                border-radius: var(--radius, 0.5rem);
                box-shadow: var(--shadow-lg);
                border: 1px solid var(--color-border);
                background-color: var(--color-popover-bg);
                color: var(--color-popover-foreground);
                pointer-events: auto; /* Enable interaction with toasts */
                animation: toast-in 0.3s ease-out forwards;
                opacity: 0;
                transform: translateY(100%); /* Animate from bottom */
            }
            .toast.fade-out {
                animation: toast-out 0.3s ease-in forwards;
            }

            .toast-icon {
                flex-shrink: 0;
                width: 1.25rem; /* w-5 */
                height: 1.25rem; /* h-5 */
            }
            .toast-icon svg { display: block; width: 100%; height: 100%; } /* Ensure icon scales */
            .toast-message {
                font-size: 0.875rem; /* text-sm */
                line-height: 1.25rem;
                word-break: break-word;
            }
            .close-button {
                margin-left: auto;
                padding: var(--spacing-1);
                background: none;
                border: none;
                color: var(--color-muted-foreground);
                cursor: pointer;
                border-radius: 99px;
                flex-shrink: 0; /* Prevent shrinking */
            }
            .close-button:hover {
                color: var(--color-foreground);
                background-color: var(--color-muted);
            }
            .close-button svg {
                width: 0.875rem; /* ~w-3.5 */
                height: 0.875rem; /* ~h-3.5 */
                display: block; /* Prevent small gap below svg */
            }

            /* Type Variants */
            .toast.info .toast-icon { color: var(--color-primary, #2b6cb0); }
            .toast.success .toast-icon { color: var(--color-success, #38a169); }
            .toast.warning .toast-icon { color: var(--color-warning, #dd6b20); }
            .toast.error .toast-icon { color: var(--color-destructive, #e53e3e); }
             /* Optional: Border colors */
             /* .toast.info { border-left: 4px solid var(--color-primary); } */
             /* .toast.success { border-left: 4px solid var(--color-success); } */
             /* .toast.warning { border-left: 4px solid var(--color-warning); } */
             /* .toast.error { border-left: 4px solid var(--color-destructive); } */


            @keyframes toast-in {
                from { opacity: 0; transform: translateY(100%); }
                to { opacity: 1; transform: translateY(0); }
            }
            @keyframes toast-out {
                 from { opacity: 1; transform: translateY(0); }
                 to { opacity: 0; transform: translateY(100%); }
            }
        `;
    }

    // No initial template, populated dynamically
    protected get template(): string { return ``; }

    connectedCallback() {
        super.connectedCallback(); // Adds styles
        // Ensure singleton instance is updated if created before connection
        if (!toastHandlerInstance || toastHandlerInstance !== this) {
            toastHandlerInstance = this;
        }
    }

    public show(message: string, type: ToastType = 'info', duration: number = 5000): void {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
        const newToast: ToastMessage = { id, message, type, duration };

        // Set timer for auto-dismissal
        newToast.timerId = setTimeout(() => {
            this.dismiss(id);
        }, duration);

        this.toasts.set(id, newToast);
        this.renderToasts();
    }

    public dismiss(id: string): void {
        const toastData = this.toasts.get(id);
        if (toastData) {
            if (toastData.timerId) clearTimeout(toastData.timerId); // Clear timer

            const toastElement = this.shadowRoot?.querySelector(`.toast[data-id="${id}"]`);
            if (toastElement) {
                toastElement.classList.add('fade-out');
                // Remove from DOM after animation
                toastElement.addEventListener('animationend', () => {
                     toastElement.remove();
                     // Only remove from map *after* fade out completes
                     // Check if the toast still exists in the map before deleting,
                     // in case dismiss was called multiple times quickly.
                     if (this.toasts.has(id)) {
                         this.toasts.delete(id);
                     }
                }, { once: true }); // Ensure listener is removed after firing
            } else {
                 // If element not found but data exists, just remove data
                 this.toasts.delete(id);
                 // No need to re-render if element wasn't there
            }
        }
    }

    private getIcon(type: ToastType): string {
        // Provide fallbacks for icons and handle functions
        let iconValue: string | ((props?: { className?: string }) => string) | undefined;
        switch (type) {
            case 'success': iconValue = icons.checkCircle; break;
            case 'warning': iconValue = icons.alertTriangle; break;
            case 'error': iconValue = icons.alertCircle; break;
            case 'info':
            default: iconValue = icons.info; break;
        }
        const iconStr = iconValue ?? ''; // Default to empty string if icon is undefined
        // Call the function if it's a function, otherwise return the string
        return typeof iconStr === 'function' ? iconStr() : iconStr;
    }


    private renderToasts(): void {
        // Clear existing toasts before re-rendering the current map
        // Filter out nodes that are already fading out
        const nonFadingToasts = Array.from(this.shadowRoot?.querySelectorAll('.toast:not(.fade-out)') ?? []);
        const existingIds = new Set(nonFadingToasts.map(el => el.getAttribute('data-id')));

        // Remove toast elements that are no longer in the map and not fading out
        nonFadingToasts.forEach(el => {
            const id = el.getAttribute('data-id');
            if (id && !this.toasts.has(id)) {
                 el.remove();
            }
        });

        const closeIcon = icons.x ?? ''; // Provide fallback
        const closeIconHtml = typeof closeIcon === 'function' ? closeIcon() : closeIcon;

        // Add new toasts
        this.toasts.forEach(toastData => {
            // Add only if it doesn't exist already
            if (!existingIds.has(toastData.id) && !this.shadowRoot?.querySelector(`.toast[data-id="${toastData.id}"]`)) {
                const toastElement = document.createElement('div');
                toastElement.classList.add('toast', toastData.type);
                toastElement.dataset.id = toastData.id;
                toastElement.innerHTML = `
                    <span class="toast-icon">${this.getIcon(toastData.type)}</span>
                    <span class="toast-message">${toastData.message}</span>
                    <button class="close-button" aria-label="Dismiss notification">
                        ${closeIconHtml}
                    </button>
                `;
                toastElement.querySelector('.close-button')?.addEventListener('click', () => this.dismiss(toastData.id));

                // Prepend new toasts to show at the bottom first
                this.shadowRoot?.prepend(toastElement);
            }
        });
    }
}

// --- Global Helper Function ---
export function showToast(message: string, type: ToastType = 'info', duration: number = 5000): void {
    // Access the singleton instance safely
     // Use requestAnimationFrame to ensure the handler element is likely ready
    requestAnimationFrame(() => {
         try {
             ToastHandler.instance.show(message, type, duration);
         } catch (e) {
             console.error("Failed to show toast:", e, { message, type });
             // Fallback to console log if handler fails
             console.log(`[Toast ${type}]: ${message}`);
         }
     });
}

// Define the component if it's not already defined
if (!customElements.get('toast-handler')) {
    customElements.define('toast-handler', ToastHandler);
}