// Provides the 't' function for retrieving translations.
// --- UPDATED: Import frontend defaultLanguage ---
import { type SupportedLanguage, type AppTranslationKey, defaultLanguage as frontendDefaultLanguage } from './models'; // Use AppTranslationKey and frontend default
// -----------------------------------------------
import { getAllLoadedTranslations } from './loader';
// --- NEW: Import IntlMessageFormat ---
import { IntlMessageFormat } from 'intl-messageformat';
// ------------------------------------

const allTranslations = getAllLoadedTranslations();
// --- NEW: Cache for IntlMessageFormat instances ---
const messageFormatCache: Record<string, Record<string, IntlMessageFormat>> = {};
// -------------------------------------------------

/**
 * Translates a given key into the specified language, optionally replacing placeholders.
 * Uses IntlMessageFormat for complex formatting like plurals.
 * Falls back to the default language if the key is not found in the target language.
 * Returns the key itself if not found in default language either.
 *
 * Placeholders in the translation string should follow ICU MessageFormat syntax (e.g., {count}, {name}).
 *
 * @param key The translation key (e.g., 'welcomeMessage').
 * @param lang The target language code (defaults to frontendDefaultLanguage).
 * @param placeholders An optional object with key-value pairs for replacement (e.g., { userLogin: 'John', count: 5 }).
 * @returns The translated and interpolated string or the key if not found.
 */
export const t = (
    key: AppTranslationKey, // Use the union type for key suggestions
    lang: SupportedLanguage = frontendDefaultLanguage, // Default to frontend's default
    placeholders?: Record<string, string | number | boolean | Date | null | undefined> // Allow richer placeholder types
): string => {
  const langTranslations = allTranslations[lang] || allTranslations[frontendDefaultLanguage];
  const defaultLangTranslations = allTranslations[frontendDefaultLanguage];

  let rawTranslation = key; // Default to the key itself

  // Determine the final raw translation string
  if (langTranslations && langTranslations[key] !== undefined) {
    rawTranslation = langTranslations[key];
  } else if (defaultLangTranslations && defaultLangTranslations[key] !== undefined) {
    rawTranslation = defaultLangTranslations[key];
    if (lang !== frontendDefaultLanguage) {
      console.warn(`Translation key "${key}" not found for language "${lang}". Using default "${frontendDefaultLanguage}".`);
    }
  } else {
    console.error(`Translation key "${key}" not found for language "${lang}" or default "${frontendDefaultLanguage}".`);
    // 'rawTranslation' remains the 'key' itself.
  }

  // Interpolate using intl-messageformat IF placeholders are provided
  if (placeholders && typeof placeholders === 'object' && Object.keys(placeholders).length > 0) {
    try {
      // --- Cache IntlMessageFormat instances for performance ---
      if (!messageFormatCache[lang]) {
        messageFormatCache[lang] = {};
      }
      if (!messageFormatCache[lang][key]) {
        // Ensure the raw string is valid before creating instance
        if (typeof rawTranslation !== 'string') {
           console.error(`Invalid translation value for key "${key}" in language "${lang}": Expected string, got ${typeof rawTranslation}`);
           return key; // Return key if translation is not a string
        }
        messageFormatCache[lang][key] = new IntlMessageFormat(rawTranslation, lang);
      }
      // --------------------------------------------------------

      const msgFormatter = messageFormatCache[lang][key];
      // Explicitly cast placeholders to the expected type for format()
      const formatPlaceholders: Record<string, string | number | boolean | Date | null | undefined> = placeholders;
      // @ts-ignore - IntlMessageFormat might have stricter type expectations than Record<string, PrimitiveType> in some definitions, but this generally works.
      return msgFormatter.format(formatPlaceholders) as string;

    } catch (error) {
      console.error(`Error formatting ICU translation key "${key}" for language "${lang}" with placeholders:`, error, `Raw String: "${rawTranslation}"`);
      // Fallback to simple key replacement on error
      return rawTranslation.replace(/{(\w+)}/g, (match, placeholderName) => {
        const replacement = placeholders[placeholderName];
        if (replacement !== undefined && replacement !== null) {
          return String(replacement);
        }
        return match; // Keep original placeholder if value not found
      });
    }
  }

  // If no placeholders, return the raw translated string (or key)
  return rawTranslation;
};