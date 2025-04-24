import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema, RegisterFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { login: '', password: '', confirmPassword: '' }
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    setIsSuccess(false);
    const { confirmPassword, ...apiData } = data;
    const success = await registerUser(apiData);
    if (success) {
        setIsSuccess(true);
    } else {
        console.error("Registration attempt failed.");
    }
  };

  return (
    // Use Card component - Increased shadow for more "window/dialog" like appearance
    // Forced white background and dark text
    <Card className="w-full max-w-sm shadow-lg border bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
      <CardHeader className="text-center pt-8"> {/* Added more top padding */}
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Enter your details to register.</CardDescription>
      </CardHeader>
      {isSuccess ? (
         <CardContent className="space-y-4 px-6 pb-6"> {/* Adjusted padding */}
            <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-50 text-green-700 dark:text-green-700">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <AlertTitle>Registration Successful!</AlertTitle>
                <AlertDescription>
                    Your account has been created. You can now log in.
                </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={onSwitchToLogin}>
                Go to Login
            </Button>
         </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4 px-6 pb-4"> {/* Adjusted padding */}
                {error && <ErrorDisplay message={error} />}

                <div className="grid gap-1.5">
                    <Label htmlFor="reg-login">Login</Label>
                    <Input
                        id="reg-login"
                        placeholder="Choose a username"
                        {...register("login")}
                        aria-invalid={errors.login ? "true" : "false"}
                        // Ensure input background contrasts with white card, default theme is fine here
                        className={cn(errors.login && "border-destructive focus-visible:ring-destructive")}
                    />
                    {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>}
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="reg-password">Password</Label>
                    <Input
                        id="reg-password"
                        type="password"
                        placeholder="Create a strong password"
                        {...register("password")}
                        aria-invalid={errors.password ? "true" : "false"}
                        // Ensure input background contrasts with white card, default theme is fine here
                        className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
                    />
                    {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
                </div>

                <div className="grid gap-1.5">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter your password"
                        {...register("confirmPassword")}
                        aria-invalid={errors.confirmPassword ? "true" : "false"}
                        // Ensure input background contrasts with white card, default theme is fine here
                        className={cn(errors.confirmPassword && "border-destructive focus-visible:ring-destructive")}
                    />
                    {errors.confirmPassword && <p className="text-xs text-destructive font-medium">{errors.confirmPassword.message}</p>}
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-4"> {/* Adjusted padding */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Create Account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={onSwitchToLogin}
                        className="p-0 h-auto font-semibold text-primary hover:underline"
                    >
                        Login
                    </Button>
                </p>
            </CardFooter>
        </form>
      )}
    </Card>
  );
};

export default RegisterForm;