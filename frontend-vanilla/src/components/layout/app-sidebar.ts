import { BaseComponent } from '../base-component';
import { icons } from '../../lib/icons';
import { router, authService } from '../../index'; // Import global services
import type { AppButton } from '../ui/app-button'; // Explicit import
import { showToast } from '../ui/toast-handler'; // Import showToast

interface NavItem {
    path: string;
    label: string;
    icon: string | ((props?: { className?: string }) => string); // Allow function for icons
    exact?: boolean;
    adminOnly?: boolean;
}

export class AppSidebar extends BaseComponent {
    static get observedAttributes() { return ['user-login', 'user-role']; } // Observe user info changes

    protected get styles(): string {
        return `
            :host {
                display: flex; /* Use flex */
                flex-direction: column; /* Stack vertically */
                width: 16rem; /* w-64 */
                background-color: var(--color-sidebar-bg, #f7fafc);
                color: var(--color-sidebar-foreground, #4a5568);
                border-right: 1px solid var(--color-sidebar-border, #e2e8f0);
                transition: width 0.3s ease-in-out; /* Optional: transition for width changes */
                /* Added height: 100% */
                height: 100%;
                overflow: hidden; /* Prevent host overflow */
            }
            .sidebar-content {
                 display: flex;
                 flex-direction: column;
                 height: 100%; /* Ensure content fills height */
                 overflow: hidden; /* Prevent content overflow */
            }
            .header {
                padding: var(--spacing-4);
                border-bottom: 1px solid var(--color-sidebar-border);
                flex-shrink: 0; /* Prevent shrinking */
            }
            .app-title {
                font-size: 1.125rem; /* text-lg */
                font-weight: 600; /* font-semibold */
                color: var(--color-foreground); /* Use main foreground for title */
            }
            .user-info {
                font-size: 0.875rem; /* text-sm */
                color: var(--color-muted-foreground); /* Use main muted foreground */
                display: block;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-top: var(--spacing-1);
            }
            nav {
                flex: 1; /* Takes up available space */
                overflow-y: auto; /* Scrollable nav */
                padding: var(--spacing-4) var(--spacing-2); /* px-2 py-4 */
            }
            nav a {
                display: flex; /* Changed to flex */
                align-items: center;
                gap: var(--spacing-2);
                padding: var(--spacing-2) var(--spacing-3); /* px-3 py-2 */
                border-radius: var(--radius, 0.5rem);
                text-decoration: none;
                color: inherit; /* Inherit color from host */
                font-size: 0.875rem; /* text-sm */
                font-weight: 500; /* font-medium */
                transition: background-color 150ms, color 150ms;
                width: 100%; /* Make links take full width */
                margin-bottom: var(--spacing-1);
            }
            nav a:hover {
                background-color: var(--color-sidebar-accent-bg, #e2e8f0);
                color: var(--color-sidebar-accent-foreground, #1a202c);
            }
            nav a.active {
                background-color: var(--color-sidebar-accent-bg, #e2e8f0);
                color: var(--color-sidebar-accent-foreground, #1a202c);
                font-weight: 600; /* font-semibold */
            }
            nav a svg {
                width: 1rem; /* h-4 w-4 */
                height: 1rem;
                flex-shrink: 0;
            }
            .footer {
                padding: var(--spacing-4);
                margin-top: auto; /* Pushes to bottom */
                border-top: 1px solid var(--color-sidebar-border);
                flex-shrink: 0; /* Prevent shrinking */
            }
            #logout-button {
                 width: 100%;
                 justify-content: flex-start; /* Align icon/text left */
            }

            /* Example: Hide sidebar on smaller screens */
             @media (max-width: 768px) {
                 :host {
                    /* Uncomment to hide on mobile. Requires a mechanism (e.g., button) to toggle visibility. */
                     /* display: none; */
                     /* Or position it off-screen */
                     /* position: fixed; left: -16rem; top: 0; height: 100%; */
                     /* Or just make it narrower */
                     /* width: 4rem; */
                 }
             }
        `;
    }

    private getNavItems(): NavItem[] {
        const isAdmin = this.getAttribute('user-role') === 'admin';
        // Ensure icons exist or provide fallbacks
        const items: NavItem[] = [
            { path: '/', label: 'Dashboard', icon: icons.layoutDashboard ?? '', exact: true },
            { path: '/archive', label: 'Archive', icon: icons.archive ?? '' },
            { path: '/signatures', label: 'Signatures', icon: icons.penTool ?? '' },
            { path: '/tags', label: 'Tags', icon: icons.tag ?? '' },
            { path: '/notes', label: 'Notes', icon: icons.stickyNote ?? '' },
        ];
        if (isAdmin) {
            items.push({ path: '/admin', label: 'Admin', icon: icons.shieldAlert ?? '', adminOnly: true });
        }
        return items;
    }

