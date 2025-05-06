import { z } from 'zod';
import { Tag } from '../../tag/models'; // Import Tag model
// --- NEW: Import SearchQuery schema ---
import type { SearchQuery } from '../../../utils/search';
import { searchRequestSchema } from '../../../utils/search_validation'; // Import Zod schema for SearchRequest base

// Represents a sequence of signature element IDs forming a single signature path
// Example: [component1_element5, component3_element12] -> [5, 12] (assuming element IDs are 5 and 12)
export type SignatureElementIdPath = number[]; // Kept for descriptive signatures

// Define allowed document types
export const ArchiveDocumentType = z.enum(["unit", "document"]);
export type ArchiveDocumentType = z.infer<typeof ArchiveDocumentType>;

// Main interface for an Archive Document
export interface ArchiveDocument {
    archiveDocumentId?: number;
    parentUnitArchiveDocumentId?: number | null; // FK to self for hierarchy
    ownerUserId: number; // FK to users table
    type: ArchiveDocumentType;
    active: boolean; // For soft delete

    // --- UPDATED: Simplified topographic signature ---
    topographicSignature: string | null; // Simple text field for topographic signature
    // --- Kept descriptive signature as is ---
    descriptiveSignatureElementIds: SignatureElementIdPath[]; // JSON array of element ID paths

    // Core metadata fields
    title: string;
    creator: string;
    creationDate: string; // Flexible string format
    numberOfPages: string | null; // Changed to nullable to match DB/form
    documentType: string | null; // Changed to nullable
    dimensions: string | null; // Changed to nullable
    binding: string | null; // Changed to nullable
    condition: string | null; // Changed to nullable
    documentLanguage: string | null; // Changed to nullable
    contentDescription: string | null; // Changed to nullable

    // Optional metadata fields
    remarks?: string | null;
    accessLevel: string | null; // Changed to nullable
    accessConditions: string | null; // Changed to nullable
    additionalInformation?: string | null;
    relatedDocumentsReferences?: string | null;
    recordChangeHistory?: string | null; // Might be managed automatically later

    // Digitization info
    isDigitized: boolean;
    digitizedVersionLink?: string | null;

    // Timestamps
    createdOn: Date;
    modifiedOn: Date;

    // Populated fields (not stored directly in main table)
    tags?: Tag[];
    ownerLogin?: string; // Added owner login for display
    // resolvedTopographicSignatures?: string[]; // Removed, now a single string
    // resolvedDescriptiveSignatures could be part of ArchiveDocument if always needed,
    // or part of ArchiveDocumentSearchResult if only for search display.
    // Let's add it to ArchiveDocumentSearchResult for now.
}

// --- Input Schemas ---

// Base schema for common fields
const archiveDocumentBaseSchema = z.object({
    parentUnitArchiveDocumentId: z.number().int().positive().optional().nullable(),
    type: ArchiveDocumentType,
    // --- UPDATED: Topographic signature is now a string ---
    topographicSignature: z.string().max(500, "Topographic signature too long").optional().nullable(),
    // --- Kept descriptive signature ---
    descriptiveSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    title: z.string().min(1, "Title cannot be empty"),
    creator: z.string().min(1, "Creator cannot be empty"),
    creationDate: z.string().min(1, "Creation date cannot be empty"), // Basic validation, could be stricter date format
    // Use optional() and nullable() for potentially empty fields
    numberOfPages: z.string().max(50).optional().nullable(),
    documentType: z.string().max(100).optional().nullable(),
    dimensions: z.string().max(100).optional().nullable(),
    binding: z.string().max(100).optional().nullable(),
    condition: z.string().max(255).optional().nullable(),
    documentLanguage: z.string().max(50).optional().nullable(),
    contentDescription: z.string().max(2000).optional().nullable(),
    remarks: z.string().max(1000).optional().nullable(),
    accessLevel: z.string().max(50).optional().nullable(),
    accessConditions: z.string().max(255).optional().nullable(),
    additionalInformation: z.string().max(1000).optional().nullable(),
    relatedDocumentsReferences: z.string().max(500).optional().nullable(),
    recordChangeHistory: z.string().optional().nullable(), // Usually not set by user directly
    isDigitized: z.boolean().optional().default(false),
    // Add refine/preprocess in frontend Zod schema for URL validation handling empty strings
    digitizedVersionLink: z.string().url("Invalid URL format").optional().nullable(),
    tagIds: z.array(z.number().int().positive()).optional().default([]), // Array of tag IDs to associate
    // active: z.boolean().optional(), // Don't allow setting active directly via create/update API? Managed by disable endpoint.
});

// Schema for creating a new document/unit (all required fields from base must be present)
export const createArchiveDocumentSchema = archiveDocumentBaseSchema;

// Schema for updating an existing document (all fields optional, uses PATCH semantics)
// Use .partial() to make all fields optional
// Explicitly add ownerUserId as optional
export const updateArchiveDocumentSchema = archiveDocumentBaseSchema.extend({
    ownerUserId: z.number().int().positive().optional(),
}).partial();

// Type definitions for input data based on the Zod schemas
export type CreateArchiveDocumentInput = z.infer<typeof createArchiveDocumentSchema>;
export type UpdateArchiveDocumentInput = z.infer<typeof updateArchiveDocumentSchema>;


// Interface for search results potentially including resolved data
export interface ArchiveDocumentSearchResult extends ArchiveDocument {
   // Add any specific search result fields here if needed
   resolvedDescriptiveSignatures?: string[]; // <<< THIS LINE IS UNCOMMENTED/ADDED
}


// --- NEW: Schema and Type for Batch Tagging ---
export const batchTagDocumentsSchema = z.object({
    // Reuse the search request schema for the query part
    searchQuery: searchRequestSchema.shape.query, // Get the 'query' shape
    tagIds: z.array(z.number().int().positive()).min(1, "At least one tag ID must be selected"),
    action: z.enum(['add', 'remove']),
});

export type BatchTagDocumentsInput = z.infer<typeof batchTagDocumentsSchema>;
// --- END NEW ---