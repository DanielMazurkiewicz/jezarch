import { BaseComponent } from '../base-component';
import { validateForm, displayValidationErrors, clearValidationErrors } from '../../lib/validation';
import { router, authService } from '../../index'; // Import instance correctly
import { icons } from '../../lib/icons';
import { registerSchema } from '../../lib/zodSchemas'; // Import Zod schema
// Import component types explicitly
import type { AppInput } from '../ui/app-input';
import type { AppButton } from '../ui/app-button';
import type { ErrorDisplay } from '../ui/error-display';
import type { AppLabel } from '../ui/app-label';
import type { AppCard } from '../ui/app-card';

export class RegisterForm extends BaseComponent {
    private formElement: HTMLFormElement | null = null;
    private emailInput: AppInput | null = null;
    private passwordInput: AppInput | null = null;
    private confirmPasswordInput: AppInput | null = null;
    private submitButton: AppButton | null = null;
    private errorDisplay: ErrorDisplay | null = null;
    private loginButton: AppButton | null = null;

    private _isLoading: boolean = false;
    private _error: string | null = null;

    constructor() {
        super();
        this.handleSubmit = this.handleSubmit.bind(this);
        this.navigateToLogin = this.navigateToLogin.bind(this); // Bind the new method
        this.submitHandlerWrapper = this.submitHandlerWrapper.bind(this); // Bind wrapper
    }

    protected get styles(): string {
        // Styles similar to LoginForm
        return `
            :host { display: block; max-width: 400px; margin: 0 auto; }
            form { display: flex; flex-direction: column; gap: var(--spacing-4); }
            .form-field { display: flex; flex-direction: column; gap: var(--spacing-1); }
            app-label { font-weight: 500; font-size: 0.875rem; }
            .actions { margin-top: var(--spacing-4); display: flex; justify-content: space-between; align-items: center; }
             error-display { margin-bottom: var(--spacing-3); }
            .eye-icon { cursor: pointer; color: var(--color-muted-foreground); }
            .eye-icon:hover { color: var(--color-foreground); }
            /* Corrected rule */
            .text-muted { color: var(--color-muted-foreground); }
            .text-xs { font-size: 0.75rem; }
            .px-1 { padding-left: var(--spacing-1); padding-right: var(--spacing-1); }
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
                    <h3>Register</h3>
                    <p>Create a new account.</p>
                </div>
                <div slot="content">
                    <error-display id="form-error" hidden></error-display>
                    <form id="register-form" novalidate>
                        <div class="form-field">
                            <app-label for="email">Email</app-label>
                            <app-input type="email" id="email" name="email" required placeholder="user@example.com"></app-input>
                        </div>
                        <div class="form-field">
                            <app-label for="password">Password</app-label>
                             <app-input type="password" id="password" name="password" required placeholder="••••••••" minlength="6">
                                 <span slot="suffix" class="eye-icon" data-target="password" title="Show/Hide password">
                                     ${finalEyeIcon}
                                 </span>
                             </app-input>
                             <small class="text-muted text-xs px-1">Minimum 8 characters, 1 uppercase, 1 lowercase, 1 number.</small>
                        </div>
                        <div class="form-field">
                            <app-label for="confirmPassword">Confirm Password</app-label>
                            <app-input type="password" id="confirmPassword" name="confirmPassword" required placeholder="••••••••" minlength="6">
                                 <span slot="suffix" class="eye-icon" data-target="confirmPassword" title="Show/Hide password">
                                     ${finalEyeIcon}
                                 </span>
                            </app-input>
                        </div>
                        <div class="actions">
                            <app-button type="button" variant="link" id="login-button">Already have an account?</app-button>
                            <app-button type="submit" id="submit-button" loading="${this._isLoading}">Register</app-button>
                        </div>
                    </form>
                </div>
            </app-card>
        `;
    }

    connectedCallback() {
        super.connectedCallback(); // Sets up shadow DOM and styles

        this.formElement = this.qs('#register-form') as HTMLFormElement; // Assert type
        this.emailInput = this.qs('#email') as AppInput; // Assert type
        this.passwordInput = this.qs('#password') as AppInput; // Assert type
        this.confirmPasswordInput = this.qs('#confirmPassword') as AppInput; // Assert type
        this.submitButton = this.qs('#submit-button') as AppButton; // Assert type
        this.errorDisplay = this.qs('#form-error') as ErrorDisplay; // Assert type
        this.loginButton = this.qs('#login-button') as AppButton; // Assert type

        this.addEventListeners();
    }

