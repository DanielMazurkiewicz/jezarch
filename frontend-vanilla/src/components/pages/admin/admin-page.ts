import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import '../../ui/app-tabs'; // Ensure tabs component is defined
import './user-management'; // Define tab content components
import './settings-form';
import './ssl-config';
import './log-viewer';

export class AdminPage extends BaseComponent {

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
             .page-header { margin-bottom: var(--spacing-4); }
             .header-title { font-size: 1.5rem; font-weight: 700; margin: 0; }
             .header-description { font-size: 0.875rem; color: var(--color-muted-foreground); margin-top: var(--spacing-1); }
            /* Style the tabs */
             app-tabs { width: 100%; }
             /* Ensure tabs list is scrollable */
             .tabs-list-container {
                 overflow-x: auto;
                 border-bottom: 1px solid var(--color-border);
                 margin-bottom: var(--spacing-6); /* Space below tabs */
                 scrollbar-width: thin;
             }
              .tabs-list-container::-webkit-scrollbar { height: 4px; }
              .tabs-list-container::-webkit-scrollbar-thumb { background: var(--color-border); border-radius: 2px;}
             /* Ensure tabs list itself doesn't shrink */
              app-tabs::part(list) { /* Assuming app-tabs uses a 'list' part */
                 min-width: max-content; /* Allow list to grow based on content */
                 width: auto;
              }
        `;
    }

    protected get template(): string {
        // Check role again just in case router fails
        if (!this.auth.isAdmin) {
            return `<error-display message="Access Denied: Administrator privileges required."></error-display>`;
        }

        return `
            <div class="page-header">
                <h1 class="header-title">Admin Panel</h1>
                <p class="header-description">Manage application users, settings, and logs.</p>
            </div>

            <app-tabs id="admin-tabs" value="users">
                <div class="tabs-list-container">
                     <div slot="trigger-list" part="list"> <!-- Assuming app-tabs uses this structure or similar -->
                        <button slot="trigger" data-value="users">User Management</button>
                        <button slot="trigger" data-value="settings">App Settings</button>
                        <button slot="trigger" data-value="ssl">SSL Config</button>
                        <button slot="trigger" data-value="logs">System Logs</button>
                    </div>
                </div>

                <div slot="content" data-value="users">
                    <user-management></user-management>
                </div>
                <div slot="content" data-value="settings">
                    <settings-form></settings-form>
                </div>
                 <div slot="content" data-value="ssl">
                    <ssl-config></ssl-config>
                </div>
                 <div slot="content" data-value="logs">
                    <log-viewer></log-viewer>
                </div>
            </app-tabs>
        `;
    }

    // --- Lifecycle & Event Handling ---
    connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAdmin) {
            showToast("Access Denied. Admin required.", "error");
            // Consider redirecting if possible/appropriate
            // router.navigate('/');
        }
    }

    addEventListeners() {
        // Add listeners if needed, e.g., for tab changes if not handled internally by app-tabs
    }
    removeEventListeners() { }

}

// Define the component unless already defined
if (!customElements.get('admin-page')) {
    customElements.define('admin-page', AdminPage);
}