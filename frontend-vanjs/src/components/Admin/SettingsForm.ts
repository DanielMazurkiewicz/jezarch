import van from "vanjs-core";
import { authStore } from "@/state/authStore";
import api from "@/lib/api";
import { settingsSchema, SettingsFormData } from "@/lib/zodSchemas";
import { zodResolver } from "@/lib/zodResolver";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
import ErrorDisplay from "@/components/Shared/ErrorDisplay";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";
import { AppConfigKeys } from "../../../../backend/src/functionalities/config/models";

const { form, div, p } = van.tags;

// --- Styles ---
const formContainerStyle = style([styles.spaceY4, styles.maxWSm]); // Limit width
const fieldStyle = style([styles.grid, styles.gap1]); // gap-1.5 approx
const errorMsgStyle = style([styles.textXs, styles.textDestructive]);
const loadingOverlayStyle = style([styles.absolute, styles.inset0, styles.flex, styles.itemsCenter, styles.justifyCenter, styles.z10, styles.roundedMd, { backgroundColor: 'rgba(255, 255, 255, 0.7)' }]);

// --- Component ---
const SettingsForm = () => {
    const { token } = authStore;

    // --- State ---
    const isLoading = van.state(true); // Loading initial settings
    const loadError = van.state<string | null>(null);
    const saveStatus = van.state<'idle' | 'saving' | 'success' | 'error'>('idle');
    const saveError = van.state<string | null>(null);

    // Form field states
    const portValue = van.state<string>("8080"); // Use string for input binding
    const languageValue = van.state("en");
    const formErrors = van.state<Partial<Record<keyof SettingsFormData, string>>>({});
    // Track if form has been modified since last load/save
    const initialPort = van.state<string>("8080"); // Store initial fetched values
    const initialLanguage = van.state("en");
    const isDirty = van.derive(() => portValue.val !== initialPort.val || languageValue.val !== initialLanguage.val);

    // --- Data Fetching & Form Population ---
    const fetchSettings = async () => {
        if (!token.val) {
            isLoading.val = false;
            loadError.val = "Authentication token not found.";
            return;
        }
        isLoading.val = true;
        loadError.val = null;
        try {
            const [portConfig, langConfig] = await Promise.all([
                 api.getConfig(AppConfigKeys.PORT, token.val),
                 api.getConfig(AppConfigKeys.DEFAULT_LANGUAGE, token.val)
            ]);
            const fetchedPortStr = portConfig?.[AppConfigKeys.PORT] || '8080';
            const fetchedLang = langConfig?.[AppConfigKeys.DEFAULT_LANGUAGE] || 'en';

            portValue.val = fetchedPortStr; // Set state as string
            languageValue.val = fetchedLang;

            // Store initial values after fetch
            initialPort.val = fetchedPortStr;
            initialLanguage.val = fetchedLang;

            formErrors.val = {}; // Clear errors on successful load
        } catch (err: any) {
             console.error("SettingsForm: Failed to load settings:", err);
             loadError.val = err.message || 'Failed to load settings';
             // Keep default values in form on error
             initialPort.val = "8080"; // Reset initial values too
             initialLanguage.val = "en";
        } finally {
            isLoading.val = false;
        }
    };

    // Fetch on mount and token change (using derive for reactivity)
    van.derive(() => {
        token.val; // Depend on token
        fetchSettings();
    });


    // --- Form Handling ---
    const resolver = zodResolver(settingsSchema);

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!token.val) return;
        saveStatus.val = 'saving';
        saveError.val = null;
        formErrors.val = {};

        // Prepare data for validation, ensuring port is coerced if needed
        const formData = {
            [AppConfigKeys.PORT]: portValue.val, // Pass the string value
            [AppConfigKeys.DEFAULT_LANGUAGE]: languageValue.val,
        };

        // The resolver uses coerce.number() so validation handles the string->number conversion
        const validationResult = resolver(formData);
        if (!validationResult.success) {
            formErrors.val = validationResult.errors;
            saveStatus.val = 'error'; // Indicate validation error
            saveError.val = "Validation failed. Please check the fields.";
            isLoading.val = false; // Stop loading on validation error
            return;
        }

        const dataToSave = validationResult.data; // dataToSave.port is now a number

        try {
            await Promise.all([
                api.setConfig(AppConfigKeys.PORT, String(dataToSave[AppConfigKeys.PORT]), token.val), // Convert number back to string for API
                api.setConfig(AppConfigKeys.DEFAULT_LANGUAGE, dataToSave[AppConfigKeys.DEFAULT_LANGUAGE], token.val)
            ]);
            saveStatus.val = 'success';

            // Update initial values on successful save to reset dirty state
            initialPort.val = String(dataToSave[AppConfigKeys.PORT]);
            initialLanguage.val = dataToSave[AppConfigKeys.DEFAULT_LANGUAGE];

            // Update displayed values as well (though should already match dataToSave)
            portValue.val = String(dataToSave[AppConfigKeys.PORT]);
            languageValue.val = dataToSave[AppConfigKeys.DEFAULT_LANGUAGE];

            setTimeout(() => saveStatus.val = 'idle', 2000); // Reset indicator
        } catch (err: any) {
            saveError.val = err.message || 'Failed to save settings';
            saveStatus.val = 'error';
        } finally {
             // isLoading.val = false; // No, keep spinner until status resets to idle
        }
    };

    // --- Render ---
    // Loading State
    if (isLoading.val) {
        return Card(CardContent({ class: `${styles.p6} ${styles.flex} ${styles.justifyCenter}` }, LoadingSpinner({}))); // Pass empty props
    }
    // Load Error State
     if (loadError.val) {
        return Card(CardContent({ class: styles.p6 }, ErrorDisplay({ message: loadError.val })));
     }

    // Main Form Content
    return Card( // Removed forced white bg
        CardHeader(
            CardTitle("Application Settings"),
            CardDescription("Configure server port and default language. Changes may require a server restart.")
        ),
        CardContent(
            form({ class: formContainerStyle, onsubmit: handleSubmit },
                // Display save errors
                () => saveError.val ? ErrorDisplay({ message: saveError.val }) : null,

                // Server Port Field
                div({ class: fieldStyle },
                    Label({ for: "port" }, "Server Port"),
                    Input({
                        id: "port",
                        type: "number", // Use number type
                        value: portValue, // Bind string state directly
                        oninput: (e: Event) => portValue.val = (e.target as HTMLInputElement).value,
                        'aria-invalid': () => !!formErrors.val[AppConfigKeys.PORT],
                        class: () => formErrors.val[AppConfigKeys.PORT] ? styles.borderDestructive : ''
                     }),
                    () => formErrors.val[AppConfigKeys.PORT] ? p({ class: errorMsgStyle }, formErrors.val[AppConfigKeys.PORT]) : null
                ),

                // Default Language Field
                div({ class: fieldStyle },
                    Label({ for: "language" }, "Default Language"),
                    Input({
                        id: "language",
                        value: languageValue, // Bind state
                        oninput: (e: Event) => languageValue.val = (e.target as HTMLInputElement).value,
                        placeholder: "e.g., en, de",
                        'aria-invalid': () => !!formErrors.val[AppConfigKeys.DEFAULT_LANGUAGE],
                        class: () => formErrors.val[AppConfigKeys.DEFAULT_LANGUAGE] ? styles.borderDestructive : ''
                     }),
                    () => formErrors.val[AppConfigKeys.DEFAULT_LANGUAGE] ? p({ class: errorMsgStyle }, formErrors.val[AppConfigKeys.DEFAULT_LANGUAGE]) : null
                ),

                // Save Button with Status Indicator
                 Button({
                    type: "submit",
                    // Derive disabled state reactively
                    disabled: () => saveStatus.val === 'saving' || !isDirty.val
                    },
                    // Reactive button content based on saveStatus
                    van.derive(() => {
                        switch(saveStatus.val) {
                            case 'saving': return [LoadingSpinner({ size: "sm", class: styles.pr2 }), " Saving..."];
                            case 'success': return "Saved!";
                            case 'error': return "Save Settings"; // Reset text on error for retry
                            default: return "Save Settings";
                        }
                    })
                 )
            ) // End Form
         ) // End CardContent
    ); // End Card
};

export default SettingsForm;