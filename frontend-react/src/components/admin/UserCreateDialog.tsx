import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { userCreateSchema, UserCreateFormData } from '@/lib/zodSchemas'; // Use new schema
import { useAuth } from '@/hooks/useAuth';
import api from '@/lib/api';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { toast } from "sonner";
import { cn } from '@/lib/utils';

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
    const { token } = useAuth();
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
            toast.success(`User "${newUser.login}" created successfully. You can now assign a role.`);
            onUserCreated(); // Notify parent to refresh list
            onOpenChange(false); // Close dialog
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create user.';
            setError(errorMsg);
            toast.error(`Error: ${errorMsg}`);
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
                    <DialogTitle>Create New User</DialogTitle>
                    <DialogDescription>Enter login details for the new user. Role can be assigned later.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 py-4">
                    {error && <ErrorDisplay message={error} />}

                    <div className="grid gap-1.5">
                        <Label htmlFor="create-login">Login</Label>
                        <Input
                            id="create-login"
                            placeholder="Username"
                            {...register("login")}
                            aria-invalid={errors.login ? "true" : "false"}
                            className={cn(errors.login && "border-destructive")}
                        />
                        {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="create-password">Password</Label>
                        <Input
                            id="create-password"
                            type="password"
                            placeholder="Initial password"
                            {...register("password")}
                            aria-invalid={errors.password ? "true" : "false"}
                            className={cn(errors.password && "border-destructive")}
                        />
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                        <p className='text-xs text-muted-foreground'>Min 8 chars, 1 uppercase, 1 lowercase, 1 number.</p>
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="create-confirmPassword">Confirm Password</Label>
                        <Input
                            id="create-confirmPassword"
                            type="password"
                            placeholder="Re-enter password"
                            {...register("confirmPassword")}
                            aria-invalid={errors.confirmPassword ? "true" : "false"}
                            className={cn(errors.confirmPassword && "border-destructive")}
                        />
                        {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
                    </div>

                    <DialogFooter className='mt-2'>
                        <DialogClose asChild>
                            <Button type="button" variant="outline" disabled={isLoading}>Cancel</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Create User'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default UserCreateDialog;