import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AppConfigKeys } from '../../../../backend/src/functionalities/config/models';
import { cn } from '@/lib/utils';
import { settingsSchema, SettingsFormData } from '@/lib/zodSchemas'; // Updated schema import
import { toast } from "sonner";
import { Trash2 } from 'lucide-react'; // Import Trash2 icon
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { t } from '@/translations/utils'; // Import translation utility

const SettingsForm: React.FC = () => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    // Store original ports separately for restart warning
    const [originalHttpPort, setOriginalHttpPort] = useState<number | null>(null);
    const [originalHttpsPort, setOriginalHttpsPort] = useState<number | null>(null);
    // Store original paths for restart warning
    const [originalKeyPath, setOriginalKeyPath] = useState<string | null>(null);
    const [originalCertPath, setOriginalCertPath] = useState<string | null>(null);
    const [originalCaPath, setOriginalCaPath] = useState<string | null>(null);
    // State for clear https confirmation
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isClearingHttps, setIsClearingHttps] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors, isDirty }, watch } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        // Provide defaults for all fields in the schema
        defaultValues: {
            [AppConfigKeys.DEFAULT_LANGUAGE]: 'en',
            [AppConfigKeys.HTTP_PORT]: 8080,
            [AppConfigKeys.HTTPS_PORT]: 8443,
            [AppConfigKeys.HTTPS_KEY_PATH]: '', // Use empty string for controlled input
            [AppConfigKeys.HTTPS_CERT_PATH]: '',
            [AppConfigKeys.HTTPS_CA_PATH]: '',
        }
    });

    // Watch relevant fields for restart warning
    const watchedHttpPort = watch(AppConfigKeys.HTTP_PORT);
    const watchedHttpsPort = watch(AppConfigKeys.HTTPS_PORT);
    const watchedKeyPath = watch(AppConfigKeys.HTTPS_KEY_PATH);
    const watchedCertPath = watch(AppConfigKeys.HTTPS_CERT_PATH);
    const watchedCaPath = watch(AppConfigKeys.HTTPS_CA_PATH);

    // Determine if HTTPS is currently effectively enabled (key and cert paths are set)
    const isHttpsCurrentlyEnabled = !!watchedKeyPath && !!watchedCertPath;

    const needsRestart = (
        watchedHttpPort !== originalHttpPort && originalHttpPort !== null ||
        watchedHttpsPort !== originalHttpsPort && originalHttpsPort !== null ||
        watchedKeyPath !== originalKeyPath || // Also trigger if paths change (null -> value, value -> null, value -> value)
        watchedCertPath !== originalCertPath ||
        watchedCaPath !== originalCaPath
    );


    // Fetch current settings on mount
    const fetchSettings = useCallback(async () => {
        console.log("SettingsForm: fetchSettings triggered.");
        if (!token) return;
        setIsLoading(true); setLoadError(null);

        // Define keys to fetch
        const keysToFetch: AppConfigKeys[] = [
            AppConfigKeys.DEFAULT_LANGUAGE,
            AppConfigKeys.HTTP_PORT,
            AppConfigKeys.HTTPS_PORT,
            AppConfigKeys.HTTPS_KEY_PATH,
            AppConfigKeys.HTTPS_CERT_PATH,
            AppConfigKeys.HTTPS_CA_PATH,
        ];

        try {
            // Fetch all settings concurrently
            const results = await Promise.all(
                keysToFetch.map(key => api.getConfig(key, token).catch(err => {
                     console.error(`Error fetching config key "${key}":`, err);
                     // Return null or a specific error structure for failed keys
                     return { [key]: null, error: true };
                 }))
            );

            // Process results and update form state
            const newFormValues: Partial<SettingsFormData> = {};
            results.forEach(result => {
                const key = Object.keys(result)[0] as AppConfigKeys;
                // Check if there was an error fetching this specific key
                 if (result.error) {
                     setLoadError(prev => prev ? `${prev}, ${key}` : `Failed to load ${key}`);
                     // Use default for failed keys
                     switch(key) {
                         case AppConfigKeys.HTTP_PORT: newFormValues[key] = 8080; break;
                         case AppConfigKeys.HTTPS_PORT: newFormValues[key] = 8443; break;
                         case AppConfigKeys.DEFAULT_LANGUAGE: newFormValues[key] = 'en'; break;
                         default: newFormValues[key] = ''; // Default for paths
                     }
                     return; // Skip to next result
                 }

                const value = result[key]; // Value can be string or null
                console.log(`SettingsForm: Fetched ${key}:`, value, `(Type: ${typeof value})`);

                switch (key) {
                    case AppConfigKeys.HTTP_PORT:
                        const httpPort = parseInt(String(value), 10);
                        newFormValues[key] = !isNaN(httpPort) ? httpPort : 8080;
                        setOriginalHttpPort(newFormValues[key] ?? null);
                        break;
                    case AppConfigKeys.HTTPS_PORT:
                        const httpsPort = parseInt(String(value), 10);
                        newFormValues[key] = !isNaN(httpsPort) ? httpsPort : 8443;
                        setOriginalHttpsPort(newFormValues[key] ?? null);
                        break;
                    case AppConfigKeys.DEFAULT_LANGUAGE:
                         newFormValues[key] = typeof value === 'string' && value.trim().length > 0 ? value : 'en';
                         break;
                    case AppConfigKeys.HTTPS_KEY_PATH:
                        // Value from API might be "*** SET (Path Hidden) ***" or actual path (if API doesn't hide) or null
                        // For the form, we just need to know IF it's set or not. Use empty string if null/hidden.
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalKeyPath(value); // Store original value (could be hidden placeholder)
                        break;
                    case AppConfigKeys.HTTPS_CERT_PATH:
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalCertPath(value);
                        break;
                    case AppConfigKeys.HTTPS_CA_PATH:
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalCaPath(value);
                        break;
                }
            });

            console.log("SettingsForm: Resetting form with values:", newFormValues);
            reset(newFormValues as SettingsFormData, { keepDirty: false, keepErrors: false });

        } catch (err: any) {
             console.error("SettingsForm: Unexpected error during Promise.all:", err);
             const msg = err.message || 'Failed to load one or more settings';
             setLoadError(msg); toast.error(msg);
             // Reset to defaults on major error
             reset(); setOriginalHttpPort(8080); setOriginalHttpsPort(8443);
             setOriginalKeyPath(null); setOriginalCertPath(null); setOriginalCaPath(null);
        } finally {
            setIsLoading(false);
        }
    }, [token, reset]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // onSubmit handles saving all fields
    const onSubmit = async (data: SettingsFormData) => {
        console.log("SettingsForm: onSubmit called with data:", data);
        if (!token) return;

        setSaveStatus('saving');
        setSaveError(null);
        let anyError = false;
        let restartRequiredBySave = false;

        // Prepare API calls for each setting
        const savePromises = (Object.keys(data) as Array<keyof SettingsFormData>).map(key => {
            let valueToSave: string | null = data[key];
             // Convert empty strings for path keys back to null for the API
            if ([AppConfigKeys.HTTPS_KEY_PATH, AppConfigKeys.HTTPS_CERT_PATH, AppConfigKeys.HTTPS_CA_PATH].includes(key as AppConfigKeys) && valueToSave === '') {
                valueToSave = null;
            }
             // Convert numbers to string for API
             if (typeof valueToSave === 'number') {
                 valueToSave = String(valueToSave);
             }
             // Skip API call if value is undefined (shouldn't happen with zod)
             if (valueToSave === undefined) return Promise.resolve({ key, skipped: true });

             return api.setConfig(key as AppConfigKeys, valueToSave, token)
                 .then(response => ({ key, success: true, message: response.message }))
                 .catch(err => ({ key, success: false, error: err }));
        });

        try {
            const results = await Promise.all(savePromises);

            results.forEach(result => {
                 if (result.skipped) return; // Skip if call was skipped
                if (!result.success) {
                    anyError = true;
                    const msg = result.error?.message || `Failed to save ${result.key}.`;
                    setSaveError(prev => (prev ? `${prev}\n${msg}` : msg));
                    // Use translated error template
                    toast.error(t('errorMessageTemplate', preferredLanguage, { message: `Failed to save ${result.key}: ${msg}` }));
                    console.error(`${result.key} Save Error:`, result.error);
                } else {
                    // Check if this specific setting required a restart
                     if (result.message?.includes("Manual server restart required")) {
                         restartRequiredBySave = true;
                     } else if (result.message?.includes("HTTPS configuration reloaded") || result.message?.includes("HTTPS server stopped")) {
                        // Consider TLS reload/stop as needing notice, though not manual restart like ports
                        // Maybe add a different type of indicator? For now, treat as restart warning.
                        restartRequiredBySave = true; // Re-use flag for simplicity
                     }
                }
            });

            if (!anyError) {
                setSaveStatus('success');
                // Use translated success message
                const baseSuccessMsg = t('saveSettingsSuccessMessage', preferredLanguage);
                // Fetch again to get potentially masked values and update originals
                await fetchSettings(); // fetchSettings now updates originals
                if (restartRequiredBySave) {
                    // Use translated warning message
                    toast.warning(`${baseSuccessMsg} ${t('saveSettingsRestartWarning', preferredLanguage)}`);
                } else {
                    toast.success(baseSuccessMsg);
                }
                // Form is reset by fetchSettings, keep success status briefly
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else {
                setSaveStatus('error');
                // Attempt to refetch settings even on partial failure to show current state
                 await fetchSettings();
            }

        } catch (err: any) {
            const msg = err.message || 'An unexpected error occurred while saving settings';
            setSaveError(msg);
            // Use translated error template
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            setSaveStatus('error');
            console.error("SettingsForm: Unexpected Save error:", err);
            // Attempt to refetch settings on major failure
            await fetchSettings();
        }
    };

     // --- Clear HTTPS Handler ---
     const handleClearHttps = async () => {
         if (!token) return;
         setIsClearingHttps(true);
         setSaveError(null); // Clear previous save errors
         try {
             const response = await api.clearHttpsConfig(token);
             // Use translated success message from response or default
             toast.success(response.message || t('clearHttpsSuccessMessage', preferredLanguage));
             // Refresh the form state to reflect cleared values
             await fetchSettings();
             setIsClearConfirmOpen(false); // Close confirmation dialog
         } catch (err: any) {
             const msg = err.message || "Failed to clear HTTPS settings.";
             setSaveError(msg); // Show error in the main error display
             // Use translated error template
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
         } finally {
             setIsClearingHttps(false);
         }
     };
     // --- End Clear HTTPS Handler ---

    if (isLoading) { return <div className='flex justify-center p-10'><LoadingSpinner /></div>; }
    if (loadError && !isLoading) { return <ErrorDisplay message={`Error loading settings: ${loadError}`} />; }

    return (
        <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
            <CardHeader>
                {/* Use translated title and description */}
                <CardTitle>{t('appSettingsTitleAdmin', preferredLanguage)}</CardTitle>
                <CardDescription>{t('appSettingsDescriptionAdmin', preferredLanguage)}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl"> {/* Increased max-width */}
                    {saveError && <ErrorDisplay message={saveError} />}

                    {/* General Settings Section */}
                    <div className="space-y-4 border-b pb-4">
                         {/* Use translated heading */}
                         <h3 className="text-lg font-medium">{t('generalLabel', preferredLanguage)}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Default Language */}
                             <div className="grid gap-1.5">
                                {/* Use translated label */}
                                <Label htmlFor="language">{t('defaultLanguageLabel', preferredLanguage)}</Label>
                                <Input id="language" {...register(AppConfigKeys.DEFAULT_LANGUAGE)} placeholder="e.g., en, pl" aria-invalid={!!errors[AppConfigKeys.DEFAULT_LANGUAGE]} className={cn(errors[AppConfigKeys.DEFAULT_LANGUAGE] && "border-destructive")} />
                                {errors[AppConfigKeys.DEFAULT_LANGUAGE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.DEFAULT_LANGUAGE]?.message}</p>}
                             </div>
                         </div>
                    </div>

                    {/* Network Settings Section */}
                    <div className="space-y-4 border-b pb-4">
                         {/* Use translated heading */}
                        <h3 className="text-lg font-medium">{t('networkPortsLabel', preferredLanguage)}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* HTTP Port */}
                             <div className="grid gap-1.5">
                                {/* Use translated label */}
                                <Label htmlFor="http-port">{t('httpPortLabel', preferredLanguage)}</Label>
                                <Input id="http-port" type="number" {...register(AppConfigKeys.HTTP_PORT, { valueAsNumber: true })} aria-invalid={!!errors[AppConfigKeys.HTTP_PORT]} className={cn(errors[AppConfigKeys.HTTP_PORT] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTP_PORT] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTP_PORT]?.message}</p>}
                             </div>
                             {/* HTTPS Port */}
                             <div className="grid gap-1.5">
                                 {/* Use translated label */}
                                <Label htmlFor="https-port">{t('httpsPortLabel', preferredLanguage)}</Label>
                                <Input id="https-port" type="number" {...register(AppConfigKeys.HTTPS_PORT, { valueAsNumber: true })} aria-invalid={!!errors[AppConfigKeys.HTTPS_PORT]} className={cn(errors[AppConfigKeys.HTTPS_PORT] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_PORT] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_PORT]?.message}</p>}
                             </div>
                         </div>
                    </div>

                    {/* HTTPS/SSL Settings Section */}
                    <div className="space-y-4">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                             <div>
                                  {/* Use translated heading and description */}
                                 <h3 className="text-lg font-medium">{t('httpsConfigTitle', preferredLanguage)}</h3>
                                 <p className="text-sm text-muted-foreground">
                                     {t('httpsConfigDescription', preferredLanguage)}
                                 </p>
                             </div>
                             {/* Clear HTTPS Button */}
                             <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                                 <AlertDialogTrigger asChild>
                                     <Button type="button" variant="destructive" size="sm" className='shrink-0' disabled={!isHttpsCurrentlyEnabled || isClearingHttps}>
                                        {isClearingHttps ? <LoadingSpinner size='sm' className='mr-2' /> : <Trash2 className="mr-2 h-4 w-4" />}
                                         {/* Use translated button text */}
                                         {t('clearHttpsSettingsButton', preferredLanguage)}
                                     </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                     <AlertDialogHeader>
                                         {/* Use translated title and message */}
                                         <AlertDialogTitle>{t('confirmClearHttpsTitle', preferredLanguage)}</AlertDialogTitle>
                                         <AlertDialogDescription>
                                            {t('confirmClearHttpsMessage', preferredLanguage)}
                                         </AlertDialogDescription>
                                     </AlertDialogHeader>
                                     <AlertDialogFooter>
                                          <AlertDialogCancel>{t('cancelButton', preferredLanguage)}</AlertDialogCancel>
                                         <AlertDialogAction onClick={handleClearHttps} disabled={isClearingHttps}>
                                             {isClearingHttps ? <LoadingSpinner size='sm' className='mr-2'/> : null}
                                             {/* Use translated button text */}
                                              {t('yesButton', preferredLanguage)}, {t('clearButton', preferredLanguage)} HTTPS
                                         </AlertDialogAction>
                                     </AlertDialogFooter>
                                 </AlertDialogContent>
                             </AlertDialog>
                          </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Key Path */}
                            <div className="grid gap-1.5">
                                 {/* Use translated label */}
                                <Label htmlFor="https-key-path">{t('httpsKeyPathLabel', preferredLanguage)}</Label>
                                <Input id="https-key-path" {...register(AppConfigKeys.HTTPS_KEY_PATH)} placeholder="/path/to/your/private.key" aria-invalid={!!errors[AppConfigKeys.HTTPS_KEY_PATH]} className={cn(errors[AppConfigKeys.HTTPS_KEY_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_KEY_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_KEY_PATH]?.message}</p>}
                            </div>
                             {/* Cert Path */}
                            <div className="grid gap-1.5">
                                 {/* Use translated label */}
                                <Label htmlFor="https-cert-path">{t('httpsCertPathLabel', preferredLanguage)}</Label>
                                <Input id="https-cert-path" {...register(AppConfigKeys.HTTPS_CERT_PATH)} placeholder="/path/to/your/certificate.crt" aria-invalid={!!errors[AppConfigKeys.HTTPS_CERT_PATH]} className={cn(errors[AppConfigKeys.HTTPS_CERT_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_CERT_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_CERT_PATH]?.message}</p>}
                            </div>
                             {/* CA Path */}
                            <div className="grid gap-1.5">
                                 {/* Use translated label */}
                                <Label htmlFor="https-ca-path">{t('httpsCaPathLabel', preferredLanguage)}</Label>
                                <Input id="https-ca-path" {...register(AppConfigKeys.HTTPS_CA_PATH)} placeholder="/path/to/your/ca_bundle.crt" aria-invalid={!!errors[AppConfigKeys.HTTPS_CA_PATH]} className={cn(errors[AppConfigKeys.HTTPS_CA_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_CA_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_CA_PATH]?.message}</p>}
                            </div>
                         </div>
                    </div>

                     {/* Save Button and Restart Warning */}
                    <div className='flex flex-col sm:flex-row items-center gap-4 pt-4'>
                         <Button type="submit" disabled={saveStatus === 'saving' || !isDirty}>
                            {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                            {/* Use translated button text */}
                             {saveStatus === 'success' && t('saveButton', preferredLanguage) + '!'}
                            {(saveStatus === 'idle' || saveStatus === 'error') && t('saveButton', preferredLanguage)}
                         </Button>
                         {/* Show restart warning if relevant fields changed */}
                         {needsRestart && isDirty && ( // Only show if dirty and needs restart
                            <p className="text-sm text-orange-600 font-medium">{t('saveSettingsRestartWarning', preferredLanguage)}</p>
                         )}
                    </div>
                </form>
             </CardContent>
        </Card>
    );
};

export default SettingsForm;