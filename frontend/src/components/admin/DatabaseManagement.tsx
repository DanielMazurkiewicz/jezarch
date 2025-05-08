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
import { t } from '@/translations/utils'; // Import translation utility

const DatabaseManagement: React.FC = () => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
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
            // Use translated success message
            toast.success(t('dbBackupDownloadStartedMessage', preferredLanguage));

        } catch (err: any) {
            // Use translated error message template
            const msg = err.message || "Failed to download database backup.";
            setBackupError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: t('dbBackupFailedError', preferredLanguage) + ` (${msg})` }));
        } finally {
            setBackupLoading(false);
        }
    };

    // Removed restore-related handlers

    return (
        // Layout remains single column
        <div className='grid grid-cols-1 gap-6'>
             {/* Backup Card - forced white */}
             <Card>
                 <CardHeader>
                     {/* Use translated title and description */}
                     <CardTitle>{t('databaseBackupTitle', preferredLanguage)}</CardTitle>
                     <CardDescription>{t('databaseBackupDescription', preferredLanguage)}</CardDescription>
                 </CardHeader>
                 <CardContent className='space-y-4'>
                      {backupError && <ErrorDisplay message={backupError} />}
                     <Button onClick={handleDownloadBackup} disabled={backupLoading}>
                         {backupLoading ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="mr-2 h-4 w-4" />}
                         {/* Use translated button text */}
                         {t('downloadBackupButton', preferredLanguage)}
                     </Button>
                      {/* Adjusted muted color */}
                     <p className='text-xs text-neutral-500'>{t('dbRestoreManualInfo', preferredLanguage)}</p>
                 </CardContent>
             </Card>

            {/* Restore Card is permanently removed */}
        </div>
    );
};

export default DatabaseManagement;