import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { updatePreferredLanguageFormSchema, UpdatePreferredLanguageFormData } from '@/lib/zodSchemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils';
import type { User, SupportedLanguage } from '../../../../backend/src/functionalities/user/models';
import { supportedLanguages } from '../../../../backend/src/functionalities/user/models';

interface SetLanguageDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    targetUser: { login: string; preferredLanguage?: string; userId?: number } | null;
    token: string | null;
    preferredLanguage: SupportedLanguage;
    adminUser?: { userId?: number } | null;
    updateContextUser?: (updates: Partial<Pick<User, 'preferredLanguage'>>) => void;
    onSave: () => void; // Called after successful save to refresh user list
}

const SetLanguageDialog: React.FC<SetLanguageDialogProps> = ({ isOpen, onOpenChange, targetUser, token, preferredLanguage, adminUser, updateContextUser, onSave }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { control, handleSubmit, reset, formState: { errors } } = useForm<UpdatePreferredLanguageFormData>({
        resolver: zodResolver(updatePreferredLanguageFormSchema),
        defaultValues: { preferredLanguage: 'en' },
    });

    // Reset form when dialog opens with new user
    React.useEffect(() => {
        if (isOpen && targetUser) {
            reset({ preferredLanguage: (targetUser.preferredLanguage as SupportedLanguage | undefined) || 'en' });
            setError(null);
        }
    }, [isOpen, targetUser, reset]);

    const getLanguageDisplay = (langCode: SupportedLanguage): string => {
        switch (langCode) {
            case 'en': return 'English (EN)';
            case 'pl': return 'Polski (PL)';
        }
    };

    const onSubmit = async (data: UpdatePreferredLanguageFormData) => {
        if (!token || !targetUser) return;
        setIsSubmitting(true);
        setError(null);
        try {
            const updatedUser = await api.updateUserPreferredLanguage(targetUser.login, data.preferredLanguage, token);
            toast.success(t('languageUpdatedSuccess', preferredLanguage, { login: targetUser.login, language: data.preferredLanguage === 'en' ? 'EN' : 'PL' }));
            // If the updated user is the current admin, update context
            if (adminUser && updateContextUser && adminUser.userId === targetUser.userId) {
                updateContextUser({ preferredLanguage: updatedUser.preferredLanguage });
            }
            onOpenChange(false);
            onSave();
        } catch (err: any) {
            const msg = t('userLanguageUpdateFailedError', preferredLanguage, { login: targetUser.login, message: err.message });
            setError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!targetUser) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isSubmitting) onOpenChange(open); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('setLanguageDialogTitle', preferredLanguage, { login: targetUser.login })}</DialogTitle>
                    <DialogDescription>{t('setLanguageDialogDescription', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                {error && <ErrorDisplay message={error} className='my-2' />}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-1.5">
                            <Label htmlFor="preferredLanguage">{t('languageLabel', preferredLanguage)}</Label>
                            <Controller
                                name="preferredLanguage"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger id="preferredLanguage" className={cn(errors.preferredLanguage && "border-destructive")}>
                                            <SelectValue placeholder={t('selectLanguagePlaceholder', preferredLanguage)} />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {supportedLanguages.map(lang => (
                                                <SelectItem key={lang} value={lang}>{getLanguageDisplay(lang)}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {errors.preferredLanguage && <p className="text-xs text-destructive">{errors.preferredLanguage.message}</p>}
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>{t('cancelButton', preferredLanguage)}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting || !!errors.preferredLanguage}>
                            {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : t('saveButton', preferredLanguage)}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SetLanguageDialog;
