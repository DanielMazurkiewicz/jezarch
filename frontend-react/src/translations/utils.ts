// Provides the 't' function for retrieving translations.
import { defaultLanguage, type SupportedLanguage, type TranslationSet } from './models';
import { getAllLoadedTranslations } from './loader';

const allTranslations = getAllLoadedTranslations();

/**
 * Translates a given key into the specified language.
 * Falls back to the default language if the key is not found in the target language.
 * Returns the key itself if not found in default language either.
 *
 * @param key The translation key (e.g., 'loginTitle').
 * @param lang The target language code (defaults to defaultLanguage).
 * @returns The translated string or the key if not found.
 */
export const t = (key: string, lang: SupportedLanguage = defaultLanguage): string => {
  const langTranslations = allTranslations[lang];
  const defaultLangTranslations = allTranslations[defaultLanguage];

  // Try target language first
  if (langTranslations && langTranslations[key] !== undefined) {
    return langTranslations[key];
  }

  // Fallback to default language
  if (defaultLangTranslations && defaultLangTranslations[key] !== undefined) {
    // Optionally log a warning about fallback
    // console.warn(`Translation key "${key}" not found for language "${lang}", using default "${defaultLanguage}".`);
    return defaultLangTranslations[key];
  }

  // Fallback to the key itself if not found anywhere
  console.error(`Translation key "${key}" not found for language "${lang}" or default "${defaultLanguage}".`);
  return key;
};
