import { describe, it, expect } from 'bun:test';
import { compareSignatureElements } from './signatureElementSort';
import type { SignatureElement } from '../../../backend/src/functionalities/signature/element/models';

const el = (name: string, index?: string | null): SignatureElement => ({
    signatureComponentId: 1,
    name,
    index: index ?? null,
    createdOn: new Date(0),
    modifiedOn: new Date(0),
});

describe('compareSignatureElements', () => {
    it('sorts numeric indices ascending', () => {
        const items = [el('C', '3'), el('A', '1'), el('B', '2')];
        items.sort(compareSignatureElements);
        expect(items.map(e => e.index)).toEqual(['1', '2', '3']);
    });

    it('treats multi-digit indices numerically, not lexicographically', () => {
        const items = [el('Ten', '10'), el('Two', '2'), el('One', '1')];
        items.sort(compareSignatureElements);
        expect(items.map(e => e.index)).toEqual(['1', '2', '10']);
    });

    it('falls back to the name when the index is missing or non-numeric', () => {
        const items = [el('Zebra', null), el('Apple', null), el('Mango', 'x')];
        items.sort(compareSignatureElements);
        expect(items.map(e => e.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('orders numeric indices before non-numeric ones', () => {
        const items = [el('Beta', 'b'), el('One', '1')];
        items.sort(compareSignatureElements);
        expect(items.map(e => e.index)).toEqual(['1', 'b']);
    });
});
