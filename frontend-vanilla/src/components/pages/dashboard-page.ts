import { BaseComponent } from '../base-component';
import { authService } from '../../index';

export class DashboardPage extends BaseComponent {

    protected get styles(): string {
        return `
            :host {
                display: block;
                padding: var(--spacing-4) var(--spacing-6); /* p-4 md:p-6 */
            }
            .welcome-message {
                font-size: 1.5rem; /* text-2xl */
                font-weight: 600; /* font-semibold */
                margin-bottom: var(--spacing-4);
            }
            .description {
                color: var(--color-muted-foreground);
            }
            .space-y-4 > * + * { /* Simple spacing utility */
                 margin-top: var(--spacing-4);
            }
        `;
    }

    protected get template(): string {
        const userLogin = authService.user?.login || 'User';
        return `
            <div class="space-y-4">
                <h1 class="welcome-message">Welcome, ${userLogin}!</h1>
                <p class="description">
                    Select a section from the sidebar to get started or manage your account settings.
                </p>
                <!-- Add more dashboard widgets or links here -->
            </div>
        `;
    }
}

// Define the component unless already defined
if (!customElements.get('dashboard-page')) {
    customElements.define('dashboard-page', DashboardPage);
}