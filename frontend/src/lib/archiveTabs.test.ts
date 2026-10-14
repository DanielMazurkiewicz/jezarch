import { describe, test, expect } from 'bun:test';
import type { UiElementId } from '../../../backend/src/functionalities/config/models';
import {
  ARCHIVE_TABS,
  getVisibleArchiveTabs,
  resolveActiveArchiveTab,
} from './archiveTabs';

const hidden = (...ids: UiElementId[]) => new Set<UiElementId>(ids);

const noHidden = hidden();

describe('archiveTabs — getVisibleArchiveTabs', () => {
  test('returns every tab when nothing is hidden', () => {
    expect(getVisibleArchiveTabs(noHidden)).toHaveLength(ARCHIVE_TABS.length);
  });

  test('filters out hidden tabs and keeps registry order', () => {
    const visible = getVisibleArchiveTabs(hidden('archive.tab.unitsAndMainDocs', 'archive.tab.everything'));
    expect(visible.map(tab => tab.id)).toEqual(['units', 'mainDocs']);
  });
});

describe('archiveTabs — resolveActiveArchiveTab', () => {
  /** The leftmost tab rendered in the bar. */
  const firstTabId = ARCHIVE_TABS[0].id;

  test('keeps a visible requested tab', () => {
    expect(resolveActiveArchiveTab('mainDocs', noHidden)).toBe('mainDocs');
  });

  test('lands on the first (leftmost) tab when no tab is requested', () => {
    expect(resolveActiveArchiveTab(null, noHidden)).toBe(firstTabId);
    expect(resolveActiveArchiveTab(undefined, noHidden)).toBe(firstTabId);
  });

  test('lands on the first tab on an unknown tab value', () => {
    expect(resolveActiveArchiveTab('nonsense', noHidden)).toBe(firstTabId);
  });

  test('lands on the first visible tab when the first tab is hidden', () => {
    expect(resolveActiveArchiveTab(null, hidden('archive.tab.units'))).toBe('unitsAndMainDocs');
  });

  test('falls back to the first visible tab when the requested one is hidden', () => {
    // A stale bookmark like /archive?tab=units after an admin hid "Units".
    expect(resolveActiveArchiveTab('units', hidden('archive.tab.units'))).toBe('unitsAndMainDocs');
  });

  test('skips several consecutive hidden tabs', () => {
    const result = resolveActiveArchiveTab(
      'units',
      hidden('archive.tab.units', 'archive.tab.unitsAndMainDocs', 'archive.tab.mainDocs'),
    );
    expect(result).toBe('everything');
  });

  test('degrades to the unfiltered tab when every tab is hidden', () => {
    const allHidden = hidden(
      'archive.tab.units',
      'archive.tab.unitsAndMainDocs',
      'archive.tab.mainDocs',
      'archive.tab.everything',
    );
    expect(getVisibleArchiveTabs(allHidden)).toHaveLength(0);
    expect(resolveActiveArchiveTab('mainDocs', allHidden)).toBe('everything');
  });

  test('an unknown value still respects hiding of the first tabs', () => {
    const result = resolveActiveArchiveTab(
      'nonsense',
      hidden('archive.tab.everything', 'archive.tab.units', 'archive.tab.unitsAndMainDocs'),
    );
    expect(result).toBe('mainDocs');
  });

  test('hiding the first tabs redirects a plain /archive visit', () => {
    const result = resolveActiveArchiveTab(null, hidden('archive.tab.units', 'archive.tab.everything'));
    expect(result).toBe('unitsAndMainDocs');
  });
});
