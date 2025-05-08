// Responsible for loading and providing access to translation sets.
// --- UPDATED: Import frontend defaultLanguage ---
import type { AllTranslations, SupportedLanguage, TranslationSet, AppTranslationKey } from './models';
import { defaultLanguage as frontendDefaultLanguage } from './models'; // Use default from models
// -------------------------------------------------
import { authTranslationsEN } from './data/en/auth';
import { authTranslationsPL } from './data/pl/auth';
import { commonTranslationsEN } from './data/en/common';
import { commonTranslationsPL } from './data/pl/common';
import { adminTranslationsEN } from './data/en/admin';
import { adminTranslationsPL } from './data/pl/admin';
import { signatureTranslationsEN } from './data/en/signatures';
import { signatureTranslationsPL } from './data/pl/signatures';
import { notesTranslationsEN } from './data/en/notes';
import { notesTranslationsPL } from './data/pl/notes';
import { archiveTranslationsEN } from './data/en/archive';
import { archiveTranslationsPL } from './data/pl/archive';
// --- NEW: Import tags translations ---
import { tagsTranslationsEN } from './data/en/tags';
import { tagsTranslationsPL } from './data/pl/tags';
// ------------------------------------
// Import module-specific key types if needed for type safety (though AppTranslationKey covers all)

// Combine all translations into a single structure
const loadedTranslations: AllTranslations = {
  en: {
    ...commonTranslationsEN,
    ...authTranslationsEN,
    ...adminTranslationsEN,
    ...signatureTranslationsEN,
    ...notesTranslationsEN,
    ...archiveTranslationsEN,
    ...tagsTranslationsEN, // Add tags translations
    // ... other EN modules
  },
  pl: {
    ...commonTranslationsPL,
    ...authTranslationsPL,
    ...adminTranslationsPL,
    ...signatureTranslationsPL,
    ...notesTranslationsPL,
    ...archiveTranslationsPL,
    ...tagsTranslationsPL, // Add tags translations
    // ... other PL modules
  },
};

/**
 * Retrieves the complete translation set for a given language.
 * Falls back to the frontend default language if the requested language is not found.
 *
 * @param lang The desired language code.
 * @returns The TranslationSet for the language.
 */
export const getTranslationsForLanguage = (lang: SupportedLanguage): TranslationSet<AppTranslationKey> => {
  // --- UPDATED: Fallback to frontend default language ---
  return loadedTranslations[lang] || loadedTranslations[frontendDefaultLanguage];
  // ---------------------------------------------------
};

/**
 * Provides access to all loaded translations.
 * Primarily for use by the translation utility function.
 */
export const getAllLoadedTranslations = (): AllTranslations<AppTranslationKey> => {
  return loadedTranslations;
};