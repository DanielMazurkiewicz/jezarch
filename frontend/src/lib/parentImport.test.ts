import { describe, it, expect } from 'bun:test';
import {
    getParentImportValue,
    hasImportValue,
    getParentImportPreviewText,
    truncateImportPreview,
    type ParentImportSource,
} from './parentImport';

const baseSource: ParentImportSource = {
    title: 'T',
    creator: 'C',
    creationDate: '2023-01-01',
};

const formatBool = (b: boolean) => (b ? 'Yes' : 'No');

describe('truncateImportPreview', () => {
    it('returns short text unchanged', () => {
        expect(truncateImportPreview('')).toBe('');
        expect(truncateImportPreview('abc')).toBe('abc');
    });

    it('keeps exactly 60 characters without ellipsis', () => {
        const text = 'a'.repeat(60);
        expect(truncateImportPreview(text)).toBe(text);
    });

    it('truncates longer text to the first 60 chars and appends " ..."', () => {
        expect(truncateImportPreview('a'.repeat(61))).toBe(`${'a'.repeat(60)} ...`);
        expect(truncateImportPreview('x'.repeat(200), 5)).toBe(`${'x'.repeat(5)} ...`);
    });
});

describe('hasImportValue', () => {
    it('treats null, empty and whitespace-only strings as no value', () => {
        expect(hasImportValue('title', null)).toBe(false);
        expect(hasImportValue('title', undefined)).toBe(false);
        expect(hasImportValue('title', '')).toBe(false);
        expect(hasImportValue('title', '   ')).toBe(false);
        expect(hasImportValue('title', 'x')).toBe(true);
    });

    it('treats only true as a value for isDigitized (false is the empty state)', () => {
        expect(hasImportValue('isDigitized', true)).toBe(true);
        expect(hasImportValue('isDigitized', false)).toBe(false);
        expect(hasImportValue('isDigitized', undefined)).toBe(false);
    });

    it('treats non-empty arrays as values', () => {
        expect(hasImportValue('tagIds', [])).toBe(false);
        expect(hasImportValue('tagIds', [1, 2])).toBe(true);
        expect(hasImportValue('descriptiveSignatureElementIds', [])).toBe(false);
        expect(hasImportValue('descriptiveSignatureElementIds', [[1]])).toBe(true);
    });
});

describe('getParentImportValue', () => {
    it('returns null for missing string fields and the value otherwise', () => {
        expect(getParentImportValue(baseSource, 'creationPlace')).toBeNull();
        expect(getParentImportValue({ ...baseSource, creationPlace: 'Warsaw' }, 'creationPlace')).toBe('Warsaw');
        expect(getParentImportValue(baseSource, 'title')).toBe('T');
    });

    it('normalizes isDigitized to a boolean', () => {
        expect(getParentImportValue({ ...baseSource, isDigitized: undefined }, 'isDigitized')).toBe(false);
        expect(getParentImportValue({ ...baseSource, isDigitized: true }, 'isDigitized')).toBe(true);
    });

    it('defaults descriptive signatures to an empty array', () => {
        expect(getParentImportValue(baseSource, 'descriptiveSignatureElementIds')).toEqual([]);
        expect(getParentImportValue({ ...baseSource, descriptiveSignatureElementIds: [[1, 2]] }, 'descriptiveSignatureElementIds')).toEqual([[1, 2]]);
    });

    it('extracts tag ids, skipping invalid ones', () => {
        const source = { ...baseSource, tags: [{ tagId: 1, name: 'a' }, { name: 'b' }, { tagId: 2, name: 'c' }] };
        expect(getParentImportValue(source, 'tagIds')).toEqual([1, 2]);
        expect(getParentImportValue(baseSource, 'tagIds')).toEqual([]);
    });
});

describe('getParentImportPreviewText', () => {
    it('returns null when the parent has no value to import', () => {
        expect(getParentImportPreviewText(baseSource, 'seals', formatBool)).toBeNull();
        expect(getParentImportPreviewText(baseSource, 'tagIds', formatBool)).toBeNull();
        expect(getParentImportPreviewText(baseSource, 'descriptiveSignatureElementIds', formatBool)).toBeNull();
    });

    it('formats isDigitized via the provided formatter', () => {
        expect(getParentImportPreviewText({ ...baseSource, isDigitized: true }, 'isDigitized', formatBool)).toBe('Yes');
        expect(getParentImportPreviewText({ ...baseSource, isDigitized: false }, 'isDigitized', formatBool)).toBe('No');
    });

    it('prefers resolved descriptive signatures over raw id paths', () => {
        const source = { ...baseSource, descriptiveSignatureElementIds: [[1, 2], [3]], resolvedDescriptiveSignatures: ['A/B', 'C'] };
        expect(getParentImportPreviewText(source, 'descriptiveSignatureElementIds', formatBool)).toBe('A/B, C');
    });

    it('falls back to raw id paths when no resolved names exist', () => {
        const source = { ...baseSource, descriptiveSignatureElementIds: [[1, 2], [3]] };
        expect(getParentImportPreviewText(source, 'descriptiveSignatureElementIds', formatBool)).toBe('1>2, 3');
    });

    it('joins tag names for the preview', () => {
        const source = { ...baseSource, tags: [{ tagId: 1, name: 'Alpha' }, { tagId: 2, name: 'Beta' }] };
        expect(getParentImportPreviewText(source, 'tagIds', formatBool)).toBe('Alpha, Beta');
    });

    it('returns the raw string for scalar fields', () => {
        expect(getParentImportPreviewText({ ...baseSource, remarks: 'note' }, 'remarks', formatBool)).toBe('note');
    });
});
