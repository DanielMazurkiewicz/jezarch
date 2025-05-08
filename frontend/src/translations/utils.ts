// Provides the 't' function for retrieving translations.
// --- UPDATED: Import frontend defaultLanguage ---
import { type SupportedLanguage, type AppTranslationKey, defaultLanguage as frontendDefaultLanguage } from './models'; // Use AppTranslationKey and frontend default
// -----------------------------------------------
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
 * @param lang The target language code (defaults to frontendDefaultLanguage).
 * @param placeholders An optional object with key-value pairs for replacement (e.g., { userLogin: 'John' }).
 * @returns The translated and interpolated string or the key if not found.
 */
export const t = (
    key: AppTranslationKey, // Use the union type for key suggestions
    lang: SupportedLanguage = frontendDefaultLanguage, // Default to frontend's default
    placeholders?: Record<string, string | number> // Accept placeholders
): string => {
  // --- UPDATED: Use frontend default language ---
  const langTranslations = allTranslations[lang] || allTranslations[frontendDefaultLanguage]; // Fallback to default immediately if lang not found
  const defaultLangTranslations = allTranslations[frontendDefaultLanguage];
  // -----------------------------------------------

  let translation = key; // Default to the key itself

  // Try target language (or the fallback language set above)
  if (langTranslations && langTranslations[key] !== undefined) {
    translation = langTranslations[key];
  }
  // Only log error if key is not even in the *true* default language
  else if (defaultLangTranslations && defaultLangTranslations[key] === undefined) {
    console.error(`Translation key "${key}" not found for language "${lang}" or default "${frontendDefaultLanguage}".`);
  } else if (lang !== frontendDefaultLanguage && (!defaultLangTranslations || defaultLangTranslations[key] === undefined)) {
    // Log warning if it fell back from a requested language that wasn't the default, and the key is missing in default too.
    console.warn(`Translation key "${key}" not found for language "${lang}", and also missing in default "${frontendDefaultLanguage}".`);
    // In this case, 'translation' remains the 'key' itself.
  } else if (lang !== frontendDefaultLanguage && defaultLangTranslations && defaultLangTranslations[key] !== undefined) {
     // If it fell back from requested lang to default, use default silently (no warning needed as it's intended fallback)
     translation = defaultLangTranslations[key];
  }


  // Replace placeholders if provided
  if (placeholders && typeof placeholders === 'object') {
    // Simple regex replace for {key} format
    translation = translation.replace(/{(\w+)}/g, (match, placeholderName) => {
      // If placeholder exists in the provided object, use its value, otherwise keep the placeholder text
      const replacement = placeholders[placeholderName];
       // Handle number 0 explicitly, otherwise check for undefined/null
       if (replacement !== undefined && replacement !== null) {
           return String(replacement);
       }
       // If placeholder not found, keep the original {placeholderName} text
       console.warn(`Placeholder "{${placeholderName}}" not provided for key "${key}" in language "${lang}".`);
       return match;
    });
  }

  return translation;
};