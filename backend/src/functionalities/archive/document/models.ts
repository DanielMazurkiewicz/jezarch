// ===> File: backend/src/functionalities/archive/document/models.ts <===
import { z } from 'zod';
import { Tag } from '../../tag/models'; // Import Tag model

// Represents a sequence of signature element IDs forming a single signature path
// Example: [component1_element5, component3_element12] -> [5, 12] (assuming element IDs are 5 and 12)
export type SignatureElementIdPath = number[];

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

    // Signatures stored as JSON arrays of element ID paths
    topographicSignatureElementIds: SignatureElementIdPath[];
    descriptiveSignatureElementIds: SignatureElementIdPath[];

    // Core metadata fields
    title: string;
    creator: string;
    creationDate: string; // Flexible string format
    numberOfPages: string; // Flexible string format
    documentType: string; // Could be refined with enum/union later
    dimensions: string;
    binding: string; // Could be refined with enum/union later
    condition: string;
    documentLanguage: string;
    contentDescription: string;

    // Optional metadata fields
    remarks?: string | null;
    accessLevel: string; // Consider making non-optional?
    accessConditions: string; // Consider making non-optional?
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
    // resolvedTopographicSignatures?: string[]; // Could be added if needed
    // resolvedDescriptiveSignatures?: string[]; // Could be added if needed
}

// --- Input Schemas ---

// Base schema for common fields
const archiveDocumentBaseSchema = z.object({
    parentUnitArchiveDocumentId: z.number().int().positive().optional().nullable(),
    type: ArchiveDocumentType,
    topographicSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    descriptiveSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    title: z.string().min(1, "Title cannot be empty"),
    creator: z.string().min(1, "Creator cannot be empty"),
    creationDate: z.string().min(1, "Creation date cannot be empty"), // Basic validation, could be stricter date format
    numberOfPages: z.string().optional().default(''),
    documentType: z.string().optional().default(''),
    dimensions: z.string().optional().default(''),
    binding: z.string().optional().default(''),
    condition: z.string().optional().default(''),
    documentLanguage: z.string().optional().default(''),
    contentDescription: z.string().optional().default(''),
    remarks: z.string().optional().nullable(),
    accessLevel: z.string().optional().default(''),
    accessConditions: z.string().optional().default(''),
    additionalInformation: z.string().optional().nullable(),
    relatedDocumentsReferences: z.string().optional().nullable(),
    recordChangeHistory: z.string().optional().nullable(), // Usually not set by user directly
    isDigitized: z.boolean().optional().default(false),
    digitizedVersionLink: z.string().url("Invalid URL format").optional().nullable(),
    tagIds: z.array(z.number().int().positive()).optional().default([]), // Array of tag IDs to associate
});

// Schema for creating a new document
export const createArchiveDocumentSchema = archiveDocumentBaseSchema;

// Schema for updating an existing document (all fields optional)
export const updateArchiveDocumentSchema = archiveDocumentBaseSchema.partial();

// Type definitions for input data
export type CreateArchiveDocumentInput = z.infer<typeof createArchiveDocumentSchema>;
export type UpdateArchiveDocumentInput = z.infer<typeof updateArchiveDocumentSchema>;

// Interface for search results potentially including resolved data if needed later
export interface ArchiveDocumentSearchResult extends ArchiveDocument {
   // Add any specific search result fields here if needed
}