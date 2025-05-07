// Defines the supported languages for the application.
export const supportedLanguages = ['en', 'pl'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];
export const defaultLanguage: SupportedLanguage = 'en';

// Defines the structure for a single translation dictionary for a language.
// Keys are string identifiers, values are the translated strings.
export type TranslationSet<Key extends string = string> = Record<Key, string>;

// Defines the structure for all loaded translations, mapping language codes
// to their respective TranslationSet.
export type AllTranslations<Keys extends string = string> = {
  [lang in SupportedLanguage]?: TranslationSet<Keys>;
};

