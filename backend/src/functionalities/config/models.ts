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
  // Ordering applied to signature components (tree roots) in the pickers.
  COMPONENT_SORT_MODE = 'signature_component_sort_mode',
  COMPONENT_SORT_REVERSED = 'signature_component_sort_reversed',
  // Ordering applied to signature elements at every level of those trees.
  ELEMENT_SORT_MODE = 'signature_element_sort_mode',
  ELEMENT_SORT_REVERSED = 'signature_element_sort_reversed',
}

// --- Signature tree sorting ---
// Presentation-only preference: it decides in which order the signature tree
// pickers (and the archive sidebar menu) render their nodes. The values are
// stable strings because they are persisted in the config table.
export const COMPONENT_SORT_MODES = ['name', 'creation'] as const;
export type ComponentSortMode = typeof COMPONENT_SORT_MODES[number];

// 'index' is the archival default (the element's own index, 1/2/10);
// 'name' is plain alphabetical ordering; 'creation' is oldest first.
export const ELEMENT_SORT_MODES = ['index', 'name', 'creation'] as const;
export type ElementSortMode = typeof ELEMENT_SORT_MODES[number];

// Defaults reproduce the ordering the app had before this setting existed.
export const DEFAULT_COMPONENT_SORT_MODE: ComponentSortMode = 'name';
export const DEFAULT_ELEMENT_SORT_MODE: ElementSortMode = 'index';

const COMPONENT_SORT_MODE_SET: ReadonlySet<string> = new Set(COMPONENT_SORT_MODES);
const ELEMENT_SORT_MODE_SET: ReadonlySet<string> = new Set(ELEMENT_SORT_MODES);

export const isComponentSortMode = (value: unknown): value is ComponentSortMode =>
  typeof value === 'string' && COMPONENT_SORT_MODE_SET.has(value);

export const isElementSortMode = (value: unknown): value is ElementSortMode =>
  typeof value === 'string' && ELEMENT_SORT_MODE_SET.has(value);

/**
 * Parses one of the two sort-mode config values. Used both at startup and by
 * the write endpoint, so there is a single definition of what is valid.
 * Returns the mode, or an error message for the API to surface.
 */
export function parseComponentSortMode(raw: string | null | undefined): { mode: ComponentSortMode } | { error: string } {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return { mode: DEFAULT_COMPONENT_SORT_MODE };
  }
  const value = raw.trim();
  if (!isComponentSortMode(value)) {
    return { error: `Invalid signature component sort mode: '${value}'. Must be one of: ${COMPONENT_SORT_MODES.join(', ')}.` };
  }
  return { mode: value };
}

export function parseElementSortMode(raw: string | null | undefined): { mode: ElementSortMode } | { error: string } {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return { mode: DEFAULT_ELEMENT_SORT_MODE };
  }
  const value = raw.trim();
  if (!isElementSortMode(value)) {
    return { error: `Invalid signature element sort mode: '${value}'. Must be one of: ${ELEMENT_SORT_MODES.join(', ')}.` };
  }
  return { mode: value };
}

/**
 * Parses the two "reversed" flags. Accepts the case-insensitive strings the
 * settings form sends over the wire; anything else is an error rather than a
 * silent `false`, so a typo cannot quietly discard an admin's choice.
 */
export function parseSortReversed(raw: string | null | undefined): { reversed: boolean } | { error: string } {
  if (raw === null || raw === undefined || raw.trim() === '') {
    return { reversed: false };
  }
  const value = raw.trim().toLowerCase();
  if (value === 'true') return { reversed: true };
  if (value === 'false') return { reversed: false };
  return { error: `Invalid sort reversed flag: '${raw}'. Must be 'true' or 'false'.` };
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