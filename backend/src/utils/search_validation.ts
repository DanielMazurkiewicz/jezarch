// utils/search_validation.ts
import { z } from 'zod';

// Base schema for primitive value conditions
const primitiveSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.enum(["EQ", "GT", "GTE", "LT", "LTE"]),
    // value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
     // Allow any primitive or null for value initially, specific handlers can validate further
    value: z.any().refine(val => typeof val !== 'object' || val === null, { message: "Value must be primitive or null"}),
});

// Schema for 'ANY_OF' condition (array of primitives or null)
const anyOfSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("ANY_OF"),
    // value: z.array(z.union([z.string(), z.number(), z.boolean(), z.null()])),
    // Allow arrays of any primitives or null
    value: z.array(z.any().refine(val => typeof val !== 'object' || val === null, { message: "Array values must be primitive or null"})),
});

// Schema for 'FRAGMENT' condition (string value)
const fragmentSearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("FRAGMENT"),
    value: z.string(), // FRAGMENT always requires a string
});

// --- Custom Field Conditions ---
// Example: Schema for 'ANY_OF' condition with array of arrays (for signature prefixes)
const anyOfArraySearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("ANY_OF"),
    value: z.array(z.array(z.any())), // Array of arrays, further validation in handler if needed
});

// Example: Schema for 'EQ' condition with a single array (for exact signature match)
const eqArraySearchSchema = z.object({
    field: z.string().min(1),
    not: z.boolean().optional().default(false),
    condition: z.literal("EQ"),
    value: z.array(z.any()), // Single array, further validation in handler if needed
});


// Discriminated union for a single search query element
export const searchQueryElementSchema = z.discriminatedUnion("condition", [
    primitiveSearchSchema,
    anyOfSearchSchema,
    fragmentSearchSchema,
    // --- Add custom schemas here if their 'condition' differs ---
    // For signatures, we use existing conditions like ANY_OF and EQ but with array values.
    // We rely on backend logic/handlers to interpret array values correctly based on the field.
    // If a field *only* accepts arrays for a specific condition, you could refine here,
    // but it might overcomplicate the base validation.
]);

// Full Search Request Schema
export const searchRequestSchema = z.object({
    query: z.array(searchQueryElementSchema),
    page: z.number().int().positive().optional().default(1),
    pageSize: z.number().int().min(-1).optional().default(10), // Allow -1 for no limit
});