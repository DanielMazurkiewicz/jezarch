import { describe, it, expect } from 'bun:test';
import { indexTypeLabel, indexTypeLabelKey } from './signatureIndexType';
import type { SignatureComponent } from '../../../backend/src/functionalities/signature/component/models';

type IndexTypeKey = NonNullable<ReturnType<typeof indexTypeLabelKey>>;

describe('indexTypeLabelKey', () => {
    it('maps every index type to its translation key', () => {
        const cases: [SignatureComponent['index_type'], IndexTypeKey][] = [
            ['dec', 'indexTypeDecimal'],
            ['roman', 'indexTypeRoman'],
            ['small_char', 'indexTypeLowerLetter'],
            ['capital_char', 'indexTypeUpperLetter'],
        ];
        for (const [type, key] of cases) {
            expect(indexTypeLabelKey(type)).toBe(key);
        }
    });

    it('returns null for an unknown type', () => {
        expect(indexTypeLabelKey('hexadecimal' as SignatureComponent['index_type'])).toBeNull();
    });
});

describe('indexTypeLabel', () => {
    it('returns the translated format name', () => {
        expect(indexTypeLabel('roman', 'en')).toContain('Roman');
        expect(indexTypeLabel('roman', 'pl')).toContain('Rzymski');
    });

    it('falls back to the raw type when it has no translation', () => {
        expect(indexTypeLabel('hexadecimal' as SignatureComponent['index_type'], 'en')).toBe('hexadecimal');
    });
});
