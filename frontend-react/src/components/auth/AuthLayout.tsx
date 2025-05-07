import React, { useState } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Languages } from 'lucide-react';
// Assuming backend models are correctly pathed for SupportedLanguage
import type { SupportedLanguage } from '../../../../backend/src/functionalities/user/models';
import { supportedLanguages } from '../../../../backend/src/functionalities/user/models';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  // For now, language selection on this page is purely cosmetic
  // or could be used to hint language preference on registration if API supports it.
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setSelectedLanguage(lang);
    // Here you might store this preference locally (e.g., localStorage)
    // or pass it to login/register functions if they accept it.
    console.log("Auth page language preference changed to:", lang);
  };

  return (
    <div className="flex flex-col justify-center items-center min-h-screen w-full bg-muted/40 p-4">
      {/* Language Picker - Positioned at the top right */}
      <div className="absolute top-4 right-4">
        <Select
          value={selectedLanguage}
          onValueChange={(value) => handleLanguageChange(value as SupportedLanguage)}
        >
          <SelectTrigger className="w-[130px] h-9 bg-background">
            <div className="flex items-center gap-1.5">
              <Languages className="h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Language" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {supportedLanguages.map(lang => (
              <SelectItem key={lang} value={lang}>
                {lang.toUpperCase()}
              </SelectItem>
            ))}
            {/* Example of how to add more languages later
            <SelectItem value="de" disabled>Deutsch (DE)</SelectItem> */}
          </SelectContent>
        </Select>
      </div>

      {/* Main Auth Content (Login/Register Form) */}
      {children}
    </div>
  );
};

export default AuthLayout;