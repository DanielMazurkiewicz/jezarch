import { BaseComponent } from '../base-component';
import { authService } from '../../index'; // Import global service

export class AppLayout extends BaseComponent {

    constructor() {
        super();
        // Re-render layout if auth state changes (e.g., user logs in/out, might affect sidebar)
        window.addEventListener('authchange', () => this.render());
    }

    protected get styles(): string {
        return `
            :host {
                display: flex;
                height: 100vh; /* Ensure layout takes full viewport height */
                width: 100%;
                overflow: hidden; /* Prevent scrolling on the layout itself */
                background-color: var(--color-muted, #f7fafc); /* Slightly tinted background */
            }
            app-sidebar {
                 flex-shrink: 0; /* Prevent sidebar from shrinking */
                 height: 100vh; /* Sidebar should also take full height */
                 overflow-y: auto; /* Allow sidebar content to scroll if needed */
            }
            .main-content {
                flex: 1; /* Take remaining space */
                display: flex;
                flex-direction: column;
                overflow: hidden; /* Prevent main content area from causing body scroll */
                 height: 100vh; /* Ensure main content takes full height */
            }
             app-header {
                 flex-shrink: 0; /* Prevent header from shrinking */
             }
            .content-area {
                flex: 1; /* Allow content area to grow and take remaining space */
                padding: var(--spacing-4) var(--spacing-6); /* p-4 md:p-6 */
                overflow-y: auto; /* Allow content scrolling */
                background-color: var(--color-background); /* Can be different from host background */
            }
            .content-wrapper {
                 /* Centering and max-width now happen within the content area */
                 max-width: 80rem; /* max-w-7xl */
                 margin-left: auto;
                 margin-right: auto;
                 /* Add height or min-height if needed for centering content */
                 min-height: 100%;
                 display: flex;
                 flex-direction: column;
            }
             /* The outlet itself doesn't need specific styles unless content within needs flex */
            #content-outlet {
                 flex-grow: 1; /* Allow routed content to fill space */
                 display: flex; /* Make it a flex container if needed */
                 flex-direction: column; /* Default stacking */
             }

            @media (max-width: 768px) { /* Example breakpoint for potentially hiding sidebar */
                /* Add styles for mobile layout if needed, e.g., hiding sidebar */
                /* app-sidebar { display: none; } */
                .content-area { padding: var(--spacing-4); }
            }
        `;
    }

    protected get template(): string {
        // Pass user info (or lack thereof) to sidebar and header if needed
        const user = authService.user;
        const userLogin = user?.login ?? '';
        const userRole = user?.role ?? '';

        // Ensure attributes are properly quoted
        return `
            <app-sidebar user-login="${userLogin}" user-role="${userRole}"></app-sidebar>
            <div class="main-content">
                <app-header user-login="${userLogin}" user-role="${userRole}"></app-header>
                <main class="content-area">
                   <div class="content-wrapper">
                        <!-- Router will place content here -->
                        <div id="content-outlet">
                             <!-- Initial placeholder or loading state -->
                             <slot></slot>
                        </div>
                    </div>
                </main>
            </div>
        `;
    }

    // No specific lifecycle needed for basic layout, relies on children
}

// Define the component unless already defined
if (!customElements.get('app-layout')) {
    customElements.define('app-layout', AppLayout);
}