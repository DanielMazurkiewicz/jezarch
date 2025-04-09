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

const settingsSchema = z.object({
    [AppConfigKeys.PORT]: z.coerce.number().int().min(1).max(65535), // Coerce input to number
    [AppConfigKeys.DEFAULT_LANGUAGE]: z.string().min(2, "Language code required (e.g., en)"),
});

type SettingsFormData = z.infer<typeof settingsSchema>;

const SettingsForm: React.FC = () => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [loadError, setLoadError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SettingsFormData>({
        resolver: zodResolver(settingsSchema),
    });

    const fetchSettings = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        setLoadError(null);
        try {
            const portConfig = await api.getConfig(AppConfigKeys.PORT, token);
            const langConfig = await api.getConfig(AppConfigKeys.DEFAULT_LANGUAGE, token);
            reset({
                [AppConfigKeys.PORT]: parseInt(portConfig[AppConfigKeys.PORT] || '0') || 3000, // Provide default
                [AppConfigKeys.DEFAULT_LANGUAGE]: langConfig[AppConfigKeys.DEFAULT_LANGUAGE] || 'en', // Provide default
            });
        } catch (err: any) {
             console.error("Failed to load settings:", err);
             setLoadError(err.message || 'Failed to load settings');
             // Reset with defaults on error?
             reset({ [AppConfigKeys.PORT]: 3000, [AppConfigKeys.DEFAULT_LANGUAGE]: 'en' });
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
        setError(null);
        try {
            // Save each setting individually
            await api.setConfig(AppConfigKeys.PORT, String(data[AppConfigKeys.PORT]), token);
            await api.setConfig(AppConfigKeys.DEFAULT_LANGUAGE, data[AppConfigKeys.DEFAULT_LANGUAGE], token);
            setSaveStatus('success');
             reset(data); // Reset dirty state after successful save
            setTimeout(() => setSaveStatus('idle'), 2000); // Reset status after a delay
        } catch (err: any) {
            setError(err.message || 'Failed to save settings');
            setSaveStatus('error');
        }
    };

    if (isLoading) {
        return <Card><CardContent className='p-6 flex justify-center'><LoadingSpinner /></CardContent></Card>;
    }
     if (loadError) {
        return <Card><CardContent className='p-6'><ErrorDisplay message={loadError} /></CardContent></Card>;
     }


    return (
        <Card>
            <CardHeader>
                <CardTitle>Application Settings</CardTitle>
                <CardDescription>Configure server port and default language. Changes may require a server restart.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    {error && <ErrorDisplay message={error} />}
                    <div className="grid gap-2">
                        <Label htmlFor="port">Server Port</Label>
                        <Input id="port" type="number" {...register(AppConfigKeys.PORT)} />
                        {errors[AppConfigKeys.PORT] && <p className="text-xs text-destructive">{errors[AppConfigKeys.PORT]?.message}</p>}
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="language">Default Language</Label>
                        <Input id="language" {...register(AppConfigKeys.DEFAULT_LANGUAGE)} placeholder="e.g., en, de" />
                        {errors[AppConfigKeys.DEFAULT_LANGUAGE] && <p className="text-xs text-destructive">{errors[AppConfigKeys.DEFAULT_LANGUAGE]?.message}</p>}
                    </div>
                     <Button type="submit" disabled={saveStatus === 'saving' || !isDirty}>
                        {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                        {saveStatus === 'success' && 'Saved!'}
                         {(saveStatus === 'idle' || saveStatus === 'error') && 'Save Settings'}
                     </Button>
                </CardContent>
            </form>
        </Card>
    );
};

export default SettingsForm;