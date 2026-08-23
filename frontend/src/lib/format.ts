// Locale-aware formatting driven by the user's preferred app language,
// so dates and numbers follow the in-app language switch instead of the
// browser locale.

import type { SupportedLanguage } from '../../../backend/src/functionalities/user/models';

const LOCALE_MAP: Record<SupportedLanguage, string> = {
  en: 'en-GB',
  pl: 'pl-PL',
};

export function formatDateTime(value: string | Date, language: SupportedLanguage): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleString(LOCALE_MAP[language] ?? 'en-GB');
}

export function formatDate(value: string | Date, language: SupportedLanguage): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(LOCALE_MAP[language] ?? 'en-GB');
}

export function formatNumber(value: number, language: SupportedLanguage): string {
  return value.toLocaleString(LOCALE_MAP[language] ?? 'en-GB');
}
