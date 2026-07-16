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
// Updated imports: Get types and function from new locations
import { t } from '@/translations/utils';

interface LoginFormProps {
    onSwitchToRegister: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login, isLoading, error, clearError, preferredLanguage } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    // Login function no longer needs language passed here
    const success = await login(data);
    if (!success) {
        console.error("Login attempt failed.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg border">
      {/* Use t() function with preferredLanguage */}
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-2xl">{t('loginTitle', preferredLanguage)}</CardTitle>
        <CardDescription>{t('loginDescription', preferredLanguage)}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 px-6 pb-4">
          {error && <ErrorDisplay message={error} />}

          <div className="grid gap-1.5">
            <Label htmlFor="login">{t('loginLabel', preferredLanguage)}</Label>
            <Input
                id="login"
                placeholder={t('loginPlaceholder', preferredLanguage)}
                {...register("login")}
                aria-invalid={errors.login ? "true" : "false"}
                className={cn(errors.login && "border-destructive focus-visible:ring-destructive")}
                // Disable input while auth context is loading
                disabled={isLoading}
             />
            {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">{t('passwordLabel', preferredLanguage)}</Label>
            <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder', preferredLanguage)}
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
                // Disable input while auth context is loading
                disabled={isLoading}
            />
            {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-4">
           {/* Disable button while auth context is loading */}
          <Button type="submit" className="w-full" disabled={isLoading}>
             {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : t('signInButton', preferredLanguage)}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
                {t('noAccountPrompt', preferredLanguage)}{" "}
                <Button
                    variant="link"
                    type="button"
                    onClick={onSwitchToRegister}
                    className="p-0 h-auto font-semibold text-primary hover:underline"
                    // Disable button while auth context is loading
                    disabled={isLoading}
                >
                    {t('registerLink', preferredLanguage)}
                </Button>
           </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;