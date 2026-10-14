import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';
import {
    DEFAULT_COMPONENT_SORT_MODE,
    type ComponentSortMode,
} from '../../../backend/src/functionalities/config/models';

/**
 * Builds a component comparator for one of the ordering modes an admin can
 * pick in the admin settings. All signature tree pickers and the archive
 * sidebar menu sort through this so every list agrees on order.
 *
 * Main components are always pinned first, in every mode and in both
 * directions: they are the primary signature, and burying them mid-list would
 * make the main hierarchy harder to reach. The chosen mode (and the reversal
 * modifier) only orders *within* the main and non-main groups.
 */
export const compareSignatureComponentsBy = (mode: ComponentSortMode, reversed: boolean) => {
    return (a: SignatureComponent, b: SignatureComponent): number => {
        const mainDelta = Number(b.is_main) - Number(a.is_main);
        if (mainDelta !== 0) return mainDelta;

        const direction = reversed ? -1 : 1;
        let primary: number;
        if (mode === 'creation') {
            // Oldest first. Ties are broken by id below.
            primary = new Date(a.createdOn).getTime() - new Date(b.createdOn).getTime();
        } else {
            primary = a.name.localeCompare(b.name);
        }

        // The id tie-break stays ascending even when reversed so equal keys
        // never reorder unpredictably between renders.
        return direction * primary || (a.signatureComponentId ?? 0) - (b.signatureComponentId ?? 0);
    };
};

/** Canonical component ordering: main components first, then alphabetical by name. */
export const compareSignatureComponents = compareSignatureComponentsBy(DEFAULT_COMPONENT_SORT_MODE, false);
