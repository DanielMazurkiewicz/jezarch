// Provides the 't' function for retrieving translations.
import { defaultLanguage, type SupportedLanguage, type AppTranslationKey } from './models'; // Use AppTranslationKey
import { getAllLoadedTranslations } from './loader';

const allTranslations = getAllLoadedTranslations();

/**
 * Translates a given key into the specified language, optionally replacing placeholders.
 * Falls back to the default language if the key is not found in the target language.
 * Returns the key itself if not found in default language either.
 *
 * Placeholders in the translation string should be like {placeholderName}.
 *
 * @param key The translation key (e.g., 'welcomeMessage').
 * @param lang The target language code (defaults to defaultLanguage).
 * @param placeholders An optional object with key-value pairs for replacement (e.g., { userLogin: 'John' }).
 * @returns The translated and interpolated string or the key if not found.
 */
export const t = (
    key: AppTranslationKey, // Use the union type for key suggestions
    lang: SupportedLanguage = defaultLanguage,
    placeholders?: Record<string, string | number> // Accept placeholders
): string => {
  const langTranslations = allTranslations[lang];
  const defaultLangTranslations = allTranslations[defaultLanguage];

  let translation = key; // Default to the key itself

  // Try target language first
  if (langTranslations && langTranslations[key] !== undefined) {
    translation = langTranslations[key];
  }
  // Fallback to default language
  else if (defaultLangTranslations && defaultLangTranslations[key] !== undefined) {
    // Optionally log a warning about fallback
    // console.warn(`Translation key "${key}" not found for language "${lang}", using default "${defaultLanguage}".`);
    translation = defaultLangTranslations[key];
  }
  // Log error if key not found anywhere
  else {
    console.error(`Translation key "${key}" not found for language "${lang}" or default "${defaultLanguage}".`);
  }

  // Replace placeholders if provided
  if (placeholders && typeof placeholders === 'object') {
    // Simple regex replace for {key} format
    translation = translation.replace(/{(\w+)}/g, (match, placeholderName) => {
      // If placeholder exists in the provided object, use its value, otherwise keep the placeholder text
      return placeholders[placeholderName] !== undefined ? String(placeholders[placeholderName]) : match;
    });
  }

  return translation;
};