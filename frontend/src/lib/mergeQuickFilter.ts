import type { SearchQuery, SearchQueryElement } from '../../../backend/src/utils/search';

// Staff default: hide soft-deleted documents unless the search bar carries an
// explicit isDeleted criterion of its own.
export const DEFAULT_DELETED_FILTER: SearchQuery = [
    { field: 'isDeleted', condition: 'EQ', value: false, not: false },
];

/**
 * Combines the sidebar quick signature filter with the search bar query.
 *
 * - An active sidebar filter takes precedence and replaces any
 *   descriptiveSignature criterion the search bar carries.
 * - When no sidebar filter is active, the search bar's own
 *   descriptiveSignature criterion(s) pass through untouched — they must not
 *   be silently dropped from the request.
 * - For staff roles the default isDeleted=false filter is preserved unless
 *   the query already carries an explicit isDeleted criterion.
 */
export function mergeQuickFilter(
    quickFilter: SearchQueryElement | null,
    searchBarQuery: SearchQuery,
    staffRole: boolean,
): SearchQuery {
    const base = searchBarQuery.filter(q => q.field !== 'descriptiveSignature');

    const hasExplicitDeletedFilter = base.some(q => q.field === 'isDeleted');
    if (staffRole && !hasExplicitDeletedFilter) {
        base.push(...DEFAULT_DELETED_FILTER);
    }

    if (quickFilter) {
        return [...base, quickFilter];
    }

    const barSignatures = searchBarQuery.filter(q => q.field === 'descriptiveSignature');
    return [...base, ...barSignatures];
}
