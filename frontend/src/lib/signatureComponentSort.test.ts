import { describe, it, expect } from 'bun:test';
import { compareSignatureComponents, compareSignatureComponentsBy } from './signatureComponentSort';
import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';

const comp = (name: string, isMain = false, createdOn?: Date, id?: number): SignatureComponent => ({
    signatureComponentId: id,
    name,
    description: null,
    index_count: 0,
    index_type: 'dec',
    is_main: isMain,
    createdOn: createdOn ?? new Date(0),
    modifiedOn: new Date(0),
});

describe('compareSignatureComponents', () => {
    it('defaults to main components first, then alphabetical by name', () => {
        const items = [comp('Zulu'), comp('Alpha'), comp('Main', true)];
        items.sort(compareSignatureComponents);
        expect(items.map(c => c.name)).toEqual(['Main', 'Alpha', 'Zulu']);
    });
});

describe('compareSignatureComponentsBy', () => {
    it('name mode sorts alphabetically within the non-main group', () => {
        const items = [comp('Zulu'), comp('Alpha'), comp('Mango')];
        items.sort(compareSignatureComponentsBy('name', false));
        expect(items.map(c => c.name)).toEqual(['Alpha', 'Mango', 'Zulu']);
    });

    it('creation mode sorts oldest first', () => {
        const items = [
            comp('Newest', false, new Date('2025-01-01')),
            comp('Oldest', false, new Date('2023-01-01')),
            comp('Middle', false, new Date('2024-01-01')),
        ];
        items.sort(compareSignatureComponentsBy('creation', false));
        expect(items.map(c => c.name)).toEqual(['Oldest', 'Middle', 'Newest']);
    });

    it('keeps main components first in every mode and in both directions', () => {
        // Reversal only orders *within* the groups: the main signature stays on top.
        for (const mode of ['name', 'creation'] as const) {
            for (const reversed of [false, true]) {
                const items = [
                    comp('Alpha'),
                    comp('Zulu', false, new Date('2023-01-01'), 1),
                    comp('Main', true, new Date('2025-01-01'), 2),
                ];
                items.sort(compareSignatureComponentsBy(mode, reversed));
                expect(items[0]!.name).toBe('Main');
            }
        }
    });

    it('reversing flips the order within the non-main group', () => {
        const items = [comp('Alpha'), comp('Mango'), comp('Zulu')];
        items.sort(compareSignatureComponentsBy('name', true));
        expect(items.map(c => c.name)).toEqual(['Zulu', 'Mango', 'Alpha']);
    });

    it('breaks ties by id ascending even when reversed', () => {
        const items = [comp('Same', false, new Date(0), 3), comp('Same', false, new Date(0), 1), comp('Same', false, new Date(0), 2)];
        expect(items.slice().sort(compareSignatureComponentsBy('name', false)).map(c => c.signatureComponentId)).toEqual([1, 2, 3]);
        expect(items.slice().sort(compareSignatureComponentsBy('name', true)).map(c => c.signatureComponentId)).toEqual([1, 2, 3]);
    });
});
