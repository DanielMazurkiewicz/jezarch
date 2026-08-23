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
  | 'registrationFailedFallbackError'
  | 'loginFailedFallbackError'
  | 'registerSuccessToast'
  | 'logoutServerNotifyFailedWarning'
  | 'logoutSuccess'
  | 'logoutSuccessWithUser'
  | 'registerSuccessTitle'
  | 'registerSuccessDescription'
  | 'registerGoToLoginButton'
  | 'registerDescription'
  | 'confirmPasswordLabel'
  | 'confirmPasswordPlaceholder'
  | 'createAccountButton'
  | 'hasAccountPrompt'
  | 'loginLink'
  | 'languagePickerLabel'
  | 'logoutFailedError';


export type AuthTranslationSet = TranslationSet<AuthTranslationKey> 

