import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, LoginFormData } from '@/lib/zodSchemas';
import { useAuth } from '@/hooks/useAuth';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import ErrorDisplay from '@/components/shared/ErrorDisplay';
import LoadingSpinner from '@/components/shared/LoadingSpinner';
import { cn } from '@/lib/utils'; // Import cn

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    const success = await login(data);
    // Navigation handled by App.tsx
    if (!success) {
        console.error("Login attempt failed.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-md"> {/* Added shadow */}
      <CardHeader className="text-center"> {/* Centered header text */}
        {/* Optional: Add a logo here */}
        {/* <img src="/path/to/logo.svg" alt="Logo" className="w-16 h-16 mx-auto mb-4" /> */}
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to access your JezArch account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4"> {/* Use space-y for consistent vertical spacing */}
          {/* Display API error if present */}
          {error && <ErrorDisplay message={error} className="mb-4" />}

          <div className="space-y-2"> {/* Group label and input */}
            <Label htmlFor="login">Login</Label>
            <Input
                id="login"
                placeholder="Your username" // Added placeholder
                {...register("login")}
                aria-invalid={errors.login ? "true" : "false"}
                className={cn(errors.login && "border-destructive focus-visible:ring-destructive")} // Highlight error field
             />
            {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>} {/* Added font-medium */}
          </div>

          <div className="space-y-2"> {/* Group label and input */}
            <Label htmlFor="password">Password</Label>
            <Input
                id="password"
                type="password"
                placeholder="••••••••" // Added placeholder
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                className={cn(errors.password && "border-destructive focus-visible:ring-destructive")} // Highlight error field
            />
            {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>} {/* Added font-medium */}
             {/* Optional: Add forgot password link */}
             {/* <div className="text-right">
                 <Button variant="link" type="button" className="p-0 h-auto text-xs">
                     Forgot password?
                 </Button>
             </div> */}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-4"> {/* Added top padding */}
          <Button type="submit" className="w-full" disabled={isLoading}>
             {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Sign In'}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button variant="link" type="button" onClick={onSwitchToRegister} className="p-0 h-auto font-semibold text-primary hover:underline"> {/* Adjusted link style */}
                    Register
                </Button>
           </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;