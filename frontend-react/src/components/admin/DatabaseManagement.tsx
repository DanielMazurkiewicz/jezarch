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

const DatabaseManagement: React.FC = () => {
    const { token } = useAuth();
    const [backupLoading, setBackupLoading] = useState(false);
    const [backupError, setBackupError] = useState<string | null>(null);
    // Removed all restore-related state and refs

    const handleDownloadBackup = async () => {
        if (!token) return;
        setBackupLoading(true);
        setBackupError(null);
        try {
            // API function expects a Blob response
            const blobResponse = await api.backupDatabase(token);

            if (!(blobResponse instanceof Blob)) {
                throw new Error('Invalid response received from server during backup.');
            }

            const url = window.URL.createObjectURL(blobResponse);
            const a = document.createElement('a');
            a.href = url;

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            a.download = `jezarch-backup-${timestamp}.sqlite.db`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Database backup download started.");

        } catch (err: any) {
            const msg = err.message || "Failed to download database backup.";
            setBackupError(msg);
            toast.error(msg);
        } finally {
            setBackupLoading(false);
        }
    };

    // Removed restore-related handlers

    return (
        // Layout remains single column
        <div className='grid grid-cols-1 gap-6'>
             {/* Backup Card */}
             <Card className="bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
                 <CardHeader>
                     <CardTitle>Database Backup</CardTitle>
                     {/* Clarified restore instructions */}
                     <CardDescription>Download a complete backup of the current application database. Restore must be done manually on the server.</CardDescription>
                 </CardHeader>
                 <CardContent className='space-y-4'>
                      {backupError && <ErrorDisplay message={backupError} />}
                     <Button onClick={handleDownloadBackup} disabled={backupLoading}>
                         {backupLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
                         Download Backup File
                     </Button>
                     {/* Updated restore instructions */}
                     <p className='text-xs text-muted-foreground'>Store backups securely. To restore: 1) Stop the server. 2) Replace the active database file (path in logs/config) with your backup file (ensure correct filename). 3) Restart the server.</p>
                 </CardContent>
             </Card>

            {/* Restore Card is permanently removed */}
        </div>
    );
};

export default DatabaseManagement;