    protected get template(): string {
        const userLogin = this.getAttribute('user-login') || '';
        const userRole = this.getAttribute('user-role') || '';
        const currentPath = location.pathname;
        const navItems = this.getNavItems();
        const logoutIcon = icons.logOut ?? ''; // Handle potentially missing icon

        const navLinks = navItems.map(item => {
            const isActive = item.exact
                ? currentPath === item.path
                : currentPath.startsWith(item.path) && (item.path !== '/' || currentPath === '/'); // Handle base path '/' correctly

            // Handle icon potentially being a function
            let iconHtml = '';
            if (typeof item.icon === 'function') {
                 iconHtml = item.icon();
            } else if (typeof item.icon === 'string') {
                 iconHtml = item.icon;
            }

            return `
                <a href="${item.path}" class="${isActive ? 'active' : ''}" data-navigo>
                    ${iconHtml}
                    <span>${item.label}</span> <!-- Wrap text in span -->
                </a>
            `;
        }).join('');

        // Wrap content in a div to control scrolling
        return `
            <div class="sidebar-content">
                <div class="header">
                    <h2 class="app-title">JezArch</h2>
                    ${userLogin ? `<span class="user-info">Logged in as: ${userLogin} (${userRole})</span>` : ''}
                </div>
                <nav>
                    ${navLinks}
                </nav>
                ${userLogin ? `
                <div class="footer">
                    <app-button variant="outline" id="logout-button">
                         ${logoutIcon} <!-- Use icon directly -->
                         <span>Logout</span> <!-- Wrap text -->
                    </app-button>
                </div>
                ` : ''}
            </div>
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
        this.updateActiveLink = this.updateActiveLink.bind(this);
        this.handleNavClick = this.handleNavClick.bind(this);
        this.handleLogout = this.handleLogout.bind(this); // Keep async bound
        this.logoutHandlerWrapper = this.logoutHandlerWrapper.bind(this); // Bind wrapper
    }


     connectedCallback() {
        super.connectedCallback();
        window.addEventListener('popstate', this.updateActiveLink);
        // Listen for custom navigate event if router uses one
        window.addEventListener('navigate', this.updateActiveLink);
        // Attach listener here AFTER initial render
        this.addEventListeners();
        this.updateActiveLink(); // Set initial active link
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener('popstate', this.updateActiveLink);
        window.removeEventListener('navigate', this.updateActiveLink);
    }

    attributeChanged(name: string, oldValue: string | null, newValue: string | null): void {
         // super.attributeChanged(name, oldValue, newValue); // Base class handles generic attribute->property mapping
        if (this.isConnected && (name === 'user-login' || name === 'user-role')) {
            console.log(`AppSidebar attribute changed: ${name} from ${oldValue} to ${newValue}`);
            this.render(); // Re-render if user info changes
            // Re-attach listeners after re-render
            this.removeEventListeners();
            this.addEventListeners();
            this.updateActiveLink(); // Ensure link state is correct
        }
    }

    addEventListeners() {
        this.shadow.querySelector('nav')?.addEventListener('click', this.handleNavClick);
        // Use the synchronous wrapper
        this.qsOptional('#logout-button')?.addEventListener('click', this.logoutHandlerWrapper);
    }

    removeEventListeners() {
        this.shadow.querySelector('nav')?.removeEventListener('click', this.handleNavClick);
        // Remove the synchronous wrapper
        this.qsOptional('#logout-button')?.removeEventListener('click', this.logoutHandlerWrapper);
    }

    private handleNavClick(event: Event) {
        const target = event.target as HTMLElement;
        const link = target.closest('a[data-navigo]');

        if (link && link.getAttribute('href')) {
            event.preventDefault();
            const path = link.getAttribute('href')!;
            router.navigate(path);
            // Don't call updateActiveLink here, wait for 'navigate' event
        }
    }

    private async handleLogout(): Promise<void> {
        const logoutButton = this.qsOptional<AppButton>('#logout-button');
        try {
             if (logoutButton) logoutButton.loading = true; // Use property setter
             // Await the logout process which clears local state
             await authService.logout();
             // **** Explicitly navigate AFTER logout completes ****
             router.navigate('/login');
        } catch(error) {
            console.error("Logout failed in handleLogout:", error);
            // Error toast shown by wrapper
        } finally {
             // Button might be gone after re-render if logout is fast
             const finalButton = this.qsOptional<AppButton>('#logout-button');
             if (finalButton) finalButton.loading = false;
        }
    }

    private updateActiveLink(): void {
        if (!this.isConnected) return;
        // Short delay to allow router to potentially update location before we check
        requestAnimationFrame(() => {
            const currentPath = location.pathname;
            const links = this.shadow.querySelectorAll<HTMLAnchorElement>('nav a');
            const navItems = this.getNavItems();

            // console.log(`Sidebar: Updating active link for path: ${currentPath}`);

            links.forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;

                const correspondingItem = navItems.find(item => item.path === href);
                // Improved matching: exact match or startsWith for non-exact, but '/' only matches exactly '/'
                const isActive = correspondingItem?.exact
                    ? currentPath === href
                    : (href !== '/' && currentPath.startsWith(href)) || (href === '/' && currentPath === '/');

                link.classList.toggle('active', isActive);
                // console.log(`  Link ${href}: isActive = ${isActive}`);
            });
        });
    }
}

// Define the component unless already defined
if (!customElements.get('app-sidebar')) {
    customElements.define('app-sidebar', AppSidebar);
}
