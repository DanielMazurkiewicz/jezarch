// Responsible for loading and providing access to translation sets.
import type { AllTranslations, SupportedLanguage, TranslationSet } from './models';
import { authTranslationsEN } from './data/en/auth';
import { authTranslationsPL } from './data/pl/auth';
import { AuthTranslationKey } from './models/auth';

// Combine all translations into a single structure
// For now, we only have 'auth' translations. If you add more modules (e.g., 'common', 'notes'),
// you would import and combine them here, perhaps namespacing them like:
// en: { ...commonTranslationsEN, ...authTranslationsEN, ...notesTranslationsEN },
const loadedTranslations: AllTranslations<
  | AuthTranslationKey
> = {
  en: {
    ...authTranslationsEN
  },
  pl: {
    ...authTranslationsPL
  },
};

/**
 * Retrieves the complete translation set for a given language.
 *
 * @param lang The desired language code.
 * @returns The TranslationSet for the language, or undefined if not found.
 */
export const getTranslationsForLanguage = (lang: SupportedLanguage): TranslationSet | undefined => {
  return loadedTranslations[lang];
};

/**
 * Provides access to all loaded translations.
 * Primarily for use by the translation utility function.
 */
export const getAllLoadedTranslations = (): AllTranslations => {
  return loadedTranslations;
};