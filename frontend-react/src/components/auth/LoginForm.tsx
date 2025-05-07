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
import { type SupportedLanguage } from '@/translations/models/auth';
import { t } from '@/translations/utils';

interface LoginFormProps {
    onSwitchToRegister: () => void;
    currentLanguage: SupportedLanguage; // Prop remains the same
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister, currentLanguage }) => {
  const { login, isLoading, error, clearError } = useAuth();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { login: '', password: '' }
  });

  const onSubmit = async (data: LoginFormData) => {
    clearError();
    // Pass currentLanguage (selected in AuthLayout) to the login function
    const success = await login(data, currentLanguage);
    if (!success) {
        console.error("Login attempt failed.");
    }
  };

  return (
    <Card className="w-full max-w-sm shadow-lg border bg-white dark:bg-white text-neutral-900 dark:text-neutral-900">
      {/* Use t() function with currentLanguage */}
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-2xl">{t('loginTitle', currentLanguage)}</CardTitle>
        <CardDescription>{t('loginDescription', currentLanguage)}</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4 px-6 pb-4">
          {error && <ErrorDisplay message={error} />}

          <div className="grid gap-1.5">
            <Label htmlFor="login">{t('loginLabel', currentLanguage)}</Label>
            <Input
                id="login"
                placeholder={t('loginPlaceholder', currentLanguage)}
                {...register("login")}
                aria-invalid={errors.login ? "true" : "false"}
                className={cn(errors.login && "border-destructive focus-visible:ring-destructive")}
             />
            {errors.login && <p className="text-xs text-destructive font-medium">{errors.login.message}</p>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="password">{t('passwordLabel', currentLanguage)}</Label>
            <Input
                id="password"
                type="password"
                placeholder={t('passwordPlaceholder', currentLanguage)}
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                className={cn(errors.password && "border-destructive focus-visible:ring-destructive")}
            />
            {errors.password && <p className="text-xs text-destructive font-medium">{errors.password.message}</p>}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 px-6 pb-6 pt-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
             {isLoading ? <LoadingSpinner size="sm" className="mr-2" /> : t('signInButton', currentLanguage)}
          </Button>
           <p className="text-center text-sm text-muted-foreground">
                {t('noAccountPrompt', currentLanguage)}{" "}
                <Button
                    variant="link"
                    type="button"
                    onClick={onSwitchToRegister}
                    className="p-0 h-auto font-semibold text-primary hover:underline"
                >
                    {t('registerLink', currentLanguage)}
                </Button>
           </p>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;