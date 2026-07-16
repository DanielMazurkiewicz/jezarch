import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { setPasswordSchema, SetPasswordFormData } from '@/lib/zodSchemas';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import api from '@/lib/api';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils';
import type { SupportedLanguage } from '../../../../backend/src/functionalities/user/models';

interface SetPasswordDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    targetUser: { login: string } | null;
    token: string | null;
    preferredLanguage: SupportedLanguage;
}

const SetPasswordDialog: React.FC<SetPasswordDialogProps> = ({ isOpen, onOpenChange, targetUser, token, preferredLanguage }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<SetPasswordFormData>({
        resolver: zodResolver(setPasswordSchema), defaultValues: { password: '' },
    });

    const onSubmit = async (data: SetPasswordFormData) => {
        if (!token || !targetUser) return;
        setIsSubmitting(true);
        setError(null);
        try {
            await api.adminSetUserPassword(targetUser.login, data.password, token);
            toast.success(t('passwordSetSuccess', preferredLanguage, { login: targetUser.login }));
            onOpenChange(false);
            reset({ password: '' });
        } catch (err: any) {
            const msg = t('userPasswordSetFailedError', preferredLanguage, { login: targetUser.login, message: err.message });
            setError(msg);
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: msg }));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!isSubmitting) onOpenChange(open); }}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{t('setPasswordDialogTitle', preferredLanguage, { login: targetUser?.login || '...' })}</DialogTitle>
                    <DialogDescription>{t('setPasswordDialogDescription', preferredLanguage)}</DialogDescription>
                </DialogHeader>
                {error && <ErrorDisplay message={error} className='my-2' />}
                <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-start gap-x-4 gap-y-1">
                            <Label htmlFor="new-password" className="text-right pt-2">{t('newPasswordLabel', preferredLanguage)}</Label>
                            <div className="col-span-3 space-y-1">
                                <Input id="new-password" type="password" {...register("password")} className={cn(errors.password && "border-destructive")} aria-invalid={!!errors.password} />
                                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isSubmitting}>{t('cancelButton', preferredLanguage)}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isSubmitting || !!errors.password}>
                            {isSubmitting ? <LoadingSpinner size="sm" className="mr-2" /> : t('setPasswordButton', preferredLanguage)}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default SetPasswordDialog;
