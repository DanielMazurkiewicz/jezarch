import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import { navigate } from "@/lib/router";
import { registerSchema, RegisterFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver"; // Assuming a simple Zod resolver utility
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"; // Assuming Alert component exists
import * as icons from "@/components/ui/icons";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";

const { form, div, p, button } = van.tags;

// --- Styles (can reuse from LoginForm or define specific ones) ---
const formStyle = style([styles.spaceY4]);
const fieldStyle = style([styles.grid, styles.gap1]); // gap-1.5 equivalent
const errorMsgStyle = style([styles.textXs, styles.textDestructive, styles.fontMedium]);
const footerTextStyle = style([styles.textCenter, styles.textSm, styles.textMutedForeground]);
const switchLinkStyle = style([
    styles.p0, styles.fontSemibold, styles.textPrimary,
    { textDecoration: 'none', ':hover': { textDecoration: 'underline' }, height: 'auto' }
]);
const fullWidthBtn = style([styles.wFull]);
const successAlertStyle = style([
    // Add specific styles if needed, e.g., border color
]);

// --- Component ---
interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

const RegisterForm = ({ onSwitchToLogin }: RegisterFormProps) => {
    const { register: registerUser, isLoading, error, clearError } = authStore;

    // Local state for form fields, errors, and success status
    const loginValue = van.state("");
    const passwordValue = van.state("");
    const confirmPasswordValue = van.state("");
    const formErrors = van.state<Partial<Record<keyof RegisterFormData, string>>>({});
    const isSuccess = van.state(false);

    const resolver = zodResolver(registerSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        clearError();
        formErrors.val = {};
        isSuccess.val = false;

        const formData: RegisterFormData = {
            login: loginValue.val,
            password: passwordValue.val,
            confirmPassword: confirmPasswordValue.val,
        };

        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            return;
        }

        // Exclude confirmPassword for API call
        const { confirmPassword, ...apiData } = formData;
        const success = await registerUser(apiData);
        if (success) {
            isSuccess.val = true;
            // Optionally clear form fields on success
            loginValue.val = "";
            passwordValue.val = "";
            confirmPasswordValue.val = "";
        } else {
            // Global authError is set by the store
            console.error("Registration attempt failed in form.");
        }
    };

     // Clear errors when inputs change
     van.derive(() => { loginValue.val; passwordValue.val; confirmPasswordValue.val; formErrors.val = {}; clearError(); });

    return Card({ class: `${styles.wFull} ${styles.maxWSm} ${styles.shadowLg}` }, // Rely on theme for bg
        CardHeader({ class: `${styles.textCenter} ${styles.pt6}` },
            CardTitle({ class: styles.text2xl }, "Create Account"),
            CardDescription("Enter your details to register.")
        ),
        // Conditionally render Success message or Form
        () => isSuccess.val
            ? CardContent({ class: styles.spaceY4 },
                Alert({ variant: "default", class: successAlertStyle }, // Use Alert component
                    icons.CheckCircleIcon({ class: "h-5 w-5 text-green-600" }), // Assuming icon available
                    AlertTitle("Registration Successful!"),
                    AlertDescription("Your account has been created. You can now log in.")
                ),
                Button({ variant: "outline", class: fullWidthBtn, onclick: onSwitchToLogin },
                    "Go to Login"
                )
              )
            : form({ class: formStyle, onsubmit: handleSubmit },
                CardContent({ class: styles.spaceY4 },
                    // Global Error Display
                    () => error.val ? ErrorDisplay({ message: error.val }) : null,

                    // Login Field
                    div({ class: fieldStyle },
                        Label({ for: "reg-login" }, "Login"),
                        Input({
                            id: "reg-login",
                            type: "text",
                            placeholder: "Choose a username",
                            value: loginValue,
                            oninput: (e: Event) => loginValue.val = (e.target as HTMLInputElement).value,
                            'aria-invalid': () => !!formErrors.val.login,
                            class: () => formErrors.val.login ? styles.borderDestructive : ''
                        }),
                        () => formErrors.val.login ? p({ class: errorMsgStyle }, formErrors.val.login) : null
                    ),

                    // Password Field
                    div({ class: fieldStyle },
                        Label({ for: "reg-password" }, "Password"),
                        Input({
                            id: "reg-password",
                            type: "password",
                            placeholder: "Create a strong password",
                            value: passwordValue,
                            oninput: (e: Event) => passwordValue.val = (e.target as HTMLInputElement).value,
                            'aria-invalid': () => !!formErrors.val.password,
                            class: () => formErrors.val.password ? styles.borderDestructive : ''
                        }),
                        () => formErrors.val.password ? p({ class: errorMsgStyle }, formErrors.val.password) : null
                    ),

                    // Confirm Password Field
                    div({ class: fieldStyle },
                        Label({ for: "confirmPassword" }, "Confirm Password"),
                        Input({
                            id: "confirmPassword",
                            type: "password",
                            placeholder: "Re-enter your password",
                            value: confirmPasswordValue,
                            oninput: (e: Event) => confirmPasswordValue.val = (e.target as HTMLInputElement).value,
                            'aria-invalid': () => !!formErrors.val.confirmPassword,
                            class: () => formErrors.val.confirmPassword ? styles.borderDestructive : ''
                        }),
                        () => formErrors.val.confirmPassword ? p({ class: errorMsgStyle }, formErrors.val.confirmPassword) : null
                    )
                ),
                CardFooter({ class: `${styles.flexCol} ${styles.gap4} ${styles.pt4}` },
                    Button({ type: "submit", class: fullWidthBtn, disabled: isLoading },
                        () => isLoading.val ? LoadingSpinner({ size: "sm", class: styles.pr2 }) : null,
                        () => isLoading.val ? "Creating Account..." : "Create Account"
                    ),
                    p({ class: footerTextStyle },
                        "Already have an account? ",
                        Button({
                            variant: "link",
                            type: "button",
                            onclick: onSwitchToLogin,
                            class: switchLinkStyle
                            },
                            "Login"
                        )
                    )
                )
            ) // End of form conditional rendering
    );
};

export default RegisterForm;
