import { describe, it, expect } from 'bun:test';
import { parseElementPath, elementPathQuery } from './elementPath';

describe('parseElementPath', () => {
    it('returns [current] when the path is missing or empty', () => {
        expect(parseElementPath(null, 7)).toEqual([7]);
        expect(parseElementPath('', 7)).toEqual([7]);
    });

    it('keeps a valid path that ends with the current element', () => {
        expect(parseElementPath('1,2,3', 3)).toEqual([1, 2, 3]);
        expect(parseElementPath('4', 4)).toEqual([4]);
    });

    it('falls back to [current] when the last id does not match the current element', () => {
        expect(parseElementPath('1,2,9', 3)).toEqual([3]);
    });

    it('drops malformed entries (non-numeric or non-positive)', () => {
        expect(parseElementPath('1,,abc,3', 3)).toEqual([1, 3]);
        expect(parseElementPath('1,0,-2,3', 3)).toEqual([1, 3]);
    });

    it('returns [] when the current element id is invalid', () => {
        expect(parseElementPath('1,2', NaN)).toEqual([]);
        expect(parseElementPath('1,2', -5)).toEqual([]);
    });
});

describe('elementPathQuery', () => {
    it('joins ids with commas', () => {
        expect(elementPathQuery([1, 2, 3])).toBe('path=1,2,3');
        expect(elementPathQuery([5])).toBe('path=5');
    });
});
