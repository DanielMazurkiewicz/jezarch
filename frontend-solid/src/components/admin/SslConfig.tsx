import { Component, createSignal, Show, onCleanup } from 'solid-js';
// Removed @modular-forms/solid imports
import { z, ZodIssue } from 'zod';
import { sslSchema, SslFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';

import { Button } from '@/components/ui/Button';
import { Textarea, type TextareaProps } from '@/components/ui/Textarea';
import { FormLabel } from '@/components/ui/FormLabel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/Alert';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { Icon } from '@/components/shared/Icon';
// import { useNotifications } from '@/context/NotificationContext'; // TODO: Use notifications
import { cn } from '@/lib/utils';
import styles from './SslConfig.module.css'; // Import CSS Module (Typed)
import type { JSX } from 'solid-js';


const SslConfig: Component = () => {
    const [authState] = useAuth();
    const [uploadStatus, setUploadStatus] = createSignal<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [generateStatus, setGenerateStatus] = createSignal<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = createSignal<string | null>(null);
    const [generateError, setGenerateError] = createSignal<string | null>(null);
    // const { addNotification } = useNotifications(); // TODO: Inject notification hook

    let uploadSuccessTimeout: ReturnType<typeof setTimeout> | undefined;
    let generateSuccessTimeout: ReturnType<typeof setTimeout> | undefined;

    // State for upload form
    const [sslKey, setSslKey] = createSignal('');
    const [sslCert, setSslCert] = createSignal('');
    const [formErrors, setFormErrors] = createSignal<Partial<Record<keyof SslFormData, string>>>({});

    const isFormDirty = () => sslKey() !== '' || sslCert() !== '';
    // REMOVED hasFormErrors check

    onCleanup(() => {
        if (uploadSuccessTimeout) clearTimeout(uploadSuccessTimeout);
        if (generateSuccessTimeout) clearTimeout(generateSuccessTimeout);
    });

    // Validation function
    const validateUploadForm = (): boolean => {
        setFormErrors({}); // Clear previous errors
        const formData = { key: sslKey(), cert: sslCert() };
        const result = sslSchema.safeParse(formData);
        if (!result.success) {
            const errors: Partial<Record<keyof SslFormData, string>> = {};
            result.error.errors.forEach((err: ZodIssue) => {
                if (err.path.length > 0) {
                    errors[err.path[0] as keyof SslFormData] = err.message;
                }
            });
            setFormErrors(errors);
            return false;
        }
        return true;
    };

    const handleUpload = async (event: Event) => {
        event.preventDefault();
        const token = authState.token;
        if (!token || !validateUploadForm()) return; // Validate before submit

        setUploadStatus('saving'); setUploadError(null);
        if (uploadSuccessTimeout) clearTimeout(uploadSuccessTimeout);

        try {
            // Values from signals
            await api.uploadSsl({ key: sslKey(), cert: sslCert() }, token);
            setUploadStatus('success');
            // Clear form on success
            setSslKey('');
            setSslCert('');
            setFormErrors({});
            uploadSuccessTimeout = setTimeout(() => setUploadStatus('idle'), 3000);
            // TODO: addNotification({ type: 'success', message: 'SSL config uploaded. Restart server to apply.' });
        } catch (err: any) {
            const msg = err.message || "Failed to upload SSL config.";
            setUploadError(msg);
            setUploadStatus('error');
            // TODO: addNotification({ type: 'error', message: `Upload failed: ${msg}` });
        }
    };

    // --- Generate Action ---
    const handleGenerate = async () => {
        const token = authState.token;
        if (!token) return;
        if (!window.confirm("Generate new self-signed certificate? This overwrites existing config and requires server restart. (For testing only)")) return;

        setGenerateStatus('generating'); setGenerateError(null);
        if (generateSuccessTimeout) clearTimeout(generateSuccessTimeout);

        try {
            await api.generateSsl(token);
            setGenerateStatus('success');
            generateSuccessTimeout = setTimeout(() => setGenerateStatus('idle'), 3000);
            // TODO: addNotification({ type: 'success', message: 'Self-signed certificate generated. Restart server to apply.' });
        } catch (err: any) {
             const msg = err.message || "Failed to generate SSL certificate.";
             setGenerateError(msg);
             setGenerateStatus('error');
             // TODO: addNotification({ type: 'error', message: `Generation failed: ${msg}` });
        }
    };

    return (
        <div class={styles.sslConfigContainer}>
            {/* Upload Card */}
            <Card class={styles.sslCard}>
                <CardHeader>
                    <CardTitle>Upload Existing SSL</CardTitle>
                    <CardDescription>Paste private key and certificate (PEM). Requires restart.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleUpload} class={styles.sslForm}>
                        {/* Status Messages */}
                        <Show when={uploadStatus() === 'error' && uploadError()}>
                           {(err) => <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{err()}</AlertDescription></Alert>}
                        </Show>
                         <Show when={uploadStatus() === 'success'}>
                            <Alert variant="success"><AlertTitle>Upload Successful</AlertTitle><AlertDescription>SSL config uploaded. Restart needed.</AlertDescription></Alert>
                         </Show>

                         {/* Key Input */}
                        <div class={styles.formGroup}>
                            <FormLabel for="ssl-key-input" required invalid={!!formErrors().key}>Private Key (.key)</FormLabel>
                            <Textarea
                                id="ssl-key-input"
                                name="key"
                                value={sslKey()}
                                // --- FIX: Removed validateForm() call ---
                                onInput={(e) => { setSslKey(e.currentTarget.value); }}
                                required
                                placeholder="-----BEGIN PRIVATE KEY-----\n..."
                                aria-invalid={!!formErrors().key}
                                aria-errormessage="ssl-key-error"
                                class={styles.sslTextarea}
                                rows={8}
                            />
                             <Show when={formErrors().key}><p id="ssl-key-error" class={styles.errorMessage}>{formErrors().key}</p></Show>
                        </div>

                        {/* Cert Input */}
                        <div class={styles.formGroup}>
                             <FormLabel for="ssl-cert-input" required invalid={!!formErrors().cert}>Certificate (.crt/.pem)</FormLabel>
                             <Textarea
                                 id="ssl-cert-input"
                                 name="cert"
                                 value={sslCert()}
                                 // --- FIX: Removed validateForm() call ---
                                 onInput={(e) => { setSslCert(e.currentTarget.value); }}
                                 required
                                 placeholder="-----BEGIN CERTIFICATE-----\n..."
                                 aria-invalid={!!formErrors().cert}
                                 aria-errormessage="ssl-cert-error"
                                 class={styles.sslTextarea}
                                 rows={8}
                             />
                              <Show when={formErrors().cert}><p id="ssl-cert-error" class={styles.errorMessage}>{formErrors().cert}</p></Show>
                         </div>

                         {/* --- FIX: Simplified disabled check --- */}
                        <Button type="submit" disabled={uploadStatus() === 'saving' || !isFormDirty()} class={styles.actionButton}>
                            <Show when={uploadStatus() === 'saving'} fallback={<><Icon name="UploadCloud" size="1em" class={styles.actionButtonIcon}/> Upload SSL Files</>}>
                                <LoadingSpinner size="sm" class={styles.actionButtonIcon} /> Saving...
                            </Show>
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {/* Generate Card */}
             <Card class={styles.sslCard}>
                <CardHeader>
                    <CardTitle>Generate Self-Signed SSL</CardTitle>
                    <CardDescription>Generate certificate for testing/dev (not production). Requires restart.</CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                     {/* Status Messages */}
                    <Show when={generateStatus() === 'error' && generateError()}>
                        {(err) => <Alert variant="destructive"><AlertTitle>Error</AlertTitle><AlertDescription>{err()}</AlertDescription></Alert>}
                    </Show>
                    <Show when={generateStatus() === 'success'}>
                         <Alert variant="success"><AlertTitle>Generation Successful</AlertTitle><AlertDescription>Self-signed cert generated. Restart needed.</AlertDescription></Alert>
                    </Show>

                    <Button onClick={handleGenerate} disabled={generateStatus() === 'generating'} variant="outline" class={styles.actionButton}>
                        <Show when={generateStatus() === 'generating'} fallback={<><Icon name="RefreshCcw" size="1em" class={styles.actionButtonIcon}/> Generate New Certificate</>}>
                             <LoadingSpinner size="sm" class={styles.actionButtonIcon} /> Generating...
                         </Show>
                    </Button>
                </CardContent>
             </Card>
        </div>
    );
};

export default SslConfig;