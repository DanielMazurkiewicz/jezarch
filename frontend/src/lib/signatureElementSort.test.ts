import { describe, it, expect } from 'bun:test';
import { compareSignatureElements, compareSignatureElementsBy } from './signatureElementSort';
import type { SignatureElement } from '../../../backend/src/functionalities/signature/element/models';

const el = (name: string, index?: string | null, createdOn?: Date): SignatureElement => ({
    signatureElementId: undefined,
    signatureComponentId: 1,
    name,
    index: index ?? null,
    createdOn: createdOn ?? new Date(0),
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

    // The default wrapper is what every non-picker list uses, so it must keep
    // behaving exactly like the old hardcoded comparator.
    it('defaults to index mode', () => {
        const byIndex = compareSignatureElementsBy('index', false);
        const items = [el('Zebra', null), el('Two', '2'), el('Apple', null)];
        expect(items.slice().sort(byIndex).map(e => e.name)).toEqual(['Two', 'Apple', 'Zebra']);
    });
});

describe('compareSignatureElementsBy', () => {
    it('name mode sorts alphabetically and ignores the index', () => {
        const items = [el('Zebra', '1'), el('Apple', '9'), el('Mango', '5')];
        items.sort(compareSignatureElementsBy('name', false));
        expect(items.map(e => e.name)).toEqual(['Apple', 'Mango', 'Zebra']);
    });

    it('creation mode sorts oldest first, ignoring index and name', () => {
        const items = [
            el('Zebra', '1', new Date('2024-03-01')),
            el('Apple', '9', new Date('2023-01-01')),
            el('Mango', '5', new Date('2025-06-01')),
        ];
        items.sort(compareSignatureElementsBy('creation', false));
        expect(items.map(e => e.name)).toEqual(['Apple', 'Zebra', 'Mango']);
    });

    it('reversing flips the primary order of every mode', () => {
        const items = [el('Zebra', '1'), el('Apple', '9'), el('Mango', '5')];

        items.sort(compareSignatureElementsBy('name', true));
        expect(items.map(e => e.name)).toEqual(['Zebra', 'Mango', 'Apple']);

        items.sort(compareSignatureElementsBy('index', true));
        expect(items.map(e => e.index)).toEqual(['9', '5', '1']);
    });

    it('reversing creation order puts the newest first', () => {
        const items = [
            el('Old', '1', new Date('2023-01-01')),
            el('New', '2', new Date('2025-01-01')),
            el('Mid', '3', new Date('2024-01-01')),
        ];
        items.sort(compareSignatureElementsBy('creation', true));
        expect(items.map(e => e.name)).toEqual(['New', 'Mid', 'Old']);
    });

    it('breaks ties by id ascending even when reversed, so equal keys never shuffle', () => {
        const withId = (id: number, name: string): SignatureElement => ({
            ...el(name), signatureElementId: id,
        });
        const items = [withId(3, 'Same'), withId(1, 'Same'), withId(2, 'Same')];
        expect(items.slice().sort(compareSignatureElementsBy('name', false)).map(e => e.signatureElementId)).toEqual([1, 2, 3]);
        expect(items.slice().sort(compareSignatureElementsBy('name', true)).map(e => e.signatureElementId)).toEqual([1, 2, 3]);
    });
});
