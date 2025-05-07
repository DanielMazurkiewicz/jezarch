// Example of defining specific keys for a module (optional but good practice)

import { TranslationSet } from "../models";

// Keys specific to the authentication module (login/register screens)
export type AuthTranslationKey =
  | 'loginTitle'
  | 'loginDescription'
  | 'loginLabel'
  | 'loginPlaceholder'
  | 'passwordLabel'
  | 'passwordPlaceholder'
  | 'signInButton'
  | 'noAccountPrompt'
  | 'registerLink'
  | 'registerTitle'
  | 'registerDescription'
  | 'confirmPasswordLabel'
  | 'confirmPasswordPlaceholder'
  | 'createAccountButton'
  | 'hasAccountPrompt'
  | 'loginLink'
  | 'languagePickerLabel';


export type AuthTranslationSet = TranslationSet<AuthTranslationKey> 

