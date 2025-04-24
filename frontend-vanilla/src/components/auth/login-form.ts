import { BaseComponent } from '../base-component';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import { router, authService } from '../../index'; // Import instance correctly
import { icons } from '../../lib/icons';
import { loginSchema } from '../../lib/zodSchemas'; // Import the Zod schema
// Import component types explicitly
import type { AppInput } from '../ui/app-input';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';
import type { AppLabel } from '../ui/app-label';
import type { AppCard } from '../ui/app-card';

export class LoginForm extends BaseComponent {
    private formElement: HTMLFormElement | null = null;
    private emailInput: AppInput | null = null;
    private passwordInput: AppInput | null = null;
    private submitButton: AppButton | null = null;
    private errorDisplay: ErrorDisplay | null = null;
    private registerButton: AppButton | null = null;

    private _isLoading: boolean = false;
    private _error: string | null = null;

    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.navigateToRegister = this.navigateToRegister.bind(this); // Bind the new method
        this.submitHandlerWrapper = this.submitHandlerWrapper.bind(this); // Bind the wrapper
    }

    protected get styles(): string {
        return `
            :host { display: block; max-width: 400px; margin: 0 auto; }
            form { display: flex; flex-direction: column; gap: var(--spacing-4); }
            .form-field { display: flex; flex-direction: column; gap: var(--spacing-1); }
            app-label { font-weight: 500; font-size: 0.875rem; }
            .actions { margin-top: var(--spacing-4); display: flex; justify-content: space-between; align-items: center; }
            /* Ensure error display has margin */
            error-display { margin-bottom: var(--spacing-3); }
            .eye-icon { cursor: pointer; color: var(--color-muted-foreground); }
            .eye-icon:hover { color: var(--color-foreground); }
        `;
    }

    protected get template(): string {
        const eyeIcon = icons.eye ?? '👁️';
        const eyeOffIcon = icons.eyeOff ?? '👁️‍🗨️';
        // Ensure icons are strings
        const finalEyeIcon = typeof eyeIcon === 'function' ? eyeIcon() : eyeIcon;
        const finalEyeOffIcon = typeof eyeOffIcon === 'function' ? eyeOffIcon() : eyeOffIcon;


        return `
            <app-card>
                <div slot="header">
                    <h3>Login</h3>
                    <p>Enter your credentials to access your account.</p>
                </div>
                <div slot="content">
                     <error-display id="form-error" hidden></error-display>
                    <form id="login-form" novalidate>
                        <div class="form-field">
                            <app-label for="email">Email</app-label>
                            <app-input type="email" id="email" name="email" required placeholder="user@example.com"></app-input>
                        </div>
                        <div class="form-field">
                            <app-label for="password">Password</app-label>
                             <app-input type="password" id="password" name="password" required placeholder="••••••••">
                                 <span slot="suffix" id="toggle-password" class="eye-icon" title="Show/Hide password">
                                     ${finalEyeIcon} <!-- Initially show 'eye' icon -->
                                 </span>
                             </app-input>
                        </div>
                        <div class="actions">
                            <app-button type="button" variant="link" id="register-button">Need an account?</app-button>
                            <app-button type="submit" id="submit-button" loading="${this._isLoading}">Login</app-button>
                        </div>
                    </form>
                </div>
            </app-card>
        `;
    }

    connectedCallback() {
        super.connectedCallback(); // Sets up shadow DOM and styles

        this.formElement = this.qs('#login-form') as HTMLFormElement; // Assert type
        this.emailInput = this.qs('#email') as AppInput; // Assert type
        this.passwordInput = this.qs('#password') as AppInput; // Assert type
        this.submitButton = this.qs('#submit-button') as AppButton; // Assert type
        this.errorDisplay = this.qs('#form-error') as ErrorDisplay; // Assert type
        this.registerButton = this.qs('#register-button') as AppButton; // Assert type

        this.addEventListeners();
    }

    disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners via base class
    }

    // Wrapper for async submit
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during login form submission:", error);
            this.setError(error?.message || "An unexpected error occurred.");
            this.setLoading(false); // Ensure loading stops on error
        });
    }


    addEventListeners() {
        this.registerListener(this.formElement, 'submit', this.submitHandlerWrapper); // Use wrapper
        this.registerListener(this.registerButton, 'click', this.navigateToRegister);

        // Password visibility toggle
         const togglePassword = this.qsOptional('#toggle-password');
         if (togglePassword && this.passwordInput) {
             const eyeIcon = icons.eye ?? '👁️';
             const eyeOffIcon = icons.eyeOff ?? '👁️‍🗨️';
              // Ensure icons are strings
             const finalEyeIcon = typeof eyeIcon === 'function' ? eyeIcon() : eyeIcon;
             const finalEyeOffIcon = typeof eyeOffIcon === 'function' ? eyeOffIcon() : eyeOffIcon;
             this.registerListener(togglePassword, 'click', () => {
                 if (!this.passwordInput?.inputElement) return; // Check internal inputElement
                 const type = this.passwordInput.inputElement.type === 'password' ? 'text' : 'password';
                 this.passwordInput.inputElement.type = type; // Set type on internal input
                 togglePassword.innerHTML = type === 'password' ? finalEyeIcon : finalEyeOffIcon;
             });
         }
    }

    private setLoading(isLoading: boolean): void {
        this._isLoading = isLoading;
        if (this.submitButton) {
            this.submitButton.loading = isLoading;
            this.submitButton.disabled = isLoading; // Button handles its own disabled state based on loading
        }
        // Optionally disable form inputs while loading
        this.emailInput?.toggleAttribute('disabled', isLoading);
        this.passwordInput?.toggleAttribute('disabled', isLoading);
        this.registerButton?.toggleAttribute('disabled', isLoading);
    }

    private setError(message: string | null): void {
        this._error = message;
        if (this.errorDisplay) {
            this.errorDisplay.message = message || '';
            this.errorDisplay.hidden = !message;
        }
    }

    private async handleSubmit(event: SubmitEvent): Promise<void> {
        // Removed event.preventDefault() as it's in the wrapper
        if (this._isLoading || !this.formElement || !this.emailInput || !this.passwordInput) return;

        // Assuming Zod validation is preferred now
        // clearValidationErrors(this.formElement); // Handled by displayValidationErrors
        this.setError(null); // Clear previous API errors

        const formData = new FormData(this.formElement);
        const data = Object.fromEntries(formData.entries()); // Convert to object

        const validation = validateForm(loginSchema, data); // Use Zod schema

        if (!validation.success) {
            displayValidationErrors(validation.errors, this.shadow); // Display Zod errors
            this.setError("Please correct the errors below."); // General form error
            return;
        }

        const validatedData = validation.data; // Use validated data

        this.setLoading(true);

        try {
            // Use validated data for login
            await authService.login({ login: validatedData.login, password: validatedData.password });
            // Login successful, authService handles state update.
            // Redirect to home page or intended destination
            router.navigate('/');
        } catch (err: any) {
            // Error handled by authService, but we can show it here too
            this.setError(err.message || "Login failed. Please check your credentials.");
            throw err; // Re-throw for the wrapper's catch block
        } finally {
            // Loading state is handled in wrapper's catch/finally if re-thrown
            // this.setLoading(false);
        }
    }

    private navigateToRegister(): void {
        router.navigate('/register');
    }
}

// Define the component unless already defined
if (!customElements.get('login-form')) {
    customElements.define('login-form', LoginForm);
}