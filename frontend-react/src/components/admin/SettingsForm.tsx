import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AppConfigKeys } from '../../../../backend/src/functionalities/config/models'; // Import enum for keys
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { settingsSchema, SettingsFormData } from '@/lib/zodSchemas'; // Import schema and type
import { toast } from "sonner"; // Import toast

const SettingsForm: React.FC = () => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [originalPort, setOriginalPort] = useState<number | null>(null);

    const { register, handleSubmit, reset, setValue, formState: { errors, isDirty }, watch } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            [AppConfigKeys.PORT]: 8080,
            [AppConfigKeys.DEFAULT_LANGUAGE]: 'en',
        }
    });

    const watchedPort = watch(AppConfigKeys.PORT);

    // Fetch current settings on mount
    const fetchSettings = useCallback(async () => {
        console.log("SettingsForm: fetchSettings triggered.");
        if (!token) { /* ... */ return; }
        setIsLoading(true); setLoadError(null);
        let portToSet = 8080; let langToSet = 'en';

        try {
            const [portResult, langResult] = await Promise.all([
                 api.getConfig(AppConfigKeys.PORT, token).catch(err => { console.error("Error fetching port:", err); return null; }),
                 api.getConfig(AppConfigKeys.DEFAULT_LANGUAGE, token).catch(err => { console.error("Error fetching language:", err); return null; })
            ]);

            // --- WORKAROUND for incorrect backend response ---
            // Attempt to extract value from the unexpected nested structure {"key": {"value": "..."}}
            // If the backend is fixed later, this code should still work for the correct structure {"key": "..."}
            const getNestedValue = (response: any, key: AppConfigKeys): string | null | undefined => {
                if (response && typeof response === 'object' && key in response) {
                    const primaryValue = response[key];
                    // Check if primaryValue is the nested object {value: ...}
                    if (primaryValue && typeof primaryValue === 'object' && 'value' in primaryValue) {
                         console.log(`SettingsForm: Detected nested structure for key "${key}", extracting inner 'value'.`);
                         return primaryValue.value; // Extract from nested structure
                    }
                    // Otherwise, assume it's the direct value (the correct structure)
                    return primaryValue;
                }
                return undefined; // Key not found
            };

            const portStr = getNestedValue(portResult, AppConfigKeys.PORT);
            const langStr = getNestedValue(langResult, AppConfigKeys.DEFAULT_LANGUAGE);
            // --- End WORKAROUND ---

            console.log(`SettingsForm: Value extracted for Port:`, portStr, `(Type: ${typeof portStr})`);
            console.log(`SettingsForm: Value extracted for Lang:`, langStr, `(Type: ${typeof langStr})`);


            // Validate and parse Port (using portStr)
            if (portStr !== undefined && portStr !== null && typeof portStr === 'string') {
                const parsedPort = parseInt(portStr, 10);
                if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
                    portToSet = parsedPort;
                    console.log(`SettingsForm: Parsed Port: ${portToSet}`);
                } else { console.warn(`SettingsForm: Received invalid port value from API: "${portStr}". Using default 8080.`); }
            } else { console.warn(`SettingsForm: Port config value not found, null, or invalid type. Using default 8080. Received:`, portStr); }

             // Validate and use Language (using langStr)
            if (langStr !== undefined && langStr !== null && typeof langStr === 'string' && langStr.trim().length > 0) {
                langToSet = langStr;
                 console.log(`SettingsForm: Validated Lang: "${langToSet}"`);
            } else {
                 console.warn(`SettingsForm: Received invalid, null, or missing language value. Using default 'en'. Received:`, langStr);
            }

        } catch (err: any) {
             console.error("SettingsForm: Unexpected error during Promise.all:", err);
             setLoadError(err.message || 'Failed to load settings');
             portToSet = 8080;
             langToSet = 'en';
        } finally {
            console.log(`SettingsForm: Setting form values - Port: ${portToSet}, Lang: "${langToSet}"`);
            reset({
                [AppConfigKeys.PORT]: portToSet,
                [AppConfigKeys.DEFAULT_LANGUAGE]: langToSet
            }, { keepDirty: false, keepErrors: false });
            console.log("SettingsForm: Finished setting values and reset form state.");
            setOriginalPort(portToSet);
            setIsLoading(false);
        }
    }, [token, reset]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // onSubmit remains the same as it sends the correct format {value: ...}
    const onSubmit = async (data: SettingsFormData) => {
        console.log("SettingsForm: onSubmit called with data:", data);
        if (!token) return;

        const portValue = data[AppConfigKeys.PORT];
        const langValue = data[AppConfigKeys.DEFAULT_LANGUAGE];

        setSaveStatus('saving');
        setSaveError(null);
        try {
            const results = await Promise.all([
                 api.setConfig(AppConfigKeys.PORT, String(portValue), token).catch(err => ({ key: 'port', error: err })),
                 api.setConfig(AppConfigKeys.DEFAULT_LANGUAGE, langValue, token).catch(err => ({ key: 'language', error: err }))
            ]);

            const portResult = results[0];
            const langResult = results[1];

            let errorsEncountered = false;
            let successMessages: string[] = [];
            let restartNeeded = false;

            if ('error' in portResult) {
                errorsEncountered = true;
                const msg = portResult.error.message || `Failed to save port setting.`;
                setSaveError(prev => (prev ? `${prev}\n${msg}` : msg));
                toast.error(`Port Save Error: ${msg}`);
                console.error("Port Save Error:", portResult.error);
            } else {
                successMessages.push(portResult.message || `Port updated to ${portValue}.`);
                if (portResult.message?.includes("Manual server restart required")) restartNeeded = true;
            }

            if ('error' in langResult) {
                errorsEncountered = true;
                const msg = langResult.error.message || `Failed to save language setting.`;
                setSaveError(prev => (prev ? `${prev}\n${msg}` : msg));
                toast.error(`Language Save Error: ${msg}`);
                console.error("Language Save Error:", langResult.error);
            } else {
                 successMessages.push(langResult.message || `Default language updated to "${langValue}".`);
                 if (langResult.message?.includes("Manual server restart required")) restartNeeded = true;
            }

            if (!errorsEncountered) {
                setSaveStatus('success');
                const finalMessage = successMessages.join(' ').replace(/Settings updated successfully\./g, '').trim() || "Settings saved successfully.";
                if (restartNeeded) {
                    toast.warning(finalMessage.includes("Manual server restart required") ? finalMessage : `${finalMessage} Manual server restart required for port change.`);
                } else {
                    toast.success(finalMessage);
                }
                setOriginalPort(portValue);
                 reset(data, { keepValues: true, keepDirty: false });
                console.log("SettingsForm: Form reset after successful save.");
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else {
                setSaveStatus('error');
            }

        } catch (err: any) {
            const msg = err.message || 'An unexpected error occurred while saving settings';
            setSaveError(msg); toast.error(msg);
            setSaveStatus('error');
            console.error("SettingsForm: Unexpected Save error:", err);
        }
    };

    // Render part remains unchanged
    if (isLoading) { /* ... */ }
    if (loadError && !isLoading) { /* ... */ }

    return (
        <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
            <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>Configure server port and default language. Changes to Port or SSL require a manual server restart to take effect.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
                    {saveError && <ErrorDisplay message={saveError} />}
                    <div className="grid gap-1.5">
                        <Label htmlFor="port">Server Port</Label>
                        <Input
                            id="port"
                            type="number"
                            {...register(AppConfigKeys.PORT)}
                            aria-invalid={!!errors[AppConfigKeys.PORT]}
                            className={cn(errors[AppConfigKeys.PORT] && "border-destructive")}
                         />
                        {errors[AppConfigKeys.PORT] && <p className="text-xs text-destructive">{errors[AppConfigKeys.PORT]?.message}</p>}
                         {watchedPort !== originalPort && originalPort !== null && (
                            <p className="text-xs text-orange-600 font-medium">Info: Changes require a manual server restart.</p>
                         )}
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="language">Default Language</Label>
                        <Input
                            id="language"
                            {...register(AppConfigKeys.DEFAULT_LANGUAGE)}
                            placeholder="e.g., en, de"
                            aria-invalid={!!errors[AppConfigKeys.DEFAULT_LANGUAGE]}
                            className={cn(errors[AppConfigKeys.DEFAULT_LANGUAGE] && "border-destructive")}
                         />
                        {errors[AppConfigKeys.DEFAULT_LANGUAGE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.DEFAULT_LANGUAGE]?.message}</p>}
                    </div>
                     <Button type="submit" disabled={saveStatus === 'saving' || !isDirty}>
                        {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                        {saveStatus === 'success' && 'Saved!'}
                        {(saveStatus === 'idle' || saveStatus === 'error') && 'Save Settings'}
                     </Button>
                </form>
             </CardContent>
        </Card>
    );
};

export default SettingsForm;