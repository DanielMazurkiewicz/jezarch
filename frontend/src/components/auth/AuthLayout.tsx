import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from 'lucide-react';
// Import types and constants from the new models file
import { supportedLanguages as appSupportedLanguages, defaultLanguage as appDefaultLanguage, type SupportedLanguage as AppSupportedLanguage } from '@/translations/models'; // Updated path
// Import the translation function from the new utils file
import { t } from '@/translations/utils';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to update context
import LoadingSpinner from '@/components/shared/LoadingSpinner'; // Import LoadingSpinner

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  // Get language and loading state directly from useAuth
  const { isLoading, preferredLanguage, setContextPreferredLanguage } = useAuth();

  // Local state to manage the language *displayed* in the select component
  // Initialize with the language from context, which is now determined reliably on load
  const [displayLanguage, setDisplayLanguage] = useState<AppSupportedLanguage>(preferredLanguage);

  // Update local display language if context language changes (e.g., after login/logout or fetch)
  useEffect(() => {
    if (preferredLanguage !== displayLanguage) {
      setDisplayLanguage(preferredLanguage);
    }
  }, [preferredLanguage, displayLanguage]);


  const handleLanguageChange = (lang: AppSupportedLanguage) => {
    if (appSupportedLanguages.includes(lang)) {
        setDisplayLanguage(lang); // Update local display state immediately
        setContextPreferredLanguage(lang); // Update global context and localStorage
        console.log("AuthLayout: Language preference changed to:", lang);
    }
  };

  // Show loading spinner while initial language/auth check is happening
  if (isLoading) {
    return (
       <div className="flex flex-col justify-center items-center min-h-screen w-full bg-muted/40 p-4">
          <LoadingSpinner />
       </div>
    );
  }

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-muted/40 p-4">
      {/* Language Picker - Positioned at the top right */}
      <div className="absolute top-4 right-4">
        <Select
          value={displayLanguage} // Use local display language
          onValueChange={(value) => handleLanguageChange(value as AppSupportedLanguage)}
        >
          <SelectTrigger className="w-[150px] h-9 bg-background">
            <div className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-muted-foreground" />
              {/* Use the t function for the placeholder label, based on displayLanguage */}
              <SelectValue placeholder={t('languagePickerLabel', displayLanguage)} />
            </div>
          </SelectTrigger>
          <SelectContent>
            {appSupportedLanguages.map(lang => (
              <SelectItem key={lang} value={lang}>
                {/* Display language names more descriptively if needed */}
                {lang === 'en' ? 'English (EN)' : lang === 'pl' ? 'Polski (PL)' : lang.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Main Auth Content (Login/Register Form) */}
      {/* Pass current display language to child forms */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // @ts-ignore // TypeScript might complain about adding props to React.ReactNode
          return React.cloneElement(child, { currentLanguage: displayLanguage });
        }
        return child;
      })}
    </div>
  );
};

export default AuthLayout;