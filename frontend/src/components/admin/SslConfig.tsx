import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { sslSchema, SslFormData } from '@/lib/zodSchemas'; // Import schema and type

const SslConfig: React.FC = () => {
    const { token } = useAuth();
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [generateStatus, setGenerateStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SslFormData>({
        resolver: zodResolver(sslSchema),
        defaultValues: { key: '', cert: '' },
    });

    const handleUpload = async (data: SslFormData) => {
        if (!token) return;
        setUploadStatus('saving');
        setError(null);
        try {
            // Ensure data structure matches SslConfig interface { key: string; cert: string }
            await api.uploadSsl({ key: data.key, cert: data.cert }, token);
            setUploadStatus('success');
            reset(); // Clear form on success
            setTimeout(() => setUploadStatus('idle'), 3000);
        } catch (err: any) {
            setError(err.message || "Failed to upload SSL configuration.");
            setUploadStatus('error');
        }
    };

    const handleGenerate = async () => {
        if (!token) return;
        if (!window.confirm("This will generate a new self-signed certificate and overwrite any existing configuration. Continue?")) return;
        setGenerateStatus('generating');
        setError(null);
        try {
            await api.generateSsl(token);
            setGenerateStatus('success');
            setTimeout(() => setGenerateStatus('idle'), 3000);
            // Optionally fetch and display the new cert/key? Or just show success.
            alert("Self-signed certificate generated successfully. Server might need a restart.");
        } catch (err: any) {
             setError(err.message || "Failed to generate SSL certificate.");
             setGenerateStatus('error');
        }
    };

    return (
        <div className='space-y-6'>
             <Card>
                 <CardHeader>
                     <CardTitle>Upload Existing SSL</CardTitle>
                     <CardDescription>Paste your existing private key and certificate (PEM format). Requires server restart.</CardDescription>
                 </CardHeader>
                <form onSubmit={handleSubmit(handleUpload)}>
                    <CardContent className="space-y-4">
                         {uploadStatus === 'error' && error && <ErrorDisplay message={error} />}
                         {uploadStatus === 'success' && <p className='text-sm text-green-600'>SSL configuration uploaded successfully.</p>}

                         <div className="grid gap-2">
                             <Label htmlFor="ssl-key">Private Key (.key)</Label>
                             <Textarea id="ssl-key" {...register('key')} rows={8} placeholder="-----BEGIN PRIVATE KEY-----\n..." />
                             {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
                         </div>
                         <div className="grid gap-2">
                             <Label htmlFor="ssl-cert">Certificate (.crt/.pem)</Label>
                             <Textarea id="ssl-cert" {...register('cert')} rows={8} placeholder="-----BEGIN CERTIFICATE-----\n..." />
                             {errors.cert && <p className="text-xs text-destructive">{errors.cert.message}</p>}
                         </div>
                         <Button type="submit" disabled={uploadStatus === 'saving'}>
                             {uploadStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                             Upload SSL Files
                         </Button>
                    </CardContent>
                </form>
             </Card>

            <Card>
                <CardHeader>
                     <CardTitle>Generate Self-Signed SSL</CardTitle>
                     <CardDescription>Generate a new self-signed certificate for testing/development (not for production). Requires server restart.</CardDescription>
                </CardHeader>
                <CardContent>
                    {generateStatus === 'error' && error && <ErrorDisplay message={error} />}
                    {generateStatus === 'success' && <p className='text-sm text-green-600'>Self-signed certificate generated successfully.</p>}
                    <Button
                        onClick={handleGenerate}
                        disabled={generateStatus === 'generating'}
                        variant="outline"
                    >
                         {generateStatus === 'generating' && <LoadingSpinner size="sm" className="mr-2" />}
                        Generate New Certificate
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
};

export default SslConfig;