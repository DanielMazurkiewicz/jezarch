import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import TagSelector from '@/components/shared/TagSelector';
import api from '@/lib/api';
import { toast } from "sonner";
import { t } from '@/translations/utils';
import type { Tag } from '../../../../backend/src/functionalities/tag/models';
import type { SupportedLanguage } from '../../../../backend/src/functionalities/user/models';

interface AssignTagsDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    targetUser: { login: string } | null;
    initialTagIds: number[];
    availableTags: Tag[];
    token: string | null;
    preferredLanguage: SupportedLanguage;
    onSave: () => void; // Called after successful save to refresh user list
}

const AssignTagsDialog: React.FC<AssignTagsDialogProps> = ({ isOpen, onOpenChange, targetUser, initialTagIds, availableTags, token, preferredLanguage, onSave }) => {
    const [assignedTags, setAssignedTags] = useState<number[]>(initialTagIds);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset local state when dialog opens with new user
    React.useEffect(() => {
        if (isOpen) {
            setAssignedTags(initialTagIds);
            setError(null);
        }
    }, [isOpen, initialTagIds]);

    const handleSave = async () => {
        if (!token || !targetUser) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await api.assignTagsToUser(targetUser.login, assignedTags, token);
            toast.success(t('tagsAssignedSuccess', preferredLanguage, { login: targetUser.login }));
            onOpenChange(false);
            onSave();
        } catch (err: any) {
            const msg = t('userTagAssignFailedError', preferredLanguage, { message: err.message });
            setError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!targetUser) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isSubmitting) onOpenChange(open); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('assignTagsDialogTitle', preferredLanguage, { login: targetUser.login })}</DialogTitle>
                    <DialogDescription>{t('assignTagsDialogDescription', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                {error && <ErrorDisplay message={error} className='my-2' />}
                <div className="py-4">
                    <TagSelector selectedTagIds={assignedTags} onChange={setAssignedTags} availableTags={availableTags} />
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                        <Button type="button" variant="outline" disabled={isSubmitting}>{t('cancelButton', preferredLanguage)}</Button>
                    </DialogClose>
                    <Button type="button" onClick={handleSave} disabled={isSubmitting}>
                        {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : t('saveButton', preferredLanguage)}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AssignTagsDialog;
