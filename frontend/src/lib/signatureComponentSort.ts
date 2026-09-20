import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';

/**
 * Canonical component ordering: main components first, then alphabetical by
 * name. Used by the /signatures list and every signature picker so all lists
 * agree on order.
 */
export const compareSignatureComponents = (a: SignatureComponent, b: SignatureComponent): number => {
    return Number(b.is_main) - Number(a.is_main) || a.name.localeCompare(b.name);
};