     disconnectedCallback(): void {
        super.disconnectedCallback(); // Removes listeners via base class
    }

    // Wrapper for async submit
    private submitHandlerWrapper = (event: Event): void => {
        event.preventDefault();
        this.handleSubmit(event as SubmitEvent).catch(error => {
            console.error("Error during registration form submission:", error);
            this.setError(error?.message || "An unexpected error occurred.");
            this.setLoading(false); // Ensure loading stops on error
        });
    }


    addEventListeners() {
        this.registerListener(this.formElement, 'submit', this.submitHandlerWrapper); // Use wrapper
        this.registerListener(this.loginButton, 'click', this.navigateToLogin);

        // Password visibility toggle for both fields
         this.qsa<HTMLSpanElement>('.eye-icon').forEach(toggle => {
             const targetId = toggle.dataset.target;
             const targetInput = targetId ? this.qs<AppInput>(`#${targetId}`) : null;
             if (toggle && targetInput) {
                 const eyeIcon = icons.eye ?? '👁️';
                 const eyeOffIcon = icons.eyeOff ?? '👁️‍🗨️';
                 // Ensure icons are strings
                 const finalEyeIcon = typeof eyeIcon === 'function' ? eyeIcon() : eyeIcon;
                 const finalEyeOffIcon = typeof eyeOffIcon === 'function' ? eyeOffIcon() : eyeOffIcon;
                 this.registerListener(toggle, 'click', () => {
                     if (!targetInput?.inputElement) return; // Check internal input element
                     const type = targetInput.inputElement.type === 'password' ? 'text' : 'password';
                     targetInput.inputElement.type = type; // Set type on internal input
                     toggle.innerHTML = type === 'password' ? finalEyeIcon : finalEyeOffIcon;
                 });
             }
         });
    }

    private setLoading(isLoading: boolean): void {
        this._isLoading = isLoading;
        if (this.submitButton) {
            this.submitButton.loading = isLoading;
            this.submitButton.disabled = isLoading;
        }
        // Optionally disable form inputs while loading
        this.emailInput?.toggleAttribute('disabled', isLoading);
        this.passwordInput?.toggleAttribute('disabled', isLoading);
        this.confirmPasswordInput?.toggleAttribute('disabled', isLoading);
        this.loginButton?.toggleAttribute('disabled', isLoading);
    }

    private setError(message: string | null): void {
        this._error = message;
        if (this.errorDisplay) {
            this.errorDisplay.message = message || '';
            this.errorDisplay.hidden = !message;
        }
    }

    private async handleSubmit(event: SubmitEvent): Promise<void> {
        if (this._isLoading || !this.formElement || !this.emailInput || !this.passwordInput || !this.confirmPasswordInput) return;

        this.setError(null); // Clear previous API errors

        const formData = new FormData(this.formElement);
        const data = Object.fromEntries(formData.entries());

        const validation = validateForm(registerSchema, data); // Use Zod schema

        if (!validation.success) {
            displayValidationErrors(validation.errors, this.shadow);
            this.setError("Please correct the errors below."); // General form error
            return;
        }

        const validatedData = validation.data;

        this.setLoading(true);

        try {
            // authService.register handles registration and subsequent login attempt
            await authService.register({ login: validatedData.login, password: validatedData.password });
            // Registration/login successful, authService handles state update.
            // Redirect to home page or intended destination
            router.navigate('/');
        } catch (err: any) {
            // Error handled by authService, but we can show it here too
            this.setError(err.message || "Registration failed. Please try again.");
            throw err; // Re-throw for wrapper
        } finally {
            // Loading state handled in wrapper's catch/finally
            // this.setLoading(false);
        }
    }

    private navigateToLogin(): void {
         router.navigate('/login');
    }
}

// Define the component unless already defined
if (!customElements.get('register-form')) {
    customElements.define('register-form', RegisterForm);
}