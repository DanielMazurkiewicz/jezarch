import { Component, createSignal, Show, JSX } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import { z, ZodIssue } from 'zod';
// Removed @modular-forms/solid imports
import { registerSchema, RegisterFormData } from '@/lib/zodSchemas';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Icon } from '@/components/shared/Icon';
import styles from './RegisterPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

const RegisterPage: Component = () => {
    const [, { register: registerUser, clearError }] = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isSuccess, setIsSuccess] = createSignal(false);
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);

    // State for form fields
    const [loginValue, setLoginValue] = createSignal('');
    const [passwordValue, setPasswordValue] = createSignal('');
    const [confirmPasswordValue, setConfirmPasswordValue] = createSignal('');
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof RegisterFormData, string>>>({});

    // REMOVED hasErrors check here

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = {
            login: loginValue(),
            password: passwordValue(),
            confirmPassword: confirmPasswordValue()
        };
        const result = registerSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof RegisterFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof RegisterFormData] = err.message;
                }
            });
            setFormErrors(errors);
            return false;
        }
        return true;
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault();
        clearError();
        setApiError(null);
        setIsSuccess(false);

        if (!validateForm()) return; // Validate on submit

        setIsSubmitting(true);
        const { confirmPassword, ...apiData } = { login: loginValue(), password: passwordValue(), confirmPassword: confirmPasswordValue() }; // Construct data
        const success = await registerUser(apiData);
        setIsSubmitting(false);

        if (success) {
            setIsSuccess(true);
        } else {
            setApiError("Registration failed. Please try again."); // Set local error
        }
    };

    return (
        <Card class={styles.registerCard}>
            <CardHeader style={{ "text-align": 'center', "padding-top": '2rem' }}>
                <CardTitle>Create Account</CardTitle>
                <CardDescription>Enter your details to register.</CardDescription>
            </CardHeader>

            <Show
                when={!isSuccess()}
                fallback={
                    <CardContent class={styles.successMessageContainer}>
                        <div class={styles.successAlert} role="alert">
                           <Icon name="CheckCircle" size="1.2em" class={styles.successAlertIcon} />
                           <div>
                                <p class={styles.successAlertTitle}>Registration Successful!</p>
                                <p class={styles.successAlertDescription}>You can now log in.</p>
                           </div>
                        </div>
                        <Button variant="outline" onClick={() => navigate('/login', { state: location.state, replace: true })} class={styles.fullWidth}>
                            Go to Login
                        </Button>
                    </CardContent>
                }
            >
                <form onSubmit={handleSubmit} class={styles.formContainer}>
                    <CardContent class={styles.formContent}>
                        <Show when={apiError()}>
                            {(err) => <ErrorDisplay message={err()} />}
                        </Show>

                        {/* Login Input */}
                        <div class={styles.formGroup}>
                            <FormLabel for="register-login-input" required invalid={!!formErrors().login}>Login</FormLabel>
                            <Input
                                id="register-login-input"
                                type="text"
                                required
                                placeholder="Choose a username"
                                value={loginValue()}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setLoginValue(e.currentTarget.value); }}
                                aria-invalid={!!formErrors().login}
                                aria-errormessage="register-login-error"
                            />
                            <Show when={formErrors().login}><p id="register-login-error" class={styles.errorText}>{formErrors().login}</p></Show>
                        </div>

                        {/* Password Input */}
                        <div class={styles.formGroup}>
                            <FormLabel for="register-password-input" required invalid={!!formErrors().password}>Password</FormLabel>
                            <Input
                                id="register-password-input"
                                type="password"
                                required
                                placeholder="Create a strong password"
                                value={passwordValue()}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setPasswordValue(e.currentTarget.value); }}
                                aria-invalid={!!formErrors().password}
                                aria-errormessage="register-password-error"
                            />
                            <Show when={formErrors().password}><p id="register-password-error" class={styles.errorText}>{formErrors().password}</p></Show>
                        </div>

                        {/* Confirm Password Input */}
                        <div class={styles.formGroup}>
                            <FormLabel for="register-confirm-password-input" required invalid={!!formErrors().confirmPassword}>Confirm Password</FormLabel>
                            <Input
                                id="register-confirm-password-input"
                                type="password"
                                required
                                placeholder="Re-enter your password"
                                value={confirmPasswordValue()}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setConfirmPasswordValue(e.currentTarget.value); }}
                                aria-invalid={!!formErrors().confirmPassword}
                                aria-errormessage="register-confirm-password-error"
                            />
                             <Show when={formErrors().confirmPassword}><p id="register-confirm-password-error" class={styles.errorText}>{formErrors().confirmPassword}</p></Show>
                        </div>

                    </CardContent>

                    <CardFooter class={styles.formFooter}>
                         {/* --- FIX: Simplified disabled check --- */}
                        <Button type="submit" disabled={isSubmitting()} class={styles.fullWidth}>
                             <Show when={isSubmitting()} fallback="Create Account">
                                <LoadingSpinner size="sm" class={styles.iconMargin}/> Creating Account...
                            </Show>
                        </Button>
                        <p class={styles.switchToLoginText}>
                            Already have an account?{" "}
                            <Button
                                variant="link" type="button"
                                onClick={() => navigate('/login', { state: location.state, replace: true })}
                            >
                                Login
                            </Button>
                        </p>
                    </CardFooter>
                </form>
            </Show>
        </Card>
    );
};

export default RegisterPage;