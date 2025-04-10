import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { sslSchema, SslFormData } from '@/lib/zodSchemas'; // Import schema and type
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert for status messages
import { CheckCircle, UploadCloud, RefreshCcw } from 'lucide-react'; // Import icons
import { cn } from '@/lib/utils'; // Import cn for conditional classes

const SslConfig: React.FC = () => {
    const { token } = useAuth();
    // Separate state for upload and generate operations
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
    const [generateStatus, setGenerateStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors, isDirty: isUploadFormDirty } } = useForm<SslFormData>({
        resolver: zodResolver(sslSchema),
        defaultValues: { key: '', cert: '' }, // Start with empty fields
    });

    // Handle uploading provided key/cert
    const handleUpload = async (data: SslFormData) => {
        if (!token) return;
        setUploadStatus('saving');
        setUploadError(null);
        try {
            // Ensure data structure matches SslConfig interface { key: string; cert: string }
            await api.uploadSsl({ key: data.key, cert: data.cert }, token);
            setUploadStatus('success');
            reset({ key: '', cert: '' }); // Clear form on success
            setTimeout(() => setUploadStatus('idle'), 3000); // Reset status after delay
        } catch (err: any) {
            setUploadError(err.message || "Failed to upload SSL configuration.");
            setUploadStatus('error');
        }
    };

    // Handle generating a self-signed certificate
    const handleGenerate = async () => {
        if (!token) return;
        // Confirmation dialog
        if (!window.confirm("This will generate a new self-signed certificate and overwrite any existing configuration. This is only recommended for testing/development. Continue?")) return;

        setGenerateStatus('generating');
        setGenerateError(null);
        try {
            await api.generateSsl(token);
            setGenerateStatus('success');
            setTimeout(() => setGenerateStatus('idle'), 3000); // Reset status after delay
            // Optionally fetch and display the new cert/key? Or just show success.
            // alert("Self-signed certificate generated successfully. Server might need a restart.");
        } catch (err: any) {
             setGenerateError(err.message || "Failed to generate SSL certificate.");
             setGenerateStatus('error');
        }
    };

    // Use a grid layout to place cards side-by-side on larger screens
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
             {/* Upload Card */}
             <Card>
                 <CardHeader>
                     <CardTitle>Upload Existing SSL</CardTitle>
                     <CardDescription>Paste your private key and certificate (PEM format). Requires server restart.</CardDescription>
                 </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(handleUpload)} className="space-y-4">
                         {/* Display upload status/error messages */}
                         {uploadStatus === 'error' && uploadError && <ErrorDisplay message={uploadError} />}
                         {uploadStatus === 'success' && (
                            <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                                <CheckCircle className="h-5 w-5 text-green-600" />
                                <AlertTitle>Upload Successful</AlertTitle>
                                <AlertDescription>SSL configuration uploaded. Server restart needed.</AlertDescription>
                            </Alert>
                         )}

                         {/* Private Key Input */}
                         <div className="grid gap-1.5">
                             <Label htmlFor="ssl-key">Private Key (.key)</Label>
                             <Textarea
                                id="ssl-key"
                                {...register('key')}
                                rows={8}
                                placeholder="-----BEGIN PRIVATE KEY-----\n..."
                                // Use mono font for keys/certs, apply error style
                                className={cn('font-mono text-xs', errors.key && "border-destructive")}
                                aria-invalid={!!errors.key}
                             />
                             {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
                         </div>

                         {/* Certificate Input */}
                         <div className="grid gap-1.5">
                             <Label htmlFor="ssl-cert">Certificate (.crt/.pem)</Label>
                             <Textarea
                                id="ssl-cert"
                                {...register('cert')}
                                rows={8}
                                placeholder="-----BEGIN CERTIFICATE-----\n..."
                                // Use mono font, apply error style
                                className={cn('font-mono text-xs', errors.cert && "border-destructive")}
                                aria-invalid={!!errors.cert}
                             />
                             {errors.cert && <p className="text-xs text-destructive">{errors.cert.message}</p>}
                         </div>

                         {/* Upload Button */}
                         <Button type="submit" disabled={uploadStatus === 'saving' || !isUploadFormDirty}>
                             {uploadStatus === 'saving' && <LoadingSpinner size="sm" className="mr-2" />}
                             <UploadCloud className="mr-2 h-4 w-4" /> Upload SSL Files
                         </Button>
                    </form>
                </CardContent>
             </Card>

            {/* Generate Card */}
            <Card>
                <CardHeader>
                     <CardTitle>Generate Self-Signed SSL</CardTitle>
                     <CardDescription>Generate a new certificate for testing/development (not for production). Requires server restart.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    {/* Display generate status/error messages */}
                    {generateStatus === 'error' && generateError && <ErrorDisplay message={generateError} />}
                    {generateStatus === 'success' && (
                       <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                           <CheckCircle className="h-5 w-5 text-green-600" />
                           <AlertTitle>Generation Successful</AlertTitle>
                           <AlertDescription>Self-signed certificate generated. Server restart may be required.</AlertDescription>
                       </Alert>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={generateStatus === 'generating'}
                        variant="outline" // Use outline style for less emphasis than upload
                    >
                         {generateStatus === 'generating' && <LoadingSpinner size="sm" className="mr-2" />}
                        <RefreshCcw className="mr-2 h-4 w-4" /> Generate New Certificate
                    </Button>
                     {/* Optional: Add info about where certs are stored */}
                     {/* <p className='text-xs text-muted-foreground pt-2'>Certificates will be stored in the configured path on the server.</p> */}
                </CardContent>
            </Card>
        </div>
    );
};

export default SslConfig;