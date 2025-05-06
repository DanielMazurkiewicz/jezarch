// utils/search_validation.ts
import { z } from 'zod';

// Base schema for primitive value conditions
const primitiveSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.enum(["EQ", "GT", "GTE", "LT", "LTE"]),
    value: z.any().refine(val => typeof val !== 'object' || val === null, { message: "Value must be primitive or null"}),
});

// Schema for 'ANY_OF' condition (array of primitives, or array of arrays for signatures)
const anyOfSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("ANY_OF"),
    value: z.array(
        z.union([
            z.any().refine(val => typeof val !== 'object' || val === null, { message: "Array values must be primitive or null"}), // Primitive or null
            z.array(z.number().int().positive()) // Array of numbers for signature paths
        ])
    ),
});

// Schema for 'FRAGMENT' condition (string value)
const fragmentSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("FRAGMENT"),
    value: z.string(),
});

// --- Custom Field Conditions for Signature Paths ---
// This schema now ONLY handles conditions specific to signature paths that primitiveSearchSchema doesn't cover.
const signaturePathSpecificSearchSchema = z.object({
    field: z.string().min(1), // e.g., "descriptiveSignature"
    not: z.boolean().optional().default(false),
    condition: z.enum(["STARTS_WITH", "CONTAINS_SEQUENCE"]), // Specific conditions for paths
    value: z.array(z.number().int().positive()), // Value is always a single path (array of numbers)
});


// Discriminated union for a single search query element
export const searchQueryElementSchema = z.discriminatedUnion("condition", [
    primitiveSearchSchema, // Handles basic EQ, GT, LT etc.
    anyOfSearchSchema,     // Handles ANY_OF
    fragmentSearchSchema,  // Handles FRAGMENT (LIKE)
    signaturePathSpecificSearchSchema, // Handles path-specific STARTS_WITH, CONTAINS_SEQUENCE
]);
// Note: An 'EQ' condition with an array value (for exact path match) will be validated
// by primitiveSearchSchema (due to value: z.any()). The backend handler MUST check
// the type of `value` when processing an 'EQ' condition on the 'descriptiveSignature' field.

// Full Search Request Schema
export const searchRequestSchema = z.object({
    query: z.array(searchQueryElementSchema),
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().min(-1).optional().default(10),
});