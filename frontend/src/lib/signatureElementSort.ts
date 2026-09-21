import type { SignatureElement } from '../../../backend/src/functionalities/signature/element/models';

/**
 * Canonical ordering for signature elements within a component: numeric
 * indices first (ascending), then non-numeric / missing indices compared as
 * strings. Used by the element lists and the tree picker so every view agrees
 * on order.
 */
export const compareSignatureElements = (a: SignatureElement, b: SignatureElement): number => {
    const valA = a.index ?? a.name;
    const valB = b.index ?? b.name;
    const numA = Number(valA);
    const numB = Number(valB);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return valA.localeCompare(valB);
};
