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

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' } // Add default values
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError(); // Clear previous errors before attempting login
    const success = await login(data);
    // Navigation is handled by App.tsx based on isAuthenticated state change
    // No explicit navigation needed here if login is successful
    if (!success) {
        // Error is set in useAuth hook and displayed by ErrorDisplay
        console.error("Login attempt failed.");
    }
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-2xl">Login</CardTitle>
        <CardDescription>Enter your login below to access your account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4">
          {/* Display API error if present */}
          {error && <ErrorDisplay message={error} />}
          <div className="grid gap-2">
            <Label htmlFor="login">Login</Label>
            <Input
                id="login"
                {...register("login")}
                aria-invalid={errors.login ? "true" : "false"}
             />
            {errors.login && <p className="text-xs text-destructive">{errors.login.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="password">Password</Label>
            <Input
                id="password"
                type="password"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
             {isLoading ? <LoadingSpinner size="sm" /> : 'Sign In'}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button variant="link" type="button" onClick={onSwitchToRegister} className="p-0 h-auto font-semibold">
                    Register
                </Button>
           </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;