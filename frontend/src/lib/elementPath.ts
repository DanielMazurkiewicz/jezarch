/**
 * Helpers for the element drill-down breadcrumb path.
 *
 * The children view lives at `/signatures/:componentId/elements/:elementId` and
 * keeps the chain of clicked element IDs in the `path` query parameter
 * (comma-separated, ordered from the first click to the current element).
 */

/**
 * Parses the raw `path` query value into a list of element IDs.
 *
 * Rules:
 *  - The last ID in the path must be the element currently being viewed;
 *    otherwise the whole path is discarded and only `[currentElementId]` is used.
 *  - Malformed entries (non-numeric, non-positive) are dropped.
 *
 * @param raw The raw query string (may be null/empty).
 * @param currentElementId The element whose children are currently shown.
 * @returns Ordered list of element IDs, or [] when the current id is invalid.
 */
export function parseElementPath(raw: string | null, currentElementId: number): number[] {
    if (!Number.isInteger(currentElementId) || currentElementId <= 0) return [];

    const ids = (raw ?? '')
        .split(',')
        .map(part => parseInt(part.trim(), 10))
        .filter(id => Number.isInteger(id) && id > 0);

    if (ids.length === 0) return [currentElementId];
    if (ids[ids.length - 1] !== currentElementId) return [currentElementId];
    return ids;
}

/** Builds the `path` query string for a given chain of element IDs. */
export function elementPathQuery(pathIds: number[]): string {
    return `path=${pathIds.join(',')}`;
}
