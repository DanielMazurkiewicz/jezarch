import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { navigate } from "@/lib/router";
import { loginSchema, LoginFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver"; // Assuming a simple Zod resolver utility
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import ErrorDisplay from "@/components/Shared/ErrorDisplay"; // Ensure path is correct
import LoadingSpinner from "@/components/Shared/LoadingSpinner"; // Ensure path is correct
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";

const { form, div, p, button } = van.tags;

// --- Styles ---
const formStyle = style([styles.spaceY4]); // Spacing between form elements
const fieldStyle = style([styles.grid, styles.gap1]); // gap-1.5 equivalent
const errorMsgStyle = style([styles.textXs, styles.textDestructive, styles.fontMedium]);
const footerTextStyle = style([styles.textCenter, styles.textSm, styles.textMutedForeground]);
const switchLinkStyle = style([
    styles.p0, // No padding
    styles.fontSemibold,
    styles.textPrimary,
    { textDecoration: 'none', ':hover': { textDecoration: 'underline' }, height: 'auto' } // Equivalent to h-auto, link styling
]);
const fullWidthBtn = style([styles.wFull]);

// --- Component ---
interface LoginFormProps {
    onSwitchToRegister: () => void;
}

const LoginForm = ({ onSwitchToRegister }: LoginFormProps) => {
    const { login, isLoading, error, clearError } = authStore;

    // Local state for form fields and errors using VanJS states
    const loginValue = van.state("");
    const passwordValue = van.state("");
    const formErrors = van.state<Partial<Record<keyof LoginFormData, string>>>({});

    // Zod resolver function (simplified)
    const resolver = zodResolver(loginSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        clearError(); // Clear global auth error
        formErrors.val = {}; // Clear local form errors

        const formData: LoginFormData = {
            login: loginValue.val,
            password: passwordValue.val,
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            return;
        }

        const success = await login(formData);
        if (success) {
            // Navigation likely handled by App based on auth state change
             console.log("Login successful, waiting for redirection...");
        } else {
            console.error("Login attempt failed in form.");
            // Global authError state is set by the store
        }
    };

    // Clear errors when inputs change
    van.derive(() => { loginValue.val; passwordValue.val; formErrors.val = {}; clearError(); });

    return Card({ class: `${styles.wFull} ${styles.maxWSm} ${styles.shadowLg}` }, // Removed forced white bg, rely on theme
        CardHeader({ class: `${styles.textCenter} ${styles.pt6}` }, // Increased padding top
            CardTitle({ class: styles.text2xl }, "Welcome Back"),
            CardDescription("Sign in to access your JezArch account.")
        ),
        form({ class: formStyle, onsubmit: handleSubmit },
            CardContent({ class: styles.spaceY4 }, // Ensure content has spacing
                // Global Error Display
                () => error.val ? ErrorDisplay({ message: error.val }) : null,

                // Login Field
                div({ class: fieldStyle },
                    Label({ for: "login" }, "Login"),
                    Input({
                        id: "login",
                        type: "text",
                        placeholder: "Your username",
                        value: loginValue, // Bind state
                        oninput: (e: Event) => loginValue.val = (e.target as HTMLInputElement).value,
                        'aria-invalid': () => !!formErrors.val.login,
                        class: () => formErrors.val.login ? styles.borderDestructive : ''
                    }),
                    () => formErrors.val.login ? p({ class: errorMsgStyle }, formErrors.val.login) : null
                ),

                // Password Field
                div({ class: fieldStyle },
                    Label({ for: "password" }, "Password"),
                    Input({
                        id: "password",
                        type: "password",
                        placeholder: "••••••••",
                        value: passwordValue, // Bind state
                        oninput: (e: Event) => passwordValue.val = (e.target as HTMLInputElement).value,
                        'aria-invalid': () => !!formErrors.val.password,
                        class: () => formErrors.val.password ? styles.borderDestructive : ''
                    }),
                    () => formErrors.val.password ? p({ class: errorMsgStyle }, formErrors.val.password) : null
                )
            ),
            CardFooter({ class: `${styles.flexCol} ${styles.gap4} ${styles.pt4}` },
                Button({ type: "submit", class: fullWidthBtn, disabled: isLoading },
                    () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null, // Use pr2 for spacing
                    () => isLoading.val ? "Signing In..." : "Sign In"
                ),
                p({ class: footerTextStyle },
                    "Don't have an account? ",
                    Button({
                        variant: "link",
                        type: "button",
                        onclick: onSwitchToRegister,
                        class: switchLinkStyle
                        },
                        "Register"
                    )
                )
            )
        )
    );
};

export default LoginForm;
