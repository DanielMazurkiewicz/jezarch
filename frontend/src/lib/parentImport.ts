// Helpers for importing field values from a parent unit in the document editor.

/** Fields of the document form that have an equivalent in the unit editor. */
export type ParentImportField =
    | 'title'
    | 'creator'
    | 'creationDate'
    | 'creationPlace'
    | 'documentLanguage'
    | 'contentDescription'
    | 'remarks'
    | 'seals'
    | 'relatedDocumentsReferences'
    | 'additionalInformation'
    | 'accessLevel'
    | 'accessConditions'
    | 'isDigitized'
    | 'digitizedVersionLink'
    | 'topographicSignature'
    | 'descriptiveSignatureElementIds'
    | 'tagIds';

/** The subset of parent-unit data needed to compute importable values. */
export interface ParentImportSource {
    title: string;
    creator: string;
    creationDate: string;
    creationPlace?: string | null;
    documentLanguage?: string | null;
    contentDescription?: string | null;
    seals?: string | null;
    remarks?: string | null;
    accessLevel?: string | null;
    accessConditions?: string | null;
    additionalInformation?: string | null;
    relatedDocumentsReferences?: string | null;
    topographicSignature?: string | null;
    digitizedVersionLink?: string | null;
    isDigitized?: boolean;
    descriptiveSignatureElementIds?: number[][];
    tags?: Array<{ tagId?: number; name: string }>;
    /** Human-readable descriptive signature paths (populated by the API when available). */
    resolvedDescriptiveSignatures?: string[];
}

/** Returns the parent unit's raw value for an importable field. */
export function getParentImportValue(
    source: ParentImportSource,
    field: ParentImportField
): string | boolean | number[] | number[][] | null {
    switch (field) {
        case 'isDigitized':
            return source.isDigitized === true;
        case 'descriptiveSignatureElementIds':
            return source.descriptiveSignatureElementIds ?? [];
        case 'tagIds':
            return (source.tags ?? [])
                .map(tag => tag.tagId)
                .filter((id): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0);
        default: {
            const value = source[field];
            return value == null ? null : String(value);
        }
    }
}

/**
 * Whether a value counts as "already has a value" for the purpose of
 * asking before replacing it. For isDigitized only `true` counts, since
 * `false` is the empty/default state; arrays count when non-empty;
 * strings count when not null/empty/whitespace-only.
 */
export function hasImportValue(field: ParentImportField, value: unknown): boolean {
    if (field === 'isDigitized') return value === true;
    if (field === 'descriptiveSignatureElementIds' || field === 'tagIds') {
        return Array.isArray(value) && value.length > 0;
    }
    if (value == null) return false;
    return String(value).trim() !== '';
}

/**
 * Display-ready text for the parent unit's value of a field, or null when
 * the parent has no value to import. `formatBoolean` renders isDigitized
 * in the user's language (e.g. "Yes"/"No").
 */
export function getParentImportPreviewText(
    source: ParentImportSource,
    field: ParentImportField,
    formatBoolean: (value: boolean) => string
): string | null {
    // A boolean is always a defined value, so the parent's flag can always be previewed.
    if (field === 'isDigitized') return formatBoolean(source.isDigitized === true);
    const value = getParentImportValue(source, field);
    if (!hasImportValue(field, value)) return null;
    switch (field) {
        case 'descriptiveSignatureElementIds': {
            const paths = value as number[][];
            const resolved = source.resolvedDescriptiveSignatures ?? [];
            if (resolved.length > 0) return resolved.join(', ');
            return paths.map(path => path.join('>')).join(', ');
        }
        case 'tagIds':
            return (source.tags ?? []).map(tag => tag.name).join(', ');
        default:
            return String(value);
    }
}

/** Truncates a preview to the first `limit` characters, appending " ..." when truncated. */
export function truncateImportPreview(text: string, limit = 60): string {
    if (text.length <= limit) return text;
    return `${text.slice(0, limit)} ...`;
}
