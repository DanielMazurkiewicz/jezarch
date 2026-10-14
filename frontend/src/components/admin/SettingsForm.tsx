import React, { useState, useEffect, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form'; // Added Controller
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
// --- NEW: Import Select components ---
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// ---------------------------------
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { AppConfigKeys } from '../../../../backend/src/functionalities/config/models';
import type { UiElementId, ComponentSortMode, ElementSortMode } from '../../../../backend/src/functionalities/config/models';
import {
    COMPONENT_SORT_MODES,
    ELEMENT_SORT_MODES,
    DEFAULT_COMPONENT_SORT_MODE,
    DEFAULT_ELEMENT_SORT_MODE,
    isComponentSortMode,
    isElementSortMode,
} from '../../../../backend/src/functionalities/config/models';
import { cn } from '@/lib/utils';
import { settingsSchema, SettingsFormData } from '@/lib/zodSchemas';
import { toast } from "sonner";
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { t } from '@/translations/utils';
// --- NEW: Import supportedLanguages ---
import { supportedLanguages, type SupportedLanguage } from '@/translations/models';
// ------------------------------------
import { UI_ELEMENT_GROUPS, parseHiddenList, toggleHiddenElement } from '@/lib/uiVisibility';
import { useUiVisibility } from '@/context/UiVisibilityContext';
import { useSignatureSort } from '@/context/SignatureSortContext';

const SettingsForm: React.FC = () => {
    const { token, preferredLanguage } = useAuth();
    const { refresh: refreshUiVisibility } = useUiVisibility();
    const { refresh: refreshSignatureSort } = useSignatureSort();
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null);
    const [originalHttpPort, setOriginalHttpPort] = useState<number | null>(null);
    const [originalHttpsPort, setOriginalHttpsPort] = useState<number | null>(null);
    const [originalKeyPath, setOriginalKeyPath] = useState<string | null>(null);
    const [originalCertPath, setOriginalCertPath] = useState<string | null>(null);
    const [originalCaPath, setOriginalCaPath] = useState<string | null>(null);
    const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
    const [isClearingHttps, setIsClearingHttps] = useState(false);

    const { register, handleSubmit, reset, setValue, formState: { errors, isDirty }, watch, control } = useForm<SettingsFormData>({ // Added control
        resolver: zodResolver(settingsSchema),
        defaultValues: {
            [AppConfigKeys.DEFAULT_LANGUAGE]: 'en',
            [AppConfigKeys.HTTP_PORT]: 8080,
            [AppConfigKeys.HTTPS_PORT]: 8443,
            [AppConfigKeys.HTTPS_KEY_PATH]: '',
            [AppConfigKeys.HTTPS_CERT_PATH]: '',
            [AppConfigKeys.HTTPS_CA_PATH]: '',
            [AppConfigKeys.HIDDEN_UI_ELEMENTS]: [],
            [AppConfigKeys.COMPONENT_SORT_MODE]: DEFAULT_COMPONENT_SORT_MODE,
            [AppConfigKeys.COMPONENT_SORT_REVERSED]: false,
            [AppConfigKeys.ELEMENT_SORT_MODE]: DEFAULT_ELEMENT_SORT_MODE,
            [AppConfigKeys.ELEMENT_SORT_REVERSED]: false,
        }
    });

    const watchedHttpPort = watch(AppConfigKeys.HTTP_PORT);
    const watchedHttpsPort = watch(AppConfigKeys.HTTPS_PORT);
    const watchedKeyPath = watch(AppConfigKeys.HTTPS_KEY_PATH);
    const watchedCertPath = watch(AppConfigKeys.HTTPS_CERT_PATH);
    const watchedCaPath = watch(AppConfigKeys.HTTPS_CA_PATH);
    const watchedHiddenUiElements = watch(AppConfigKeys.HIDDEN_UI_ELEMENTS);
    const watchedComponentSortMode = watch(AppConfigKeys.COMPONENT_SORT_MODE);
    const watchedComponentSortReversed = watch(AppConfigKeys.COMPONENT_SORT_REVERSED);
    const watchedElementSortMode = watch(AppConfigKeys.ELEMENT_SORT_MODE);
    const watchedElementSortReversed = watch(AppConfigKeys.ELEMENT_SORT_REVERSED);

    // The form edits the *hidden* list, but the checkbox reads as "shown", so
    // the two are inverted here and nowhere else.
    const setElementVisible = useCallback((id: UiElementId, visible: boolean) => {
        const current = parseHiddenList(watchedHiddenUiElements);
        const withoutId = current.filter(x => x !== id);
        setValue(
            AppConfigKeys.HIDDEN_UI_ELEMENTS,
            visible ? withoutId : toggleHiddenElement(withoutId, id),
            { shouldDirty: true, shouldValidate: true },
        );
    }, [watchedHiddenUiElements, setValue]);

    const isHttpsCurrentlyEnabled = !!watchedKeyPath && !!watchedCertPath;

    const needsRestart = (
        watchedHttpPort !== originalHttpPort && originalHttpPort !== null ||
        watchedHttpsPort !== originalHttpsPort && originalHttpsPort !== null ||
        watchedKeyPath !== originalKeyPath ||
        watchedCertPath !== originalCertPath ||
        watchedCaPath !== originalCaPath
    );


    const fetchSettings = useCallback(async () => {
        if (!token) return;
        setIsLoading(true); setLoadError(null);

        const keysToFetch: AppConfigKeys[] = [
            AppConfigKeys.DEFAULT_LANGUAGE,
            AppConfigKeys.HTTP_PORT,
            AppConfigKeys.HTTPS_PORT,
            AppConfigKeys.HTTPS_KEY_PATH,
            AppConfigKeys.HTTPS_CERT_PATH,
            AppConfigKeys.HTTPS_CA_PATH,
            AppConfigKeys.HIDDEN_UI_ELEMENTS,
            AppConfigKeys.COMPONENT_SORT_MODE,
            AppConfigKeys.COMPONENT_SORT_REVERSED,
            AppConfigKeys.ELEMENT_SORT_MODE,
            AppConfigKeys.ELEMENT_SORT_REVERSED,
        ];

        try {
            const results = await Promise.all(
                keysToFetch.map(key => api.getConfig(key, token).catch(err => {
                     console.error(`Error fetching config key "${key}":`, err);
                     return { [key]: null, error: true };
                 }))
            );

            const newFormValues: Partial<SettingsFormData> = {};
            results.forEach(result => {
                const key = Object.keys(result)[0] as AppConfigKeys;
                 if ('error' in result && result.error) {
                     setLoadError(prev => prev ? `${prev}, ${t('settingsLoadKeyFailedError', preferredLanguage, { configKey: key })}` : t('settingsLoadKeyFailedError', preferredLanguage, { configKey: key }));
                     switch(key) {
                         case AppConfigKeys.HTTP_PORT: newFormValues[key] = 8080; break;
                         case AppConfigKeys.HTTPS_PORT: newFormValues[key] = 8443; break;
                         case AppConfigKeys.DEFAULT_LANGUAGE: newFormValues[key] = 'en'; break;
                         case AppConfigKeys.HIDDEN_UI_ELEMENTS: newFormValues[key] = []; break;
                         case AppConfigKeys.COMPONENT_SORT_MODE: newFormValues[key] = DEFAULT_COMPONENT_SORT_MODE; break;
                         case AppConfigKeys.ELEMENT_SORT_MODE: newFormValues[key] = DEFAULT_ELEMENT_SORT_MODE; break;
                         case AppConfigKeys.COMPONENT_SORT_REVERSED: newFormValues[key] = false; break;
                         case AppConfigKeys.ELEMENT_SORT_REVERSED: newFormValues[key] = false; break;
                         default: newFormValues[key] = '';
                     }
                     return;
                 }

                const value = result[key];
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
                         // --- Ensure the fetched value is a valid language ---
                         newFormValues[key] = typeof value === 'string' && supportedLanguages.includes(value as SupportedLanguage) ? value as SupportedLanguage : 'en';
                         // ------------------------------------------------------
                         break;
                    case AppConfigKeys.HTTPS_KEY_PATH:
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalKeyPath(value as string | null);
                        break;
                    case AppConfigKeys.HTTPS_CERT_PATH:
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalCertPath(value as string | null);
                        break;
                    case AppConfigKeys.HTTPS_CA_PATH:
                        newFormValues[key] = value && typeof value === 'string' && !value.includes('SET (Path Hidden)') ? value : '';
                        setOriginalCaPath(value as string | null);
                        break;
                    case AppConfigKeys.HIDDEN_UI_ELEMENTS:
                        // The API returns a JSON array of ids; parse defensively.
                        newFormValues[key] = parseHiddenList(value);
                        break;
                    case AppConfigKeys.COMPONENT_SORT_MODE:
                        // Guards against a value written outside the admin form.
                        newFormValues[key] = isComponentSortMode(value) ? value : DEFAULT_COMPONENT_SORT_MODE;
                        break;
                    case AppConfigKeys.ELEMENT_SORT_MODE:
                        newFormValues[key] = isElementSortMode(value) ? value : DEFAULT_ELEMENT_SORT_MODE;
                        break;
                    case AppConfigKeys.COMPONENT_SORT_REVERSED:
                        newFormValues[key] = value === true;
                        break;
                    case AppConfigKeys.ELEMENT_SORT_REVERSED:
                        newFormValues[key] = value === true;
                        break;
                }
            });

            reset(newFormValues as SettingsFormData, { keepDirty: false, keepErrors: false });

        } catch (err: any) {
             const msg = err.message || t('settingsLoadPartialFailedError', preferredLanguage);
             setLoadError(msg); toast.error(msg);
             reset(); setOriginalHttpPort(8080); setOriginalHttpsPort(8443);
             setOriginalKeyPath(null); setOriginalCertPath(null); setOriginalCaPath(null);
        } finally {
            setIsLoading(false);
        }
    }, [token, reset]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const onSubmit = async (data: SettingsFormData) => {
        if (!token) return;

        setSaveStatus('saving');
        setSaveError(null);
        let anyError = false;
        let restartRequiredBySave = false;

        const savePromises = (Object.keys(data) as Array<keyof SettingsFormData>).map(key => {
            let valueToSave: string | string[] | boolean | null | number | undefined = data[key]; // Allow number for port types
             if ([AppConfigKeys.HTTPS_KEY_PATH, AppConfigKeys.HTTPS_CERT_PATH, AppConfigKeys.HTTPS_CA_PATH].includes(key as AppConfigKeys) && valueToSave === '') {
                valueToSave = null;
            }
             // --- Serialize arrays (hidden UI elements) into their JSON form ---
            if (Array.isArray(valueToSave)) {
                valueToSave = JSON.stringify(valueToSave);
            }
             // --- Convert number to string ONLY if it's not null ---
             if (typeof valueToSave === 'number') {
                 valueToSave = String(valueToSave);
             } else if (typeof valueToSave === 'boolean') {
                 // The API takes strings on the wire; 'false' must not become ''.
                 valueToSave = valueToSave ? 'true' : 'false';
             } else if (valueToSave === null) {
                 // Keep null as null for paths, but ensure ports/lang are not null before API call
                 if (key === AppConfigKeys.DEFAULT_LANGUAGE || key === AppConfigKeys.HTTP_PORT || key === AppConfigKeys.HTTPS_PORT) {
                      console.warn(`Attempting to save null for required config ${key}. This shouldn't happen due to validation.`);
                      // Decide how to handle - skip or send default? Skip for now.
                      return Promise.resolve({ key, skipped: true });
                 }
             }
              // --- API expects string or null for value ---
             if (valueToSave !== null && typeof valueToSave !== 'string') {
                 console.error(`Invalid type for ${key} before API call: ${typeof valueToSave}`);
                 return Promise.resolve({ key, skipped: true, error: new Error(`Invalid type for ${key}`) });
             }

             // --- Skip API call if value is undefined (shouldn't happen with zod) ---
             if (valueToSave === undefined) return Promise.resolve({ key, skipped: true });


             return api.setConfig(key as AppConfigKeys, valueToSave, token)
                 .then(response => ({ key, success: true, message: response.message }))
                 .catch(err => ({ key, success: false, error: err }));
        });

        try {
            const results = await Promise.all(savePromises);

            results.forEach((result: any) => {
                 if (result.skipped) return;
                if (!result.success) {
                    anyError = true;
                    const msg = result.error?.message || t('settingsSaveKeyFailedError', preferredLanguage, { configKey: result.key, message: '' });
                    setSaveError(prev => (prev ? `${prev}\n${msg}` : msg));
                    toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('settingsSaveKeyFailedError', preferredLanguage, { configKey: result.key, message: msg }) }));
                 } else {
                     if (result.message?.includes("Manual server restart required")) {
                         restartRequiredBySave = true;
                     } else if (result.message?.includes("HTTPS configuration reloaded") || result.message?.includes("HTTPS server stopped")) {
                        restartRequiredBySave = true;
                     }
                }
            });

            if (!anyError) {
                setSaveStatus('success');
                const baseSuccessMsg = t('saveSettingsSuccessMessage', preferredLanguage);
                await fetchSettings();
                // Apply visibility changes immediately instead of waiting for a reload.
                await refreshUiVisibility();
                // Same for the signature tree ordering: open pickers re-sort now.
                await refreshSignatureSort();
                if (restartRequiredBySave) {
                    toast.warning(`${baseSuccessMsg} ${t('saveSettingsRestartWarning', preferredLanguage)}`);
                } else {
                    toast.success(baseSuccessMsg);
                }
                setTimeout(() => setSaveStatus('idle'), 2500);
            } else {
                setSaveStatus('error');
                 await fetchSettings();
            }

        } catch (err: any) {
            const msg = err.message || t('settingsSaveUnexpectedError', preferredLanguage);
            setSaveError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
            setSaveStatus('error');
            await fetchSettings();
        }
    };

     const handleClearHttps = async () => {
         if (!token) return;
         setIsClearingHttps(true);
         setSaveError(null);
         try {
             const response = await api.clearHttpsConfig(token);
             toast.success(response.message || t('clearHttpsSuccessMessage', preferredLanguage));
             await fetchSettings();
             setIsClearConfirmOpen(false);
         } catch (err: any) {
             const msg = err.message || t('clearHttpsFailedError', preferredLanguage);
             setSaveError(msg);
             toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
         } finally {
             setIsClearingHttps(false);
         }
     };

    if (isLoading) { return <div className='flex justify-center p-10'><LoadingSpinner /></div>; }
    if (loadError && !isLoading) { return <ErrorDisplay message={t('settingsLoadErrorHeader', preferredLanguage, { message: loadError })} />; }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{t('appSettingsTitleAdmin', preferredLanguage)}</CardTitle>
                <CardDescription>{t('appSettingsDescriptionAdmin', preferredLanguage)}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
                    {saveError && <ErrorDisplay message={saveError} />}

                    {/* General Settings Section */}
                    <div className="space-y-4 border-b pb-4">
                         <h3 className="text-lg font-medium">{t('generalLabel', preferredLanguage)}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* Default Language Dropdown */}
                             <div className="grid gap-1.5">
                                <Label htmlFor="language">{t('defaultLanguageLabel', preferredLanguage)}</Label>
                                <Controller
                                    name={AppConfigKeys.DEFAULT_LANGUAGE}
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                             <SelectTrigger id="language" className={cn(errors[AppConfigKeys.DEFAULT_LANGUAGE] && "border-destructive")}>
                                                 <SelectValue placeholder={t('selectLanguagePlaceholder', preferredLanguage)} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {supportedLanguages.map(lang => (
                                                    <SelectItem key={lang} value={lang}>
                                                        {/* Display language names more descriptively */}
                                                        {lang === 'en' ? 'English (EN)' : 'Polski (PL)'}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors[AppConfigKeys.DEFAULT_LANGUAGE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.DEFAULT_LANGUAGE]?.message}</p>}
                             </div>
                         </div>
                    </div>

                    {/* Interface Visibility Section */}
                    <div className="space-y-4 border-b pb-4">
                        <div>
                            <h3 className="text-lg font-medium">{t('uiVisibilityTitle', preferredLanguage)}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('uiVisibilityDescription', preferredLanguage)}
                            </p>
                        </div>
                        {UI_ELEMENT_GROUPS.map(group => (
                            <div key={group.titleKey} className="space-y-2">
                                <h4 className="text-sm font-medium text-muted-foreground">{t(group.titleKey, preferredLanguage)}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {group.items.map(item => {
                                        const checkboxId = `ui-visibility-${item.id}`;
                                        return (
                                            <div key={item.id} className="flex items-center gap-2">
                                                <Checkbox
                                                    id={checkboxId}
                                                    checked={!watchedHiddenUiElements.includes(item.id)}
                                                    onCheckedChange={(checked) => setElementVisible(item.id, checked === true)}
                                                />
                                                <Label htmlFor={checkboxId} className="cursor-pointer">
                                                    {t(item.labelKey, preferredLanguage)}
                                                </Label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Signature Tree Sorting Section */}
                    <div className="space-y-4 border-b pb-4">
                        <div>
                            <h3 className="text-lg font-medium">{t('signatureSortTitle', preferredLanguage)}</h3>
                            <p className="text-sm text-muted-foreground">
                                {t('signatureSortDescription', preferredLanguage)}
                            </p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="component-sort-mode">{t('signatureSortComponentsLabel', preferredLanguage)}</Label>
                                <Controller
                                    name={AppConfigKeys.COMPONENT_SORT_MODE}
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="component-sort-mode" className={cn(errors[AppConfigKeys.COMPONENT_SORT_MODE] && "border-destructive")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {/* 'index' has no meaning for components, so it is not offered. */}
                                                {COMPONENT_SORT_MODES.map(mode => (
                                                    <SelectItem key={mode} value={mode}>
                                                        {t(mode === 'creation' ? 'signatureSortModeCreation' : 'signatureSortModeName', preferredLanguage)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors[AppConfigKeys.COMPONENT_SORT_MODE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.COMPONENT_SORT_MODE]?.message}</p>}
                                <div className="flex items-start gap-2 pt-1">
                                    <Checkbox
                                        id="component-sort-reversed"
                                        checked={watchedComponentSortReversed}
                                        onCheckedChange={checked => setValue(AppConfigKeys.COMPONENT_SORT_REVERSED, checked === true, { shouldDirty: true })}
                                    />
                                    <div className="grid gap-0.5">
                                        <Label htmlFor="component-sort-reversed" className="cursor-pointer">{t('signatureSortComponentsReverseLabel', preferredLanguage)}</Label>
                                        <p className="text-xs text-muted-foreground">{t('signatureSortComponentsReverseHint', preferredLanguage)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-1.5">
                                <Label htmlFor="element-sort-mode">{t('signatureSortElementsLabel', preferredLanguage)}</Label>
                                <Controller
                                    name={AppConfigKeys.ELEMENT_SORT_MODE}
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger id="element-sort-mode" className={cn(errors[AppConfigKeys.ELEMENT_SORT_MODE] && "border-destructive")}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ELEMENT_SORT_MODES.map(mode => (
                                                    <SelectItem key={mode} value={mode}>
                                                        {t(mode === 'creation' ? 'signatureSortModeCreation' : mode === 'index' ? 'signatureSortModeIndex' : 'signatureSortModeName', preferredLanguage)}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors[AppConfigKeys.ELEMENT_SORT_MODE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.ELEMENT_SORT_MODE]?.message}</p>}
                                <div className="flex items-start gap-2 pt-1">
                                    <Checkbox
                                        id="element-sort-reversed"
                                        checked={watchedElementSortReversed}
                                        onCheckedChange={checked => setValue(AppConfigKeys.ELEMENT_SORT_REVERSED, checked === true, { shouldDirty: true })}
                                    />
                                    <div className="grid gap-0.5">
                                        <Label htmlFor="element-sort-reversed" className="cursor-pointer">{t('signatureSortElementsReverseLabel', preferredLanguage)}</Label>
                                        <p className="text-xs text-muted-foreground">{t('signatureSortElementsReverseHint', preferredLanguage)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Network Settings Section */}
                    <div className="space-y-4 border-b pb-4">
                        <h3 className="text-lg font-medium">{t('networkPortsLabel', preferredLanguage)}</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             {/* HTTP Port */}
                             <div className="grid gap-1.5">
                                <Label htmlFor="http-port">{t('httpPortLabel', preferredLanguage)}</Label>
                                <Input id="http-port" type="number" {...register(AppConfigKeys.HTTP_PORT, { valueAsNumber: true })} aria-invalid={!!errors[AppConfigKeys.HTTP_PORT]} className={cn(errors[AppConfigKeys.HTTP_PORT] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTP_PORT] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTP_PORT]?.message}</p>}
                             </div>
                             {/* HTTPS Port */}
                             <div className="grid gap-1.5">
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
                                 <h3 className="text-lg font-medium">{t('httpsConfigTitle', preferredLanguage)}</h3>
                                 <p className="text-sm text-muted-foreground">
                                     {t('httpsConfigDescription', preferredLanguage)}
                                 </p>
                             </div>
                             <AlertDialog open={isClearConfirmOpen} onOpenChange={setIsClearConfirmOpen}>
                                 <AlertDialogTrigger asChild>
                                     <Button type="button" variant="destructive" size="sm" className='shrink-0' disabled={!isHttpsCurrentlyEnabled || isClearingHttps}>
                                        {isClearingHttps ? <LoadingSpinner size='sm' className='mr-2' /> : <Trash2 className="mr-2 h-4 w-4" />}
                                         {t('clearHttpsSettingsButton', preferredLanguage)}
                                     </Button>
                                 </AlertDialogTrigger>
                                 <AlertDialogContent>
                                     <AlertDialogHeader>
                                         <AlertDialogTitle>{t('confirmClearHttpsTitle', preferredLanguage)}</AlertDialogTitle>
                                         <AlertDialogDescription>
                                            {t('confirmClearHttpsMessage', preferredLanguage)}
                                         </AlertDialogDescription>
                                     </AlertDialogHeader>
                                     <AlertDialogFooter>
                                          <AlertDialogCancel>{t('cancelButton', preferredLanguage)}</AlertDialogCancel>
                                         <AlertDialogAction onClick={handleClearHttps} disabled={isClearingHttps}>
                                             {isClearingHttps ? <LoadingSpinner size='sm' className='mr-2'/> : null}
                                              {t('yesButton', preferredLanguage)}, {t('clearButton', preferredLanguage)} HTTPS
                                         </AlertDialogAction>
                                     </AlertDialogFooter>
                                 </AlertDialogContent>
                             </AlertDialog>
                          </div>
                         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="grid gap-1.5">
                                <Label htmlFor="https-key-path">{t('httpsKeyPathLabel', preferredLanguage)}</Label>
                                <Input id="https-key-path" {...register(AppConfigKeys.HTTPS_KEY_PATH)} placeholder="/path/to/your/private.key" aria-invalid={!!errors[AppConfigKeys.HTTPS_KEY_PATH]} className={cn(errors[AppConfigKeys.HTTPS_KEY_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_KEY_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_KEY_PATH]?.message}</p>}
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="https-cert-path">{t('httpsCertPathLabel', preferredLanguage)}</Label>
                                <Input id="https-cert-path" {...register(AppConfigKeys.HTTPS_CERT_PATH)} placeholder="/path/to/your/certificate.crt" aria-invalid={!!errors[AppConfigKeys.HTTPS_CERT_PATH]} className={cn(errors[AppConfigKeys.HTTPS_CERT_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_CERT_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_CERT_PATH]?.message}</p>}
                            </div>
                            <div className="grid gap-1.5">
                                <Label htmlFor="https-ca-path">{t('httpsCaPathLabel', preferredLanguage)}</Label>
                                <Input id="https-ca-path" {...register(AppConfigKeys.HTTPS_CA_PATH)} placeholder="/path/to/your/ca_bundle.crt" aria-invalid={!!errors[AppConfigKeys.HTTPS_CA_PATH]} className={cn(errors[AppConfigKeys.HTTPS_CA_PATH] && "border-destructive")} />
                                {errors[AppConfigKeys.HTTPS_CA_PATH] && <p className="text-xs text-destructive">{errors[AppConfigKeys.HTTPS_CA_PATH]?.message}</p>}
                            </div>
                         </div>
                    </div>

                    <div className='flex flex-col sm:flex-row items-center gap-4 pt-4'>
                         <Button type="submit" disabled={saveStatus === 'saving' || !isDirty}>
                            {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                             {saveStatus === 'success' && t('saveButton', preferredLanguage) + '!'}
                            {(saveStatus === 'idle' || saveStatus === 'error') && t('saveButton', preferredLanguage)}
                         </Button>
                         {needsRestart && isDirty && (
                            <p className="text-sm text-orange-600 font-medium">{t('saveSettingsRestartWarning', preferredLanguage)}</p>
                         )}
                    </div>
                </form>
             </CardContent>
        </Card>
    );
};

export default SettingsForm;