// Defines the supported languages for the application.
export const supportedLanguages = ['en', 'pl'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];
// --- Define frontend default language ---
export const defaultLanguage: SupportedLanguage = 'en';
// ----------------------------------------

// Import key types from their respective modules
import type { AuthTranslationKey } from './models/auth';
import type { CommonTranslationKey } from './models/common';
import type { AdminTranslationKey } from './models/admin';
import type { SignatureTranslationKey } from './models/signatures';
import type { NotesTranslationKey } from './models/notes';
import type { ArchiveTranslationKey } from './models/archive';
import type { TagsTranslationKey } from './models/tags';

// All possible translation keys will be a union type
export type AppTranslationKey =
  | AuthTranslationKey
  | CommonTranslationKey
  | AdminTranslationKey
  | SignatureTranslationKey
  | NotesTranslationKey
  | ArchiveTranslationKey
  | TagsTranslationKey
  ;

// Defines the structure for a single translation dictionary for a language.
// Keys are string identifiers, values are the translated strings.
// Make Key generic and default to AppTranslationKey
export type TranslationSet<Key extends string = AppTranslationKey> = Record<Key, string>;

// Defines the structure for all loaded translations, mapping language codes
// to their respective TranslationSet.
// Make Keys generic and default to AppTranslationKey
export type AllTranslations<Keys extends string = AppTranslationKey> = {
  [lang in SupportedLanguage]: TranslationSet<Keys>; // Ensure all languages have a defined set
};