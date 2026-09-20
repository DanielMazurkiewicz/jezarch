import { describe, test, expect } from 'bun:test';
import { mergeQuickFilter, DEFAULT_DELETED_FILTER } from './mergeQuickFilter';
import type { SearchQuery, SearchQueryElement } from '../../../backend/src/utils/search';

// EQ with an array value is what the signature pickers send; it is not part of
// the typed union yet, so cast like the UI components do.
const sig = (value: number[], condition: 'EQ' | 'STARTS_WITH' | 'CONTAINS_SEQUENCE' = 'EQ'): SearchQueryElement =>
    ({ field: 'descriptiveSignature', condition, value, not: false }) as unknown as SearchQueryElement;

const titleFragment: SearchQueryElement = { field: 'title', condition: 'FRAGMENT', value: 'akt', not: false };
const explicitDeletedTrue: SearchQueryElement = { field: 'isDeleted', condition: 'EQ', value: true, not: false };

const fieldsOf = (query: SearchQuery) => query.map(q => q.field);

describe('mergeQuickFilter — search bar signature criterion (regression)', () => {
    test('search bar descriptiveSignature criterion is kept when no sidebar filter is active (staff)', () => {
        const result = mergeQuickFilter(null, [sig([1, 2])], true);
        expect(fieldsOf(result)).toContain('descriptiveSignature');
        expect(result.find(q => q.field === 'descriptiveSignature')).toEqual(sig([1, 2]));
    });

    test('search bar descriptiveSignature criterion is kept when no sidebar filter is active (user role)', () => {
        const result = mergeQuickFilter(null, [sig([3], 'STARTS_WITH')], false);
        expect(result).toEqual([sig([3], 'STARTS_WITH')]);
    });

    test('signature criterion survives alongside other search bar criteria', () => {
        const result = mergeQuickFilter(null, [titleFragment, sig([1, 2])], true);
        expect(fieldsOf(result)).toEqual(['title', 'isDeleted', 'descriptiveSignature']);
    });
});

describe('mergeQuickFilter — sidebar quick filter precedence', () => {
    test('active sidebar filter replaces the search bar signature criterion', () => {
        const quick = sig([5], 'CONTAINS_SEQUENCE');
        const result = mergeQuickFilter(quick, [sig([1, 2])], true);
        // Exactly one descriptiveSignature element — the sidebar one.
        const sigs = result.filter(q => q.field === 'descriptiveSignature');
        expect(sigs).toHaveLength(1);
        expect(sigs[0]).toEqual(quick);
    });

    test('sidebar filter is appended even when the search bar has no signature criterion', () => {
        const quick = sig([5], 'STARTS_WITH');
        const result = mergeQuickFilter(quick, [titleFragment], true);
        expect(fieldsOf(result)).toEqual(['title', 'isDeleted', 'descriptiveSignature']);
    });
});

describe('mergeQuickFilter — staff isDeleted default', () => {
    test('staff role gets the default isDeleted=false filter when none is present', () => {
        const result = mergeQuickFilter(null, [titleFragment], true);
        expect(result).toContainEqual(DEFAULT_DELETED_FILTER[0]);
    });

    test('explicit isDeleted criterion is not duplicated for staff', () => {
        const result = mergeQuickFilter(null, [explicitDeletedTrue], true);
        const deletedCriteria = result.filter(q => q.field === 'isDeleted');
        expect(deletedCriteria).toHaveLength(1);
        expect(deletedCriteria[0]).toEqual(explicitDeletedTrue);
    });

    test('user role never receives the default isDeleted filter', () => {
        const result = mergeQuickFilter(null, [titleFragment], false);
        expect(fieldsOf(result)).not.toContain('isDeleted');
    });
});

describe('mergeQuickFilter — empty inputs', () => {
    test('staff with no filters at all gets only the default isDeleted filter', () => {
        expect(mergeQuickFilter(null, [], true)).toEqual(DEFAULT_DELETED_FILTER);
    });

    test('user with no filters at all gets an empty query', () => {
        expect(mergeQuickFilter(null, [], false)).toEqual([]);
    });
});
