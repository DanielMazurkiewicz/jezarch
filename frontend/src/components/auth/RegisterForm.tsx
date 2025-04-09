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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert
import { CheckCircle } from 'lucide-react'; // Import an icon for success
import { cn } from '@/lib/utils'; // Import cn

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
    <Card className="w-full max-w-sm shadow-md"> {/* Added shadow */}
      <CardHeader className="text-center"> {/* Centered header text */}
         {/* Optional: Add a logo here */}
         {/* <img src="/path/to/logo.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4" /> */}
        <CardTitle className="text-2xl">Create Account</CardTitle>
        <CardDescription>Enter your details to register.</CardDescription>
      </CardHeader>
      {isSuccess ? (
         <CardContent className="space-y-4">
            <Alert variant="default" className="border-green-600 bg-green-50 dark:bg-green-900/30"> {/* Success Alert */}
                <CheckCircle className="h-5 w-5 text-green-600" /> {/* Success Icon */}
                <AlertTitle className="text-green-700 dark:text-green-400">Registration Successful!</AlertTitle>
                <AlertDescription className="text-green-600 dark:text-green-300">
                    Your account has been created. You can now proceed to log in.
                </AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={onSwitchToLogin}>
                Go to Login
            </Button>
         </CardContent>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4"> {/* Use space-y for consistent vertical spacing */}
            {/* Display API error */}
            {error && <ErrorDisplay message={error} className="mb-4" />}

            <div className="space-y-2"> {/* Group label and input */}
                <Label htmlFor="reg-login">Login</Label>
                <Input
                    id="reg-login"
                    placeholder="Choose a username" // Added placeholder
                    {...register("login")}
                    aria-invalid={errors.login ? "true" : "false"}
                    className={cn(errors.login && "border-destructive focus-visible:ring-destructive")} // Highlight error field
                />
                {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>} {/* Added font-medium */}
            </div>

            <div className="space-y-2"> {/* Group label and input */}
                <Label htmlFor="reg-password">Password</Label>
                <Input
                    id="reg-password"
                    type="password"
                    placeholder="Create a strong password" // Added placeholder
                    {...register("password")}
                    aria-invalid={errors.password ? "true" : "false"}
                    className={cn(errors.password && "border-destructive focus-visible:ring-destructive")} // Highlight error field
                />
                {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>} {/* Added font-medium */}
            </div>

            <div className="space-y-2"> {/* Group label and input */}
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password" // Added placeholder
                    {...register("confirmPassword")}
                    aria-invalid={errors.confirmPassword ? "true" : "false"}
                    className={cn(errors.confirmPassword && "border-destructive focus-visible:ring-destructive")} // Highlight error field
                 />
                {errors.confirmPassword && <p className="text-xs text-destructive font-medium">{errors.confirmPassword.message}</p>} {/* Added font-medium */}
            </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-4"> {/* Added top padding */}
                <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Create Account'}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                    Already have an account?{" "}
                    <Button variant="link" type="button" onClick={onSwitchToLogin} className="p-0 h-auto font-semibold text-primary hover:underline"> {/* Adjusted link style */}
                        Login
                    </Button>
                </p>
            </CardFooter>
        </form>
      )}
      {/* Removed separate "Go to Login" button as it's now inside the success Alert area */}
    </Card>
  );
};

export default RegisterForm;