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

interface RegisterFormProps {
    onSwitchToLogin: () => void;
}

const RegisterForm: React.FC<RegisterFormProps> = ({ onSwitchToLogin }) => {
  const { register: registerUser, isLoading, error, clearError } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { login: '', password: '', confirmPassword: '' } // Add default values
  });

  const onSubmit = async (data: RegisterFormData) => {
    clearError();
    setIsSuccess(false);
    // Don't need login/confirmPassword for the API call
    const { confirmPassword, ...apiData } = data;
    const success = await registerUser(apiData);
    if (success) {
        setIsSuccess(true);
        // Keep user on registration success message, don't redirect automatically
    } else {
        // Error handled by useAuth and ErrorDisplay
        console.error("Registration attempt failed.");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Register</CardTitle>
        <CardDescription>Create your JezArch account.</CardDescription>
      </CardHeader>
      {isSuccess ? (
         <CardContent>
            <p className="text-green-600 text-center">
                Registration successful! You can now switch to the login page.
            </p>
         </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="grid gap-4">
            {/* Display API error */}
            {error && <ErrorDisplay message={error} />}
            <div className="grid gap-2">
                <Label htmlFor="reg-login">Login</Label>
                <Input
                    id="reg-login"
                    {...register("login")}
                    aria-invalid={errors.login ? "true" : "false"}
                />
                {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="reg-password">Password</Label>
                <Input
                    id="reg-password"
                    type="password"
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                />
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            <div className="grid gap-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    {...register("confirmPassword")}
                     aria-invalid={errors.confirmPassword ? "true" : "false"}
                 />
                {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
            </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size="sm" /> : 'Create Account'}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Button variant="link" type="button" onClick={onSwitchToLogin} className="p-0 h-auto font-semibold">
                    Login
                </Button>
            </p>
            </CardFooter>
        </form>
      )}
      {/* Show "Go to Login" button only after success */}
      {isSuccess && (
           <CardFooter>
                <Button variant="outline" className="w-full" onClick={onSwitchToLogin}>
                    Go to Login
                </Button>
           </CardFooter>
      )}
    </Card>
  );
};

export default RegisterForm;