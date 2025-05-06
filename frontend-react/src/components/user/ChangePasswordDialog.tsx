// src/components/user/ChangePasswordDialog.tsx
import React, { useState, useEffect } from 'react'; // Added useEffect
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema, ChangePasswordFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from "sonner";
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from 'lucide-react';

interface ChangePasswordDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
}

const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ isOpen, onOpenChange }) => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
        defaultValues: { oldPassword: '', password: '', confirmPassword: '' }
    });

    const onSubmit = async (data: ChangePasswordFormData) => {
        if (!token) { setError("Authentication error."); return; }
        setIsLoading(true); setError(null); setIsSuccess(false);
        const { confirmPassword, ...apiData } = data; // Exclude confirmPassword from API call

        try {
            await api.changePassword(apiData, token);
            toast.success("Password changed successfully!");
            setIsSuccess(true); // Show success message
            reset(); // Clear form
            setTimeout(() => { // Close dialog after a delay
                onOpenChange(false);
                setIsSuccess(false); // Reset success state for next time
            }, 2500);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || 'Failed to change password.';
             // Check specifically for old password mismatch error (status 401 from backend)
            if (err.message?.includes("Invalid current password") || err.status === 401) {
                setError("Incorrect current password.");
            } else {
                setError(errorMsg);
            }
            toast.error(`Error: ${errorMsg}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Reset form and error state when dialog is closed/opened
    useEffect(() => {
        if (!isOpen) {
            reset();
            setError(null);
            setIsSuccess(false);
        }
    }, [isOpen, reset]);

    // --- WORKAROUND: Explicitly remove pointer-events style on close ---
    useEffect(() => {
        // This effect runs when the `isOpen` prop changes.
        if (!isOpen) {
            // Use requestAnimationFrame to ensure the style change happens slightly after
            // the state update, potentially giving Radix time to finish its own logic,
            // but this will override it if necessary.
            requestAnimationFrame(() => {
                if (document.body.style.pointerEvents === 'none') {
                    console.log("ChangePasswordDialog: Forcing removal of 'pointer-events: none' from body.");
                    document.body.style.pointerEvents = 'auto';
                }
            });
        }
        // No specific cleanup needed here, as we're correcting a potentially stuck global style.
    }, [isOpen]); // Re-run only when isOpen changes
    // --- END WORKAROUND ---

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Change Your Password</DialogTitle>
                    <DialogDescription>Enter your current password and choose a new one.</DialogDescription>
                </DialogHeader>

                {isSuccess ? (
                    <div className="py-4">
                         <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-50 text-green-700 dark:text-green-700">
                             <CheckCircle className="h-5 w-5 text-green-600" />
                             <AlertTitle>Success!</AlertTitle>
                             <AlertDescription>Your password has been updated.</AlertDescription>
                         </Alert>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                         {error && <ErrorDisplay message={error} />}

                        <div className="grid gap-1.5">
                            <Label htmlFor="oldPassword">Current Password</Label>
                            <Input
                                id="oldPassword"
                                type="password"
                                {...register("oldPassword")}
                                aria-invalid={errors.oldPassword ? "true" : "false"}
                                className={cn(errors.oldPassword && "border-destructive")}
                            />
                            {errors.oldPassword && <p className="text-xs text-destructive">{errors.oldPassword.message}</p>}
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="newPassword">New Password</Label>
                            <Input
                                id="newPassword"
                                type="password"
                                {...register("password")}
                                aria-invalid={errors.password ? "true" : "false"}
                                className={cn(errors.password && "border-destructive")}
                            />
                             {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                             <p className='text-xs text-muted-foreground'>Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                        </div>

                        <div className="grid gap-1.5">
                            <Label htmlFor="confirmPassword">Confirm New Password</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                {...register("confirmPassword")}
                                aria-invalid={errors.confirmPassword ? "true" : "false"}
                                className={cn(errors.confirmPassword && "border-destructive")}
                            />
                            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                        </div>

                         <DialogFooter className='mt-2'>
                             {/* DialogClose triggers onOpenChange(false) */}
                             <DialogClose asChild>
                                 <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
                             </DialogClose>
                             <Button type="submit" disabled={isLoading}>
                                 {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Change Password'}
                             </Button>
                         </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default ChangePasswordDialog;