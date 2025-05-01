import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
// Removed unused Input and Label
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { toast } from "sonner";
// Removed Upload and AlertTriangle icons, kept Download
import { Download } from 'lucide-react';
// Removed Alert related imports
// import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DatabaseManagement: React.FC = () => {
    const { token } = useAuth();
    const [backupLoading, setBackupLoading] = useState(false);
    // Removed restore state variables
    // const [restoreLoading, setRestoreLoading] = useState(false);
    const [backupError, setBackupError] = useState<string | null>(null);
    // const [restoreError, setRestoreError] = useState<string | null>(null);
    // const [restoreSuccessMessage, setRestoreSuccessMessage] = useState<string | null>(null);
    // const [restoreInstructions, setRestoreInstructions] = useState<string | null>(null);
    // const fileInputRef = useRef<HTMLInputElement>(null); // Removed file input ref

    const handleDownloadBackup = async () => {
        if (!token) return;
        setBackupLoading(true);
        setBackupError(null);
        try {
            // The API function now expects a Blob response
            const blobResponse = await api.backupDatabase(token);

            // Ensure it's actually a blob
            if (!(blobResponse instanceof Blob)) {
                throw new Error('Invalid response received from server during backup.');
            }

            // Create a URL for the blob
            const url = window.URL.createObjectURL(blobResponse);
            const a = document.createElement('a');
            a.href = url;

            // Generate filename (backend doesn't reliably provide it via headers after fetch)
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `jezarch-backup-${timestamp}.sqlite.db`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url); // Clean up the object URL
            toast.success("Database backup download started.");

        } catch (err: any) {
            const msg = err.message || "Failed to download database backup.";
            setBackupError(msg);
            toast.error(msg);
        } finally {
            setBackupLoading(false);
        }
    };

    // Removed handleRestoreUpload function
    // Removed triggerFileInput function

    return (
        // Changed to single column layout as only backup remains
        <div className='grid grid-cols-1 gap-6'>
             {/* Backup Card */}
             <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
                 <CardHeader>
                     <CardTitle>Database Backup</CardTitle>
                     <CardDescription>Download a complete backup of the current application database. Restore must be done manually on the server.</CardDescription>
                 </CardHeader>
                 <CardContent className='space-y-4'>
                      {backupError && <ErrorDisplay message={backupError} />}
                     <Button onClick={handleDownloadBackup} disabled={backupLoading}>
                         {backupLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
                         Download Backup File
                     </Button>
                     <p className='text-xs text-muted-foreground'>Store backups securely. To restore, stop the server, replace the `jezarch.sqlite.db` file with your backup (ensure it's named correctly), and restart the server.</p>
                 </CardContent>
             </Card>

            {/* Removed Restore Card */}
        </div>
    );
};

export default DatabaseManagement;