export interface Config {
  key: string;
  value: string;
}

// Define specific configuration types for better type safety
// Renamed PORT, added HTTPS related keys
export enum AppConfigKeys {
  DEFAULT_LANGUAGE = 'default_language',
  HTTP_PORT = 'http_port', // Renamed from PORT
  HTTPS_PORT = 'https_port', // New
  HTTPS_KEY_PATH = 'https_key_path', // Renamed from SSL_KEY, stores path now
  HTTPS_CERT_PATH = 'https_cert_path', // Renamed from SSL_CERT, stores path now
  HTTPS_CA_PATH = 'https_ca_path', // New for Certificate Authority path
  // JSON array of UiElementId values whose UI controls stay hidden app-wide.
  HIDDEN_UI_ELEMENTS = 'hidden_ui_elements',
}

// --- Hideable UI elements ---
// Cosmetic feature flags only: hiding an element never disables the underlying
// API capability. Ids are stable strings because they are persisted in the
// config table, so renaming one silently un-hides the element.
export const UI_ELEMENT_IDS = [
  'signatures.newComponentButton',
  'signatures.newTreeButton',
  'archive.tab.units',
  'archive.tab.unitsAndMainDocs',
  'archive.tab.mainDocs',
  'archive.tab.everything',
] as const;

export type UiElementId = typeof UI_ELEMENT_IDS[number];

export const DEFAULT_HIDDEN_UI_ELEMENTS: readonly UiElementId[] = [];

const UI_ELEMENT_ID_SET: ReadonlySet<string> = new Set(UI_ELEMENT_IDS);

export const isUiElementId = (value: unknown): value is UiElementId =>
  typeof value === 'string' && UI_ELEMENT_ID_SET.has(value);

/**
 * Parses the raw config value of HIDDEN_UI_ELEMENTS. Used both at startup and
 * by the write endpoint, so there is a single definition of what is valid.
 * Returns the deduplicated id list, or an error message for the API to surface.
 */
export function parseHiddenUiElements(raw: string | null | undefined): { ids: UiElementId[] } | { error: string } {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return { ids: [...DEFAULT_HIDDEN_UI_ELEMENTS] };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { error: 'Hidden UI elements must be a JSON array of element ids.' };
  }

  if (!Array.isArray(parsed)) {
    return { error: 'Hidden UI elements must be a JSON array of element ids.' };
  }

  const ids: UiElementId[] = [];
  for (const entry of parsed) {
    if (!isUiElementId(entry)) {
      return { error: `Unknown hideable UI element: '${String(entry)}'.` };
    }
    if (!ids.includes(entry)) ids.push(entry);
  }
  return { ids };
}