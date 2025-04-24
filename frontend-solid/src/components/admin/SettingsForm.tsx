import { Component, createSignal, createResource, Show, onMount, createEffect, onCleanup } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { settingsSchema, SettingsFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { AppConfigKeys } from '../../../../backend/src/functionalities/config/models';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FormLabel } from '@/components/ui/FormLabel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
// import { toast } from "sonner"; // TODO: Replace with NotificationContext
import { cn } from '@/lib/utils';
import styles from './SettingsForm.module.css'; // Import CSS Module (Typed)
import type { JSX } from 'solid-js';

const SettingsForm: Component = () => {
    const [authState] = useAuth();
    const [loadError, setLoadError] = createSignal<string | null>(null);
    const [saveStatus, setSaveStatus] = createSignal<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = createSignal<string | null>(null);
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof SettingsFormData, string>>>({});
    let saveTimeoutId: ReturnType<typeof setTimeout> | undefined;

    // TODO: Inject notification hook: const { addNotification } = useNotifications();

    // State for form fields
    const [port, setPort] = createSignal<number | string>(8080); // Use string to handle empty input
    const [language, setLanguage] = createSignal('en');
    const [initialPort, setInitialPort] = createSignal<number>(8080); // To track dirty state
    const [initialLanguage, setInitialLanguage] = createSignal('en');

    const isDirty = () => String(port()) !== String(initialPort()) || language() !== initialLanguage();
    // REMOVED hasErrors and isValid checks as they are not reliable without real-time validation

    // Resource to fetch initial settings
    const [initialSettings] = createResource(
        () => authState.token, // Depends on token
        async (token) => {
            if (!token) throw new Error("Authentication token not found.");
            setLoadError(null); // Clear previous load errors
            console.log("Fetching initial settings...");
            try {
                const [portConfig, langConfig] = await Promise.all([
                     api.getConfig(AppConfigKeys.PORT, token).catch(() => ({ [AppConfigKeys.PORT]: '8080' })),
                     api.getConfig(AppConfigKeys.DEFAULT_LANGUAGE, token).catch(() => ({ [AppConfigKeys.DEFAULT_LANGUAGE]: 'en' }))
                ]);
                const fetchedPort = parseInt(portConfig?.[AppConfigKeys.PORT] || '8080', 10);
                const fetchedLang = langConfig?.[AppConfigKeys.DEFAULT_LANGUAGE] || 'en';

                return {
                    [AppConfigKeys.PORT]: fetchedPort,
                    [AppConfigKeys.DEFAULT_LANGUAGE]: fetchedLang,
                };
            } catch (err: any) {
                console.error("Failed to load initial settings:", err);
                setLoadError(err.message || 'Failed to load settings');
                throw err; // Propagate error to resource state
            }
        }
    );

    // Effect to set form values once initial settings are loaded
    createEffect(() => {
        const data = initialSettings();
        if (data && !initialSettings.loading && !initialSettings.error) {
             console.log("Setting form values from fetched settings:", data);
             const initialP = data[AppConfigKeys.PORT];
             const initialL = data[AppConfigKeys.DEFAULT_LANGUAGE];
             setPort(initialP);
             setLanguage(initialL);
             setInitialPort(initialP);
             setInitialLanguage(initialL);
             setFormErrors({}); // Clear any initial errors
        }
    });

    // Clear timeout on component cleanup
    onCleanup(() => {
        if (saveTimeoutId) clearTimeout(saveTimeoutId);
    });

    // Validation function
    const validateForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = {
             [AppConfigKeys.PORT]: port(),
             [AppConfigKeys.DEFAULT_LANGUAGE]: language(),
        };
         const result = settingsSchema.safeParse(formData);
         if (!result.success) {
            const errors: Partial<Record<keyof SettingsFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof SettingsFormData] = err.message;
                }
            });
            setFormErrors(errors);
            return false;
        }
        return true;
    };


    const handleFormSubmit = async (event: Event) => {
        event.preventDefault(); // Prevent default form submission
        const token = authState.token;
        if (!token || !validateForm()) return; // Validate before submit

        setSaveStatus('saving');
        setSaveError(null);
        if (saveTimeoutId) clearTimeout(saveTimeoutId);

        try {
            // Values are directly from signals
            const currentPort = Number(port()); // Ensure port is number
            const currentLang = language();

            await Promise.all([
                api.setConfig(AppConfigKeys.PORT, String(currentPort), token),
                api.setConfig(AppConfigKeys.DEFAULT_LANGUAGE, currentLang, token)
            ]);
            setSaveStatus('success');
            // TODO: addNotification({ type: 'success', message: 'Settings saved successfully.' });
            console.log("Settings saved successfully");
            // Reset dirty state by updating initial values
            setInitialPort(currentPort);
            setInitialLanguage(currentLang);
            // Optionally reset status indicator after a delay
            saveTimeoutId = setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (err: any) {
            const msg = err.message || 'Failed to save settings';
            setSaveError(msg);
            setSaveStatus('error');
            // TODO: addNotification({ type: 'error', message: `Save failed: ${msg}` });
            console.error("Save settings error:", msg);
        }
    };

    return (
        <Card class={styles.settingsCard}>
            <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>Configure server port and default language. Changes may require a server restart.</CardDescription>
            </CardHeader>
            <CardContent>
                 <Show when={initialSettings.loading}>
                     <div class="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
                 </Show>
                  <Show when={loadError()}>
                     <ErrorDisplay message={loadError() ?? 'Unknown loading error'} /> {/* Ensure message is string */}
                  </Show>
                  <Show when={!initialSettings.loading && !loadError()}>
                    <form onSubmit={handleFormSubmit} class={styles.settingsFormContainer}>
                        <Show when={saveError()}><ErrorDisplay message={saveError() ?? 'Unknown save error'} /></Show> {/* Ensure message is string */}

                         {/* Port Input */}
                         <div class={styles.formGroup}>
                            <FormLabel for="port-input" required invalid={!!formErrors()[AppConfigKeys.PORT]}>Server Port</FormLabel>
                            <Input
                                id="port-input"
                                type="number"
                                required
                                value={String(port())}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setPort(e.currentTarget.value); }}
                                aria-invalid={!!formErrors()[AppConfigKeys.PORT]}
                                aria-errormessage="port-error"
                            />
                             <Show when={formErrors()[AppConfigKeys.PORT]}>
                                 <p id="port-error" class={styles.errorMessage}>{formErrors()[AppConfigKeys.PORT]}</p>
                             </Show>
                        </div>

                         {/* Language Input */}
                        <div class={styles.formGroup}>
                            <FormLabel for="language-input" required invalid={!!formErrors()[AppConfigKeys.DEFAULT_LANGUAGE]}>Default Language</FormLabel>
                            <Input
                                id="language-input"
                                type="text"
                                required
                                placeholder="e.g., en, de"
                                value={language()}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setLanguage(e.currentTarget.value); }}
                                aria-invalid={!!formErrors()[AppConfigKeys.DEFAULT_LANGUAGE]}
                                aria-errormessage="language-error"
                            />
                             <Show when={formErrors()[AppConfigKeys.DEFAULT_LANGUAGE]}>
                                <p id="language-error" class={styles.errorMessage}>{formErrors()[AppConfigKeys.DEFAULT_LANGUAGE]}</p>
                            </Show>
                        </div>

                         <div class={styles.formActions}>
                             {/* --- FIX: Simplified disabled check --- */}
                             <Button type="submit" disabled={saveStatus() === 'saving' || !isDirty()}>
                                 <Show when={saveStatus() === 'saving'} fallback={
                                      <Show when={saveStatus() === 'success'} fallback={'Save Settings'}>
                                          Saved!
                                      </Show>
                                 }>
                                     <LoadingSpinner size="sm" class={styles.saveStatusIcon} /> Saving...
                                 </Show>
                             </Button>
                         </div>
                    </form>
                 </Show>
            </CardContent>
        </Card>
    );
};

export default SettingsForm;