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
import { supportedLanguages as appSupportedLanguages, defaultLanguage as appDefaultLanguage, type SupportedLanguage as AppSupportedLanguage } from '@/translations/models/auth';
// Import the translation function from the new utils file
import { t } from '@/translations/utils';
import { useAuth } from '@/hooks/useAuth'; // Import useAuth to update context

interface AuthLayoutProps {
  children: React.ReactNode;
  // Add a prop to receive language changes from child forms if needed later
  // onLanguageChange?: (lang: AppSupportedLanguage) => void;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  const { user, setContextPreferredLanguage } = useAuth(); // Get setContextPreferredLanguage

  // Initialize language from AuthContext if user is loaded, otherwise from localStorage or default
  const getInitialLanguage = (): AppSupportedLanguage => {
      // Check if user language is valid
      const userLang = user?.preferredLanguage;
      if (userLang && appSupportedLanguages.includes(userLang)) {
          return userLang;
      }
      // Check localStorage language
      const storedLang = localStorage.getItem('authPreferredLanguage') as AppSupportedLanguage | null;
      if (storedLang && appSupportedLanguages.includes(storedLang)) {
          return storedLang;
      }
      // Fallback to default
      return appDefaultLanguage;
  };


  const [selectedLanguage, setSelectedLanguage] = useState<AppSupportedLanguage>(getInitialLanguage());

  // Update component's selectedLanguage if AuthContext's user.preferredLanguage changes or on initial mount
  useEffect(() => {
      const currentContextLang = getInitialLanguage();
      if (selectedLanguage !== currentContextLang) {
          setSelectedLanguage(currentContextLang);
      }
  }, [user?.preferredLanguage]); // Re-run when user's language in context changes


  const handleLanguageChange = (lang: AppSupportedLanguage) => {
    if (appSupportedLanguages.includes(lang)) {
        setSelectedLanguage(lang);
        setContextPreferredLanguage(lang); // Update language in AuthContext and localStorage
        console.log("Auth page language preference changed to:", lang);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-muted/40 p-4">
      {/* Language Picker - Positioned at the top right */}
      <div className="absolute top-4 right-4">
        <Select
          value={selectedLanguage}
          onValueChange={(value) => handleLanguageChange(value as AppSupportedLanguage)}
        >
          <SelectTrigger className="w-[150px] h-9 bg-background">
            <div className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-muted-foreground" />
              {/* Use the t function for the placeholder label */}
              <SelectValue placeholder={t('languagePickerLabel', selectedLanguage)} />
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
      {/* Pass current language to child forms */}
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          // Pass current language state to child components (LoginForm, RegisterForm)
          // This ensures they use the language selected in the layout
          // @ts-ignore // TypeScript might complain about adding props to React.ReactNode
          return React.cloneElement(child, { currentLanguage: selectedLanguage });
        }
        return child;
      })}
    </div>
  );
};

export default AuthLayout;