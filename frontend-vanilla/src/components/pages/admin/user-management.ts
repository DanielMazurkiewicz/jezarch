import { BaseComponent } from '../../base-component';
import { showToast } from '../../ui/toast-handler';
import api from '../../../lib/api';
import type { User, UserRole } from '../../../../../backend/src/functionalities/user/models';
// Import component definitions/types
import '../../ui/app-card';
import '../../ui/app-select';
import '../../ui/error-display';
import '../../ui/loading-spinner';
// Import types explicitly
import type { ErrorDisplay } from '../../ui/error-display';
import type { AppSelect } from '../../ui/app-select';

export class UserManagement extends BaseComponent {
    // --- State ---
    private users: Omit<User, "password">[] = [];
    private isLoadingUsers: boolean = false;
    private errorUsers: string | null = null;
    private updatingLogin: string | null = null; // Track which user role is being updated

    // --- Styles & Template ---
    protected get styles(): string {
        return `
            :host { display: block; }
             /* Force white background and dark text for admin sections */
             app-card {
                 --color-card-bg: white;
                 --color-card-foreground: #1a202c;
                 --color-foreground: #1a202c;
                 --color-border: #e2e8f0;
                 --color-muted: #f7fafc;
                 --color-muted-foreground: #718096;
                 --color-input-border: #cbd5e0;
                 --color-input-bg: white;
                 --color-primary: #2b6cb0;
                 --color-ring: #3182ce;
             }
            .table-container { border: 1px solid var(--color-border); border-radius: var(--radius); overflow: hidden; }
            table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
            th, td { padding: var(--spacing-2) var(--spacing-3); text-align: left; border-bottom: 1px solid var(--color-border); }
            th { font-weight: 500; color: var(--color-muted-foreground); background-color: var(--color-muted); }
            tr:last-child td { border-bottom: none; }
            td.role-cell { width: 240px; }
            .role-select-wrapper { display: flex; align-items: center; gap: var(--spacing-2); }
            .updating-spinner { margin-left: var(--spacing-2); }
            .loading-container { padding: var(--spacing-8); text-align: center; }
            .no-users { text-align: center; padding: var(--spacing-6); color: var(--color-muted-foreground); }
             .text-sm { font-size: 0.875rem; }
             .text-muted { color: var(--color-muted-foreground); }
        `;
    }

    protected get template(): string {
         return `
            <app-card>
                 <div slot="header">
                    <h3>User Management</h3>
                    <p>View and manage user roles. You cannot change your own role here.</p>
                </div>
                <div slot="content">
                    <error-display id="users-error" hidden></error-display>
                    <div id="users-loading" class="loading-container" hidden><loading-spinner size="lg"></loading-spinner></div>
                    <div id="users-table-container" class="table-container" hidden>
                        <table>
                            <thead>
                                <tr>
                                    <th>Login</th>
                                    <th>User ID</th>
                                    <th class="role-cell">Role</th>
                                </tr>
                            </thead>
                            <tbody>
                                <!-- User rows added dynamically -->
                            </tbody>
                        </table>
                    </div>
                    <div id="no-users" class="no-users" hidden>No users found.</div>
                </div>
            </app-card>
        `;
    }

    // Bind method in constructor
    constructor() {
        super();
        this.handleRoleChange = this.handleRoleChange.bind(this);
    }

    // --- Lifecycle & Data Loading ---
     async connectedCallback() {
        super.connectedCallback();
        if (!this.auth.isAdmin) {
             this.setErrorState("Access Denied."); return;
        }
         // Listeners are added after render in base class
        await this.fetchUsers();
    }

     disconnectedCallback(): void {
         super.disconnectedCallback(); // Base removes listeners
     }

    private async fetchUsers() {
        if (!this.auth.token) return;
        this.setLoadingState(true);
        this.setErrorState(null);
        try {
            const fetched = await api.getAllUsers();
            this.users = fetched.sort((a, b) => a.login.localeCompare(b.login));
            this.renderTable();
        } catch (err: any) {
             this.setErrorState(err.message || 'Failed to fetch users');
             this.renderTable(); // Render empty state or error
        } finally {
            this.setLoadingState(false);
        }
    }

     // --- UI Update Helpers ---
     private setLoadingState(isLoading: boolean): void {
        this.isLoadingUsers = isLoading;
        this.qsOptional('#users-loading')?.toggleAttribute('hidden', !isLoading);
        // Use toggleAttribute instead of accessing 'hidden' property directly
        this.qsOptional('#users-table-container')?.toggleAttribute('hidden', isLoading);
        this.qsOptional('#no-users')?.toggleAttribute('hidden', true); // Hide empty state while loading
     }
     private setErrorState(error: string | null): void {
        this.errorUsers = error;
        // Use imported type
        const errorDisplay = this.qsOptional<ErrorDisplay>('#users-error');
        if (errorDisplay) {
            errorDisplay.message = error || ''; // Ensure message is string
            errorDisplay.hidden = !error;
        }
     }

