// backend/src/utils/formatIndex.ts

import { SignatureComponentIndexType } from "../functionalities/signature/component/models";

/**
 * Converts a positive integer count to a Roman numeral string.
 * Limited support up to 3999. Returns count as string for larger numbers.
 */
function toRoman(num: number): string {
    if (num <= 0 || num >= 4000) return String(num); // Handle invalid or out-of-range

    const romanMap: { [key: number]: string } = {
        1000: 'M', 900: 'CM', 500: 'D', 400: 'CD', 100: 'C',
        90: 'XC', 50: 'L', 40: 'XL', 10: 'X', 9: 'IX', 5: 'V',
        4: 'IV', 1: 'I'
    };
    const values = Object.keys(romanMap).map(Number).sort((a, b) => b - a); // Descending order

    let result = '';
    for (const value of values) {
        while (num >= value) {
            result += romanMap[value];
            num -= value;
        }
    }
    return result;
}

/**
 * Converts a positive integer count to a base-26 character string (a, b, ..., z, aa, ab, ...).
 */
function toCharIndex(num: number, useCapital: boolean): string {
    if (num <= 0) return String(num); // Handle invalid

    const baseCharCode = useCapital ? 'A'.charCodeAt(0) : 'a'.charCodeAt(0);
    let result = '';
    let current = num;

    while (current > 0) {
        const remainder = (current - 1) % 26; // 1-based index to 0-based remainder
        result = String.fromCharCode(baseCharCode + remainder) + result;
        current = Math.floor((current - 1) / 26);
    }
    return result;
}


/**
 * Formats a numeric index count based on the specified type.
 *
 * @param count - The positive integer index (e.g., 1, 2, 3...).
 * @param type - The desired formatting type.
 * @returns The formatted index string.
 */
export function formatIndex(count: number, type: SignatureComponentIndexType): string {
    if (count <= 0) return ""; // Or handle as error, maybe return '0'?

    switch (type) {
        case 'dec':
            return String(count);
        case 'roman':
            return toRoman(count);
        case 'small_char':
            return toCharIndex(count, false);
        case 'capital_char':
            return toCharIndex(count, true);
        default:
            // Should not happen due to type checking, but provide fallback
            console.warn(`Unsupported index format type: ${type}. Falling back to decimal.`);
            return String(count);
    }
}