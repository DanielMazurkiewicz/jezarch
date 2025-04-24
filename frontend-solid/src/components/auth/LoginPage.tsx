import { Component, createSignal, Show, JSX } from 'solid-js';
import { useNavigate, useLocation } from '@solidjs/router';
import { useAuth } from '@/context/AuthContext';
import { z, ZodIssue } from 'zod';
// Removed @modular-forms/solid imports
import { loginSchema, LoginFormData } from '@/lib/zodSchemas';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import styles from './LoginPage.module.css'; // Import CSS Module (Typed)
import { cn } from '@/lib/utils';

const LoginPage: Component = () => {
    const [, { login, clearError }] = useAuth(); // Get actions from context
    const navigate = useNavigate();
    const location = useLocation();
    const getRedirectPath = () => {
        const state = location.state as { from?: string } | null | undefined;
        return state?.from || "/";
    };

    // State for form fields
    const [loginValue, setLoginValue] = createSignal('');
    const [passwordValue, setPasswordValue] = createSignal('');
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof LoginFormData, string>>>({});
    const [apiError, setApiError] = createSignal<string | null>(null);
    const [isSubmitting, setIsSubmitting] = createSignal(false);

    // REMOVED hasErrors check here as it's not reliable without real-time validation

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors before validating
        const formData = { login: loginValue(), password: passwordValue() };
        const result = loginSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof LoginFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof LoginFormData] = err.message;
                }
            });
            setFormErrors(errors);
            return false;
        }
        // No need to setFormErrors({}) here again, it's cleared at the start
        return true;
    };

    const handleSubmit = async (event: Event) => {
        event.preventDefault(); // Prevent default form submission
        clearError();
        setApiError(null);
        if (!validateForm()) return; // Validate before submitting

        setIsSubmitting(true);
        const success = await login({ login: loginValue(), password: passwordValue() });
        setIsSubmitting(false);

        if (success) {
            const from = getRedirectPath();
            navigate(from, { replace: true });
        } else {
            // Error is handled by the context, but show a generic message locally
            setApiError("Login failed. Please check your credentials.");
        }
    };

    return (
        <Card class={styles.loginCard}>
            <CardHeader style={{ "text-align": 'center', "padding-top": '2rem' }}>
                <CardTitle>Welcome Back</CardTitle>
                <CardDescription>Sign in to access your JezArch account.</CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit} class={styles.formContainer}>
                <CardContent class={styles.formContent}>
                    <Show when={apiError()}>
                        {(err) => <ErrorDisplay message={err()} />}
                    </Show>

                    {/* Login Input */}
                    <div class={styles.formGroup}>
                        <FormLabel for="login-input" required invalid={!!formErrors().login}>Login</FormLabel>
                        <Input
                            id="login-input"
                            type="text"
                            required
                            placeholder="Your username"
                            value={loginValue()}
                            // --- FIX: Removed validateForm() call ---
                            onInput={(e) => { setLoginValue(e.currentTarget.value); /* Optionally clear error on input: setFormErrors(p => ({ ...p, login: undefined })) */ }}
                            aria-invalid={!!formErrors().login}
                            aria-errormessage="login-error"
                        />
                        <Show when={formErrors().login}>
                            <p id="login-error" class={styles.errorText}>{formErrors().login}</p>
                        </Show>
                    </div>

                    {/* Password Input */}
                    <div class={styles.formGroup}>
                        <FormLabel for="password-input" required invalid={!!formErrors().password}>Password</FormLabel>
                        <Input
                            id="password-input"
                            type="password"
                            required
                            placeholder="••••••••"
                            value={passwordValue()}
                             // --- FIX: Removed validateForm() call ---
                            onInput={(e) => { setPasswordValue(e.currentTarget.value); /* Optionally clear error: setFormErrors(p => ({ ...p, password: undefined })) */ }}
                            aria-invalid={!!formErrors().password}
                            aria-errormessage="password-error"
                        />
                        <Show when={formErrors().password}>
                            <p id="password-error" class={styles.errorText}>{formErrors().password}</p>
                        </Show>
                    </div>
                </CardContent>

                <CardFooter class={styles.formFooter}>
                    {/* --- FIX: Simplified disabled check --- */}
                    <Button type="submit" disabled={isSubmitting()} class={styles.fullWidth}>
                        <Show when={isSubmitting()} fallback="Sign In">
                            <LoadingSpinner size="sm" class={styles.iconMargin}/> Signing In...
                        </Show>
                    </Button>
                    <p class={styles.switchToRegisterText}>
                        Don't have an account?{" "}
                        <Button
                            variant="link"
                            type="button"
                            onClick={() => navigate('/register', { state: location.state, replace: true })}
                        >
                            Register
                        </Button>
                    </p>
                </CardFooter>
            </form>
        </Card>
    );
};

export default LoginPage;