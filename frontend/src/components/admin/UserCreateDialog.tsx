import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userCreateSchema, UserCreateFormData } from '@/lib/zodSchemas'; // Use new schema
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
// --- FIX: Added DialogTrigger import ---
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose, DialogTrigger } from "@/components/ui/dialog";
// --------------------------------------
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { t } from '@/translations/utils'; // Import translation utility

interface UserCreateDialogProps {
    children: React.ReactNode; // To wrap the trigger button
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onUserCreated: () => void; // Callback after successful creation
}

const UserCreateDialog: React.FC<UserCreateDialogProps> = ({
    children,
    isOpen,
    onOpenChange,
    onUserCreated
}) => {
    const { token, preferredLanguage } = useAuth(); // Get preferredLanguage
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<UserCreateFormData>({
        resolver: zodResolver(userCreateSchema),
        defaultValues: { login: '', password: '', confirmPassword: '' }
    });

    const onSubmit = async (data: UserCreateFormData) => {
        if (!token) { setError("Authentication error."); return; }
        setIsLoading(true); setError(null);
        const { confirmPassword, ...apiData } = data; // Exclude confirmPassword

        try {
            const newUser = await api.register(apiData); // Use existing register endpoint
            // Use translated success message
            toast.success(t('userCreatedSuccessAdmin', preferredLanguage, { login: newUser.login }));
            onUserCreated(); // Notify parent to refresh list
            onOpenChange(false); // Close dialog
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create user.';
            setError(errorMsg);
            // Use translated error message
            toast.error(t('errorMessageTemplate', preferredLanguage, { message: errorMsg }));
        } finally {
            setIsLoading(false);
        }
    };

    // Reset form and error state when dialog is closed/opened
    React.useEffect(() => {
        if (!isOpen) {
            reset();
            setError(null);
        }
    }, [isOpen, reset]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    {/* Use translated title and description */}
                    <DialogTitle>{t('createNewUserDialogTitle', preferredLanguage)}</DialogTitle>
                    <DialogDescription>{t('createNewUserDialogDescription', preferredLanguage)}</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    {error && <ErrorDisplay message={error} />}

                    <div className="grid gap-1.5">
                        {/* Use translated label and placeholder */}
                        <Label htmlFor="create-login">{t('loginLabel', preferredLanguage)}</Label>
                        <Input
                            id="create-login"
                            placeholder={t('loginPlaceholder', preferredLanguage)}
                            {...register("login")}
                            aria-invalid={errors.login ? "true" : "false"}
                            className={cn(errors.login && "border-destructive")}
                        />
                        {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
                    </div>

                    <div className="grid gap-1.5">
                        {/* Use translated label and placeholder */}
                        <Label htmlFor="create-password">{t('passwordLabel', preferredLanguage)}</Label>
                        <Input
                            id="create-password"
                            type="password"
                            placeholder={t('passwordPlaceholder', preferredLanguage)}
                            {...register("password")}
                            aria-invalid={errors.password ? "true" : "false"}
                            className={cn(errors.password && "border-destructive")}
                        />
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                        {/* TODO: Translate password requirements hint */}
                        <p className='text-xs text-muted-foreground'>Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                    </div>

                    <div className="grid gap-1.5">
                         {/* Use translated label and placeholder */}
                        <Label htmlFor="create-confirmPassword">{t('confirmPasswordLabel', preferredLanguage)}</Label>
                        <Input
                            id="create-confirmPassword"
                            type="password"
                            placeholder={t('confirmPasswordPlaceholder', preferredLanguage)}
                            {...register("confirmPassword")}
                            aria-invalid={errors.confirmPassword ? "true" : "false"}
                            className={cn(errors.confirmPassword && "border-destructive")}
                        />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                    </div>

                    <DialogFooter className='mt-2'>
                        <DialogClose asChild>
                            {/* Use translated button text */}
                            <Button type="button" variant="outline" disabled={isLoading}>{t('cancelButton', preferredLanguage)}</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {/* Use translated button text */}
                            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : t('createUserButtonAdmin', preferredLanguage)}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UserCreateDialog;