import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import { router, authService } from '../../index'; // Import global services
import type { AppButton } from '../ui/app-button'; // Explicit import
import { showToast } from '../ui/toast-handler'; // Import showToast

export class AppHeader extends BaseComponent {
    static get observedAttributes() { return ['user-login', 'user-role']; } // Observe user info changes

    private pageTitleElement: HTMLElement | null = null;

    protected get styles(): string {
        return `
            :host {
                display: block; /* Takes full width */
                position: sticky;
                top: 0;
                z-index: 30; /* z-30 */
            }
            header {
                display: flex;
                height: 3.5rem; /* h-14 */
                align-items: center;
                gap: var(--spacing-4);
                border-bottom: 1px solid var(--color-border);
                background-color: var(--color-background);
                padding: 0 var(--spacing-4);
            }
            .page-title {
                flex: 1; /* Takes up available space */
                font-size: 1.25rem; /* text-xl */
                font-weight: 600; /* font-semibold */
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .actions {
                display: flex;
                align-items: center;
                gap: var(--spacing-2);
                flex-shrink: 0; /* Prevent shrinking */
            }
            .user-info {
                font-size: 0.875rem; /* text-sm */
                color: var(--color-muted-foreground);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                max-width: 200px; /* Optional: Limit max width */
            }

             /* Basic responsive adjustments */
             @media (max-width: 640px) { /* sm breakpoint */
                .user-info { display: none; }
                header { padding: 0 var(--spacing-2); gap: var(--spacing-2); }
             }
        `;
    }

    protected get template(): string {
        const userLogin = this.getAttribute('user-login') || '';
        const userRole = this.getAttribute('user-role') || '';
        const isLoggedIn = !!userLogin;

        // Title is now set dynamically in updateTitle
        const logOutIcon = icons.logOut ?? ''; // Handle potentially missing icon

        return `
            <header>
                <!-- Mobile Menu Button Placeholder (optional) -->
                <!-- <app-button variant="outline" size="icon" class="sm:hidden"> M </app-button> -->
                <h1 class="page-title"></h1> <!-- Title content set via JS -->
                ${isLoggedIn ? `
                <div class="actions">
                    <span class="user-info" title="${userLogin} (${userRole})">${userLogin} (${userRole})</span>
                    <app-button variant="ghost" size="icon" title="Logout" id="logout-button"> <!-- Changed to ghost -->
                        ${logOutIcon}
                    </app-button>
                </div>
                ` : ''}
            </header>
        `;
    }

    // Wrapper for the async logout handler
    private logoutHandlerWrapper = (): void => {
        this.handleLogout().catch(error => {
            console.error("Logout handler failed:", error);
             showToast(`Logout failed: ${error.message || 'Unknown error'}`, 'error');
        });
    }

    // Bind methods in constructor
    constructor() {
        super();
        this.handleLogout = this.handleLogout.bind(this); // Keep async bound
        this.handlePathChange = this.handlePathChange.bind(this);
        this.logoutHandlerWrapper = this.logoutHandlerWrapper.bind(this); // Bind wrapper
    }

     connectedCallback() {
        super.connectedCallback(); // Renders template
        this.pageTitleElement = this.shadow.querySelector('.page-title'); // Query after render
        window.addEventListener('popstate', this.handlePathChange);
        // Listen for custom navigate event if router uses one
        window.addEventListener('navigate', this.handlePathChange);
        this.updateTitle(); // Initial title update
        // Attach listener here AFTER initial render
        this.addEventListeners();
    }

     disconnectedCallback() {
         super.disconnectedCallback();
         window.removeEventListener('popstate', this.handlePathChange);
         window.removeEventListener('navigate', this.handlePathChange);
         // Base class removeEventListeners will handle the logout button
    }

    // When user attributes change, re-render the template
     attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
        // super.attributeChanged(name, oldValue, newValue); // Base class handles generic attribute->property mapping
        if (this.isConnected && (name === 'user-login' || name === 'user-role')) {
             console.log(`AppHeader attribute changed: ${name} from ${oldValue} to ${newValue}`);
            this.render(); // Re-render the whole header if user info changes
             // Re-query elements after re-render
             this.pageTitleElement = this.shadow.querySelector('.page-title');
             // Re-attach listener to the potentially new logout button
             this.removeEventListeners(); // Remove old listener first
             this.addEventListeners(); // Add listener to new button
             this.updateTitle(); // Ensure title is correct after re-render
        }
    }


    private handlePathChange(): void {
        // Use rAF to ensure location is updated before deriving title
        requestAnimationFrame(() => this.updateTitle());
    }

    private updateTitle() {
        if (this.pageTitleElement) {
            this.pageTitleElement.textContent = this.deriveTitleFromPath(location.pathname);
        }
    }

    private deriveTitleFromPath(pathname: string): string {
        const segments = pathname.split('/').filter(Boolean);
        if (segments.length === 0) return 'Dashboard';

        let title = segments[0]?.replace(/-/g, ' ') ?? 'Unknown';
        // Example: Handle nested routes like /signatures/:id/elements
        if (segments[0] === 'signatures') {
             if (segments[1] && segments[2] === 'elements') {
                title = 'Signature Elements'; // More specific
             } else {
                 title = 'Signature Components'; // Default for /signatures/*
             }
        } else if (segments[0] === 'archive') {
             const searchParams = new URLSearchParams(location.search);
             if (searchParams.get('unitId')) {
                 // Title updated dynamically by archive-page itself using api data
                 title = 'Archive Unit'; // Placeholder, page component sets the real title
             } else {
                title = 'Archive';
             }
        }

        // Capitalize first letter of each word
        return title.split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
    };

    addEventListeners() {
        // Use the synchronous wrapper
        this.qsOptional('#logout-button')?.addEventListener('click', this.logoutHandlerWrapper);
    }

    removeEventListeners() {
         // Remove the synchronous wrapper
         this.qsOptional('#logout-button')?.removeEventListener('click', this.logoutHandlerWrapper);
    }

    private async handleLogout(): Promise<void> {
        const logoutButton = this.qsOptional<AppButton>('#logout-button');
        try {
            if (logoutButton) logoutButton.loading = true; // Use property setter
            // Await the logout process which clears local state
            await authService.logout();
            // **** Explicitly navigate AFTER logout completes ****
            router.navigate('/login');
        } catch (error) {
            console.error("Logout failed in handleLogout:", error);
            // Error toast is shown by wrapper's catch block
            // Rethrow if needed, but probably not necessary here
        } finally {
             // Button might be gone after re-render if logout is fast
             const finalButton = this.qsOptional<AppButton>('#logout-button');
             if (finalButton) finalButton.loading = false;
        }
    }
}

// Define the component unless already defined
if (!customElements.get('app-header')) {
    customElements.define('app-header', AppHeader);
}