    private renderTable(): void {
        const tableContainer = this.qsOptional('#users-table-container');
        const tbody = tableContainer?.querySelector('tbody');
        const noUsersEl = this.qsOptional('#no-users');

        if (!tbody || !noUsersEl || !tableContainer) return;

        tbody.innerHTML = ''; // Clear previous rows

        if (this.users.length === 0 && !this.isLoadingUsers) { // Check loading state
            tableContainer.toggleAttribute('hidden', true);
            noUsersEl.toggleAttribute('hidden', false);
             noUsersEl.textContent = this.errorUsers ? 'Failed to load users.' : 'No users found.';
            return;
        }

        // Use toggleAttribute instead of accessing 'hidden' property directly
        tableContainer.toggleAttribute('hidden', this.isLoadingUsers); // Hide table if loading
        noUsersEl.toggleAttribute('hidden', this.isLoadingUsers || this.users.length > 0); // Hide empty state if loading or has users


        const currentAdminLogin = this.auth.user?.login;

        this.users.forEach(user => {
            const tr = document.createElement('tr');
            const isSelf = user.login === currentAdminLogin;
            const isUpdatingThisUser = this.updatingLogin === user.login;

             // Create select element
             const selectEl = document.createElement('app-select') as AppSelect;
             selectEl.dataset.login = user.login;
             // Use toggleAttribute for boolean attributes
             selectEl.toggleAttribute('disabled', isSelf || isUpdatingThisUser);
             selectEl.title = isSelf ? 'Cannot change your own role' : '';

             // Add options dynamically
             selectEl.addOption('admin', 'Admin');
             selectEl.addOption('regular_user', 'Regular User');

             // Set the value *after* options are added
             selectEl.value = user.role || 'regular_user';

             // Render row
             tr.innerHTML = `
                <td>${user.login}</td>
                <td class="text-sm text-muted">${user.userId ?? 'N/A'}</td>
                <td class="role-cell">
                    <div class="role-select-wrapper">
                         <!-- Placeholder for select element -->
                         <div class="select-placeholder"></div>
                         ${isUpdatingThisUser ? `<loading-spinner size="sm" class="updating-spinner"></loading-spinner>` : ''}
                    </div>
                </td>
            `;
             // Replace placeholder with the created select element
             const placeholder = tr.querySelector('.select-placeholder');
             if (placeholder) placeholder.replaceWith(selectEl);

            tbody.appendChild(tr);
        });
    }

    // --- Event Handlers ---
    addEventListeners() {
         // Use event delegation on the table body
         // Register listener using base class method
         this.registerListener(this.shadow.querySelector('tbody'), 'change', this.handleRoleChange);
    }
     // removeEventListeners is handled by BaseComponent

     private async handleRoleChange(event: Event): Promise<void> {
        const target = event.target;
         // Check if the target is indeed an app-select element
         if (!(target instanceof HTMLElement && target.tagName === 'APP-SELECT')) return;
         // Check if it's the AppSelect component we expect and has the login data
         const appSelect = target as AppSelect;
         const login = appSelect.dataset.login;
         if (!login) return;

        const newRole = appSelect.value as UserRole;
        const userToUpdate = this.users.find(u => u.login === login);
        const originalRole = userToUpdate?.role;

         if (!this.auth.token || !userToUpdate || login === this.auth.user?.login) {
             showToast("Cannot change your own role.", "warning");
             // Revert visual change if needed
             appSelect.value = originalRole ?? 'regular_user';
             return;
         }

         this.updatingLogin = login;
         this.renderTable(); // Re-render to show spinner and disable select

         try {
             await api.updateUserRole(login, newRole);
             showToast(`Role for user "${login}" updated to ${newRole}.`, "success");
              // Update local state after successful API call
              const userIndex = this.users.findIndex(u => u.login === login);
              if (userIndex > -1) {
                  const currentUserData = this.users[userIndex];
                  // Check if currentUserData exists before accessing its properties
                  if (currentUserData) {
                      const updatedUser: Omit<User, "password"> = {
                          ...currentUserData, // Copy existing fields
                          role: newRole, // Update the role
                      };
                      this.users[userIndex] = updatedUser;
                  } else {
                       console.error(`User data not found for index ${userIndex} after role update.`);
                  }
              }
         } catch (err: any) {
             showToast(`Failed to update role for ${login}: ${err.message}`, "error");
             // Revert visual change by re-rendering with original data
             // No need to modify this.users here as it wasn't changed on error path
         } finally {
             this.updatingLogin = null;
             this.renderTable(); // Re-render to remove spinner/enable select
         }
     }
}

// Define the component unless already defined
if (!customElements.get('user-management')) {
    customElements.define('user-management', UserManagement);
}