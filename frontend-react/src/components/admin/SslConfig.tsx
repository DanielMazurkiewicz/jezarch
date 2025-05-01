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
import { CheckCircle, UploadCloud, RefreshCcw, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { cn } from '@/lib/utils'; // Import cn for conditional classes
import { toast } from "sonner"; // Import toast

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

        // REMOVED server restart confirmation dialog

        setUploadStatus('saving');
        setUploadError(null);
        try {
            // API call returns message indicating restart is needed
            const response = await api.uploadSsl({ key: data.key, cert: data.cert }, token);
            setUploadStatus('success');
            toast.warning(response.message || "SSL config uploaded. Manual server restart required."); // Use warning toast
            reset({ key: '', cert: '' }); // Clear form on success
            setTimeout(() => setUploadStatus('idle'), 3000); // Reset status after delay

        } catch (err: any) {
            const msg = err.message || "Failed to upload SSL configuration.";
            setUploadError(msg); toast.error(msg);
            setUploadStatus('error');
        }
    };

    // Handle generating a self-signed certificate
    const handleGenerate = async () => {
        if (!token) return;

        // Confirmation dialog (still useful for self-signed overwrite warning)
        if (!window.confirm("Generating a new self-signed certificate will overwrite any existing SSL configuration. This is only recommended for testing/development. Continue?")) {
            return;
        }

        setGenerateStatus('generating');
        setGenerateError(null);
        try {
            const response = await api.generateSsl(token);
            setGenerateStatus('success');
            toast.warning(response.message || "Self-signed certificate generated. Manual server restart required."); // Use warning toast
            setTimeout(() => setGenerateStatus('idle'), 3000); // Reset status after delay

        } catch (err: any) {
             const msg = err.message || "Failed to generate SSL certificate.";
             setGenerateError(msg); toast.error(msg);
             setGenerateStatus('error');
        }
    };

    // Use a grid layout to place cards side-by-side on larger screens
    return (
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
             {/* Upload Card - forced white background */}
             <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
                 <CardHeader>
                     <CardTitle>Upload Existing SSL</CardTitle>
                     <CardDescription>Paste your private key and certificate (PEM format). Requires manual server restart.</CardDescription>
                 </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(handleUpload)} className="space-y-4">
                         {/* Display upload status/error messages */}
                         {uploadStatus === 'error' && uploadError && <ErrorDisplay message={uploadError} />}
                         {uploadStatus === 'success' && (
                            <Alert variant="default" className="border-yellow-600 bg-yellow-50 dark:bg-yellow-50 text-yellow-800 dark:text-yellow-800"> {/* Use warning style */}
                                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                                <AlertTitle>Upload Successful - Restart Required</AlertTitle>
                                <AlertDescription>SSL configuration uploaded. Manual server restart required for changes to take effect.</AlertDescription>
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
                                disabled={uploadStatus === 'saving'} // Disable during save
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
                                disabled={uploadStatus === 'saving'} // Disable during save
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

            {/* Generate Card - forced white background */}
            <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
                <CardHeader>
                     <CardTitle>Generate Self-Signed SSL</CardTitle>
                     <CardDescription>Generate a new certificate for testing/development (not for production). Requires manual server restart.</CardDescription>
                </CardHeader>
                <CardContent className='space-y-4'>
                    {/* Display generate status/error messages */}
                    {generateStatus === 'error' && generateError && <ErrorDisplay message={generateError} />}
                    {generateStatus === 'success' && (
                       <Alert variant="default" className="border-yellow-600 bg-yellow-50 dark:bg-yellow-50 text-yellow-800 dark:text-yellow-800"> {/* Use warning style */}
                           <AlertTriangle className="h-5 w-5 text-yellow-600" />
                           <AlertTitle>Generation Successful - Restart Required</AlertTitle>
                           <AlertDescription>Self-signed certificate generated. Manual server restart required for changes to take effect.</AlertDescription>
                       </Alert>
                    )}
                    {/* Add warning */}
                     <Alert variant="destructive">
                         <AlertTriangle className="h-4 w-4" />
                         <AlertTitle>Warning</AlertTitle>
                         <AlertDescription>Generating a new certificate will overwrite existing SSL settings. Manual server restart required afterwards.</AlertDescription>
                     </Alert>

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