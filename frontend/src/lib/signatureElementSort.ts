import type { SignatureElement } from '../../../backend/src/functionalities/signature/element/models';
import {
    DEFAULT_ELEMENT_SORT_MODE,
    type ElementSortMode,
} from '../../../backend/src/functionalities/config/models';

/** Ascending comparison of the element `index`, with a name fallback. */
const compareByIndex = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name;
    const valB = b.index ?? b.name;
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return valA.localeCompare(valB);
};

/**
 * Builds an element comparator for one of the ordering modes an admin can pick
 * in the admin settings:
 * - index:    the element's own index (numeric, 1/2/10), falling back to name
 * - name:     plain alphabetical ordering
 * - creation: oldest first
 *
 * All signature tree pickers, the archive sidebar menu and the element
 * selectors sort through this so every list agrees on order.
 */
export const compareSignatureElementsBy = (mode: ElementSortMode, reversed: boolean) => {
    return (a: SignatureElement, b: SignatureElement): number => {
        const direction = reversed ? -1 : 1;
        let primary: number;
        switch (mode) {
            case 'name':
                primary = a.name.localeCompare(b.name);
                break;
            case 'creation':
                primary = new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime();
                break;
            default:
                primary = compareByIndex(a, b);
                break;
        }

        // The id tie-break stays ascending even when reversed so equal keys
        // never reorder unpredictably between renders.
        return direction * primary || (a.signatureElementId ?? 0) - (b.signatureElementId ?? 0);
    };
};

/** Canonical element ordering: numeric indices ascending, then names. */
export const compareSignatureElements = compareSignatureElementsBy(DEFAULT_ELEMENT_SORT_MODE, false);
