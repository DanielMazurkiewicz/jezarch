import { describe, test, expect } from 'bun:test';
import type { UiElementId } from '../../../backend/src/functionalities/config/models';
import {
  ARCHIVE_TABS,
  DEFAULT_ARCHIVE_TAB,
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
  test('keeps a visible requested tab', () => {
    expect(resolveActiveArchiveTab('mainDocs', noHidden)).toBe('mainDocs');
  });

  test('defaults when no tab is requested', () => {
    expect(resolveActiveArchiveTab(null, noHidden)).toBe(DEFAULT_ARCHIVE_TAB);
  });

  test('defaults on an unknown tab value', () => {
    expect(resolveActiveArchiveTab('nonsense', noHidden)).toBe(DEFAULT_ARCHIVE_TAB);
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
    expect(result).toBe(DEFAULT_ARCHIVE_TAB);
  });

  test('degrades to the default tab when every tab is hidden', () => {
    const allHidden = hidden(
      'archive.tab.units',
      'archive.tab.unitsAndMainDocs',
      'archive.tab.mainDocs',
      'archive.tab.everything',
    );
    expect(getVisibleArchiveTabs(allHidden)).toHaveLength(0);
    expect(resolveActiveArchiveTab('mainDocs', allHidden)).toBe(DEFAULT_ARCHIVE_TAB);
  });

  test('an unknown value still respects hiding of the default tab', () => {
    const result = resolveActiveArchiveTab(
      'nonsense',
      hidden('archive.tab.everything', 'archive.tab.units', 'archive.tab.unitsAndMainDocs'),
    );
    expect(result).toBe('mainDocs');
  });

  test('hiding the default tab redirects a plain /archive visit', () => {
    const result = resolveActiveArchiveTab(null, hidden('archive.tab.units', 'archive.tab.everything'));
    expect(result).toBe('unitsAndMainDocs');
  });
});
