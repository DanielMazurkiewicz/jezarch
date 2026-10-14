import { describe, test, expect } from 'bun:test';
import {
  UI_ELEMENT_IDS,
  parseHiddenUiElements,
  type UiElementId,
} from '../../../backend/src/functionalities/config/models';
import { REGISTERED_UI_ELEMENT_IDS, parseHiddenList, toggleHiddenElement } from './uiVisibility';

describe('uiVisibility — registry stays in sync with the backend', () => {
  test('every backend element id has a settings entry', () => {
    expect([...REGISTERED_UI_ELEMENT_IDS].sort()).toEqual([...UI_ELEMENT_IDS].sort());
  });

  test('the registry contains no duplicates', () => {
    expect(new Set(REGISTERED_UI_ELEMENT_IDS).size).toBe(REGISTERED_UI_ELEMENT_IDS.length);
  });
});

describe('uiVisibility — toggleHiddenElement', () => {
  const a: UiElementId = 'signatures.newComponentButton';
  const b: UiElementId = 'signatures.newTreeButton';

  test('adds an id that is not hidden yet', () => {
    expect(toggleHiddenElement([], a)).toEqual([a]);
  });

  test('removes an id that is already hidden', () => {
    expect(toggleHiddenElement([a, b], a)).toEqual([b]);
  });

  test('leaves the input array untouched', () => {
    const input: UiElementId[] = [a];
    toggleHiddenElement(input, b);
    expect(input).toEqual([a]);
  });
});

describe('uiVisibility — parseHiddenList (defensive, fail open)', () => {
  test('accepts a valid list', () => {
    expect(parseHiddenList(['archive.tab.mainDocs'])).toEqual(['archive.tab.mainDocs']);
  });

  test('drops ids the backend no longer knows', () => {
    expect(parseHiddenList(['archive.tab.retired', 'signatures.newTreeButton'])).toEqual([
      'signatures.newTreeButton',
    ]);
  });

  test('non-array values hide nothing', () => {
    expect(parseHiddenList(null)).toEqual([]);
    expect(parseHiddenList('[]')).toEqual([]);
    expect(parseHiddenList([1, null, {}])).toEqual([]);
  });
});

describe('config model — parseHiddenUiElements', () => {
  test('empty input means nothing hidden', () => {
    expect(parseHiddenUiElements(null)).toEqual({ ids: [] });
    expect(parseHiddenUiElements(undefined)).toEqual({ ids: [] });
    expect(parseHiddenUiElements('')).toEqual({ ids: [] });
    expect(parseHiddenUiElements('[]')).toEqual({ ids: [] });
  });

  test('keeps a valid list in order', () => {
    const result = parseHiddenUiElements('["signatures.newTreeButton","archive.tab.units"]');
    expect(result).toEqual({ ids: ['signatures.newTreeButton', 'archive.tab.units'] });
  });

  test('deduplicates', () => {
    const result = parseHiddenUiElements('["signatures.newTreeButton","signatures.newTreeButton"]');
    expect(result).toEqual({ ids: ['signatures.newTreeButton'] });
  });

  test('rejects malformed JSON', () => {
    expect('error' in parseHiddenUiElements('not json')).toBe(true);
  });

  test('rejects a non-array JSON value', () => {
    expect('error' in parseHiddenUiElements('{"a":1}')).toBe(true);
    expect('error' in parseHiddenUiElements('"x"')).toBe(true);
    expect('error' in parseHiddenUiElements('42')).toBe(true);
  });

  test('rejects unknown element ids', () => {
    expect('error' in parseHiddenUiElements('["signatures.nope"]')).toBe(true);
  });
});
