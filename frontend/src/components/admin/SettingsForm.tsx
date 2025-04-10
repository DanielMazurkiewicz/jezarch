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

const SettingsForm: React.FC = () => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(true); // Start loading initially
    const [loadError, setLoadError] = useState<string | null>(null); // Separate error for loading
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [saveError, setSaveError] = useState<string | null>(null); // Separate error for saving

    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
        // Default values before fetching
        defaultValues: {
            [AppConfigKeys.PORT]: 8080,
            [AppConfigKeys.DEFAULT_LANGUAGE]: 'en',
        }
    });

    // Fetch current settings on mount
    const fetchSettings = useCallback(async () => {
        if (!token) {
            setIsLoading(false);
            setLoadError("Authentication token not found.");
            return;
        }
        setIsLoading(true);
        setLoadError(null);
        try {
            // Fetch settings concurrently
            const [portConfig, langConfig] = await Promise.all([
                 api.getConfig(AppConfigKeys.PORT, token),
                 api.getConfig(AppConfigKeys.DEFAULT_LANGUAGE, token)
            ]);
            // Reset form with fetched values or defaults
            reset({
                [AppConfigKeys.PORT]: parseInt(portConfig?.[AppConfigKeys.PORT] || '8080', 10),
                [AppConfigKeys.DEFAULT_LANGUAGE]: langConfig?.[AppConfigKeys.DEFAULT_LANGUAGE] || 'en',
            });
        } catch (err: any) {
             console.error("Failed to load settings:", err);
             setLoadError(err.message || 'Failed to load settings');
             // Keep default values in form on error
        } finally {
            setIsLoading(false);
        }
    }, [token, reset]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    // Handle form submission to save settings
    const onSubmit = async (data: SettingsFormData) => {
        if (!token) return;
        setSaveStatus('saving');
        setSaveError(null);
        try {
            // Save each setting individually or potentially use a batch endpoint if available
            await Promise.all([
                api.setConfig(AppConfigKeys.PORT, String(data[AppConfigKeys.PORT]), token),
                api.setConfig(AppConfigKeys.DEFAULT_LANGUAGE, data[AppConfigKeys.DEFAULT_LANGUAGE], token)
            ]);
            setSaveStatus('success');
            reset(data); // Update form's default values and reset dirty state
            setTimeout(() => setSaveStatus('idle'), 2000); // Reset status indicator after delay
        } catch (err: any) {
            setSaveError(err.message || 'Failed to save settings');
            setSaveStatus('error');
        }
    };

    // Display loading state while fetching initial data
    if (isLoading) {
        return <Card><CardContent className='p-6 flex justify-center'><LoadingSpinner /></CardContent></Card>;
    }

    // Display error if initial loading failed
     if (loadError) {
        return <Card><CardContent className='p-6'><ErrorDisplay message={loadError} /></CardContent></Card>;
     }

    // Render the form within a Card
    return (
        <Card>
            <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>Configure server port and default language. Changes may require a server restart to take full effect.</CardDescription>
            </CardHeader>
            {/* Put form inside CardContent for proper padding */}
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md"> {/* Limit form width */}
                    {/* Display save errors */}
                    {saveError && <ErrorDisplay message={saveError} />}

                    {/* Server Port Field */}
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
                    </div>

                    {/* Default Language Field */}
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

                    {/* Save Button with Status Indicator */}
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