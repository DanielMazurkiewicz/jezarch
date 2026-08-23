// Shared normalizers that convert raw SQLite search rows into shapes matching
// the TS models consumed by the frontend (booleans instead of 0/1, parsed JSON).

/**
 * Normalizes an archive document search row IN PLACE.
 * - isDeleted / isDigitized: 0|1 -> boolean
 * - descriptiveSignatureElementIds: JSON string -> validated number[][]
 */
export function normalizeDocumentSearchRow(doc: Record<string, any>): Record<string, any> {
    doc.isDeleted = Boolean(doc.isDeleted);
    doc.isDigitized = Boolean(doc.isDigitized);

    const rawSigs: unknown = doc.descriptiveSignatureElementIds;
    if (typeof rawSigs === 'string') {
        let parsedSigs: number[][] | null = null;
        try {
            const candidate: unknown = JSON.parse(rawSigs || '[]');
            if (
                Array.isArray(candidate) &&
                candidate.every((p: unknown) => Array.isArray(p) && p.every((id: unknown) => typeof id === 'number' && Number.isInteger(id) && id > 0))
            ) {
                parsedSigs = candidate as number[][];
            }
        } catch {
            parsedSigs = null;
        }
        if (parsedSigs === null) {
            // Invalid data in the column — surface it but do not fail the search.
            console.warn(`Invalid descriptiveSignatureElementIds JSON for doc ${doc.archiveDocumentId}`);
            parsedSigs = [];
        }
        doc.descriptiveSignatureElementIds = parsedSigs;
    }
    return doc;
}

/**
 * Normalizes a note search row IN PLACE (shared flag as real boolean).
 */
export function normalizeNoteSearchRow(note: Record<string, any>): Record<string, any> {
    note.shared = Boolean(note.shared);
    return note;
}
