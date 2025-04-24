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
import { cn } from '@/lib/utils';

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
    if (!success) {
        console.error("Login attempt failed.");
    }
  };

  return (
    // Use Card component - Increased shadow for more "window/dialog" like appearance
    // Forced white background and dark text
    <Card className="w-full max-w-sm shadow-lg border bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
      <CardHeader className="text-center pt-8"> {/* Added more top padding */}
        <CardTitle className="text-2xl">Welcome Back</CardTitle>
        <CardDescription>Sign in to access your JezArch account.</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 px-6 pb-4"> {/* Adjusted padding */}
          {error && <ErrorDisplay message={error} />}

          <div className="grid gap-1.5">
            <Label htmlFor="login">Login</Label>
            <Input
                id="login"
                placeholder="Your username"
                {...register("login")}
                aria-invalid={errors.login ? "true" : "false"}
                // Ensure input background contrasts with white card, default theme is fine here
                className={cn(errors.login && "border-destructive focus-visible:ring-destructive")}
             />
            {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                // Ensure input background contrasts with white card, default theme is fine here
                className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-4"> {/* Adjusted padding */}
          <Button type="submit" className="w-full" disabled={isLoading}>
             {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : 'Sign In'}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Button
                    variant="link"
                    type="button"
                    onClick={onSwitchToRegister}
                    className="p-0 h-auto font-semibold text-primary hover:underline"
                >
                    Register
                </Button>
           </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;