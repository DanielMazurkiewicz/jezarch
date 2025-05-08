import { z } from 'zod';
import { Tag } from '../../tag/models'; // Import Tag model
import type { SearchQuery } from '../../../utils/search';
import { searchRequestSchema } from '../../../utils/search_validation'; // Import Zod schema for SearchRequest base

// Represents a sequence of signature element IDs forming a single signature path
export type SignatureElementIdPath = number[]; // Kept for descriptive signatures

// Define allowed document types
export const ArchiveDocumentType = z.enum(["unit", "document"]);
export type ArchiveDocumentType = z.infer<typeof ArchiveDocumentType>;

// Main interface for an Archive Document
export interface ArchiveDocument {
    archiveDocumentId?: number;
    parentUnitArchiveDocumentId?: number | null; // FK to self for hierarchy
    createdBy: string; // Login of the user who created the document
    updatedBy: string; // Login of the user who last updated the document
    type: ArchiveDocumentType;
    active: boolean; // For soft delete

    topographicSignature: string | null; // Simple text field for topographic signature
    descriptiveSignatureElementIds: SignatureElementIdPath[]; // JSON array of element ID paths

    // Core metadata fields
    title: string;
    creator: string;
    creationDate: string; // Flexible string format
    numberOfPages: string | null;
    documentType: string | null;
    dimensions: string | null;
    binding: string | null;
    condition: string | null;
    documentLanguage: string | null;
    contentDescription: string | null;

    // Optional metadata fields
    remarks?: string | null;
    accessLevel: string | null;
    accessConditions: string | null;
    additionalInformation?: string | null;
    relatedDocumentsReferences?: string | null;
    recordChangeHistory?: string | null;

    // Digitization info
    isDigitized: boolean;
    digitizedVersionLink?: string | null;

    // Timestamps
    createdOn: Date;
    modifiedOn: Date;

    // Populated fields (not stored directly in main table)
    tags?: Tag[];
    // removed ownerLogin
    // resolvedDescriptiveSignatures managed in ArchiveDocumentSearchResult
}

// --- Input Schemas ---

// Base schema for common fields (DOES NOT include createdBy/updatedBy, these are set server-side)
const archiveDocumentBaseSchema = z.object({
    parentUnitArchiveDocumentId: z.number().int().positive().optional().nullable(),
    type: ArchiveDocumentType,
    topographicSignature: z.string().max(500, "Topographic signature too long").optional().nullable(),
    descriptiveSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    title: z.string().min(1, "Title cannot be empty"),
    creator: z.string().min(1, "Creator cannot be empty"),
    creationDate: z.string().min(1, "Creation date cannot be empty"),
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
    recordChangeHistory: z.string().optional().nullable(),
    isDigitized: z.boolean().optional().default(false),
    digitizedVersionLink: z.string().url("Invalid URL format").optional().nullable(),
    tagIds: z.array(z.number().int().positive()).optional().default([]),
});

// Schema for creating a new document/unit (no ownerUserId)
export const createArchiveDocumentSchema = archiveDocumentBaseSchema;

// Schema for updating an existing document (no ownerUserId)
export const updateArchiveDocumentSchema = archiveDocumentBaseSchema.partial();

// Type definitions for input data based on the Zod schemas
export type CreateArchiveDocumentInput = z.infer<typeof createArchiveDocumentSchema>;
export type UpdateArchiveDocumentInput = z.infer<typeof updateArchiveDocumentSchema>;


// Interface for search results potentially including resolved data
export interface ArchiveDocumentSearchResult extends ArchiveDocument {
   resolvedDescriptiveSignatures?: string[];
}


// --- Schema and Type for Batch Tagging (remains the same internally) ---
export const batchTagDocumentsSchema = z.object({
    searchQuery: searchRequestSchema.shape.query, // Get the 'query' shape
    tagIds: z.array(z.number().int().positive()).min(1, "At least one tag ID must be selected"),
    action: z.enum(['add', 'remove']),
});

export type BatchTagDocumentsInput = z.infer<typeof batchTagDocumentsSchema>;