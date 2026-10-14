import type { AppTranslationKey } from '@/translations/models';
import type { UiElementId } from '../../../backend/src/functionalities/config/models';

/**
 * Archive page tabs. All tabs share the same filters (search bar + sidebar
 * quick signature filter); each tab only adds its own base query modifier.
 *
 * `elementId` ties the tab to the app-wide visibility registry so an admin can
 * hide it from the settings page.
 */
export const ARCHIVE_TABS = [
  { id: 'units', elementId: 'archive.tab.units', labelKey: 'archiveTabUnits' },
  { id: 'unitsAndMainDocs', elementId: 'archive.tab.unitsAndMainDocs', labelKey: 'archiveTabUnitsAndMainDocs' },
  { id: 'mainDocs', elementId: 'archive.tab.mainDocs', labelKey: 'archiveTabMainDocs' },
  { id: 'everything', elementId: 'archive.tab.everything', labelKey: 'archiveTabEverything' },
] as const satisfies readonly { id: string; elementId: UiElementId; labelKey: AppTranslationKey }[];

export type ArchiveTab = (typeof ARCHIVE_TABS)[number]['id'];

export const isArchiveTab = (value: string | null | undefined): value is ArchiveTab =>
  ARCHIVE_TABS.some(tab => tab.id === value);

const ELEMENT_ID_BY_TAB: Record<ArchiveTab, UiElementId> = Object.fromEntries(
  ARCHIVE_TABS.map(tab => [tab.id, tab.elementId]),
) as Record<ArchiveTab, UiElementId>;

export const getVisibleArchiveTabs = (hidden: ReadonlySet<UiElementId>) =>
  ARCHIVE_TABS.filter(tab => !hidden.has(tab.elementId));

/**
 * Degrade target for the degenerate case where an admin hid every tab: the bar
 * is not rendered, so the page must fall back to a tab whose query modifier
 * leaves the list unfiltered.
 */
const UNFILTERED_ARCHIVE_TAB: ArchiveTab = 'everything';

/**
 * Picks the tab the page should actually run with.
 *
 * The default is the first (leftmost) visible tab, so a plain `/archive` visit
 * always lands on the tab the user sees first in the bar.
 *
 * The requested tab comes from the `?tab=` URL parameter, so it can point at a
 * tab that an admin has since hidden (stale bookmark, hand-written link). In
 * that case we fall back to the first visible tab as well, otherwise the page
 * would silently filter by a tab whose trigger is not rendered.
 */
export function resolveActiveArchiveTab(
  preferred: string | null | undefined,
  hidden: ReadonlySet<UiElementId>,
): ArchiveTab {
  if (isArchiveTab(preferred) && !hidden.has(ELEMENT_ID_BY_TAB[preferred])) {
    return preferred;
  }
  return getVisibleArchiveTabs(hidden)[0]?.id ?? UNFILTERED_ARCHIVE_TAB;
}
