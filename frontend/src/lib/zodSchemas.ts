import { z } from 'zod';
// Import backend enums/types where possible for consistency
// Corrected import paths assuming backend/src is sibling to frontend/src
import type { SignatureComponentIndexType } from '../../../backend/src/functionalities/signature/component/models';
import type { ArchiveDocumentType } from '../../../backend/src/functionalities/archive/document/models';
import { AppConfigKeys } from '../../../backend/src/functionalities/config/models'; // Import keys enum

// --- Auth ---
export const loginSchema = z.object({
    login: z.string().min(1, "Login is required"),
    password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
    login: z.string().min(3, "Login must be at least 3 characters").max(50),
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
    confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // Correct path for the error message
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// --- Tag ---
export const tagFormSchema = z.object({
    name: z.string().min(1, "Tag name cannot be empty").max(50, "Tag name too long"),
    description: z.string().max(255, "Description too long").optional().nullable(), // Allow null
});
export type TagFormData = z.infer<typeof tagFormSchema>;


// --- Note ---
export const noteFormSchema = z.object({
    title: z.string().min(1, "Title cannot be empty"),
    content: z.string().optional().nullable(), // Allow null content
    shared: z.boolean().optional().default(false),
    tagIds: z.array(z.number().int().positive()).optional().default([]),
});
export type NoteFormData = z.infer<typeof noteFormSchema>;

// --- Signature Component ---
export const createSignatureComponentFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(), // Allow null
    // Ensure the enum values match the backend exactly
    index_type: z.enum(["dec", "roman", "small_char", "capital_char"]), // Removed optional/default, should be explicit
});
export type CreateSignatureComponentFormData = z.infer<typeof createSignatureComponentFormSchema>;

// --- Signature Element ---
// Note: Backend handles index generation if not provided
export const elementFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(),
    // Allow empty string for index, backend should interpret as 'auto'
    index: z.string().max(20, "Index override too long").optional().nullable(),
    parentIds: z.array(z.number().int().positive()).optional().default([]),
});
export type ElementFormData = z.infer<typeof elementFormSchema>;

// --- Archive Document ---
// This schema is for the frontend form, mapping to CreateArchiveDocumentInput/UpdateArchiveDocumentInput on the backend
export const createArchiveDocumentFormSchema = z.object({
    // Use z.coerce for potential string inputs from number fields that might be empty
    parentUnitArchiveDocumentId: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
        z.number().int().positive().nullable().optional()
    ),
    type: z.enum(["unit", "document"]),
    // Signatures (topographicSignatureElementIds, descriptiveSignatureElementIds) are handled separately by state in the form component (SignaturePathSelector), not directly in RHF Zod schema
    title: z.string().min(1, "Title cannot be empty"),
    creator: z.string().min(1, "Creator cannot be empty"),
    creationDate: z.string().min(1, "Creation date cannot be empty"), // Basic validation
    numberOfPages: z.string().max(50).optional().nullable(), // Added max length
    documentType: z.string().max(100).optional().nullable(), // Added max length
    dimensions: z.string().max(100).optional().nullable(), // Added max length
    binding: z.string().max(100).optional().nullable(), // Added max length
    condition: z.string().max(255).optional().nullable(), // Added max length
    documentLanguage: z.string().max(50).optional().nullable(), // Added max length
    contentDescription: z.string().max(2000).optional().nullable(), // Added max length
    remarks: z.string().max(1000).optional().nullable(), // Added max length
    accessLevel: z.string().max(50).optional().nullable(), // Added max length
    accessConditions: z.string().max(255).optional().nullable(), // Added max length
    additionalInformation: z.string().max(1000).optional().nullable(), // Added max length
    relatedDocumentsReferences: z.string().max(500).optional().nullable(), // Added max length
    // recordChangeHistory: z.string().optional().nullable(), // Usually not set by user
    isDigitized: z.boolean().optional().default(false),
    // Allow empty string, null, or valid URL
    digitizedVersionLink: z.preprocess(
        (val) => (val === "" ? null : val), // Convert empty string to null
        z.string().url("Invalid URL format").nullable().optional()
    ),
    // TagIds handled by TagSelector state, linked via setValue
    tagIds: z.array(z.number().int().positive()).optional().default([]),
}).refine(data => data.isDigitized || !data.digitizedVersionLink, { // Link only makes sense if digitized
    message: "Digitized link requires 'Is Digitized' to be checked",
    path: ["digitizedVersionLink"],
});
export type CreateArchiveDocumentFormData = z.infer<typeof createArchiveDocumentFormSchema>;

// --- Settings ---
// Define keys using the enum for type safety
export const settingsSchema = z.object({
    [AppConfigKeys.PORT]: z.coerce // Use coerce for inputs that might be strings
        .number({ invalid_type_error: "Port must be a number" })
        .int("Port must be an integer")
        .min(1, "Port must be at least 1")
        .max(65535, "Port cannot exceed 65535"),
    [AppConfigKeys.DEFAULT_LANGUAGE]: z.string()
        .min(2, "Language code required (e.g., en, de)")
        .max(10, "Language code too long"),
});
export type SettingsFormData = z.infer<typeof settingsSchema>;

// --- SSL ---
// Adjusted refine messages slightly
export const sslSchema = z.object({
    key: z.string().min(1, "Private key is required.").trim().refine(val => val.startsWith('-----BEGIN'), { message: 'Key must start with -----BEGIN...'}),
    cert: z.string().min(1, "Certificate is required.").trim().refine(val => val.startsWith('-----BEGIN CERTIFICATE'), { message: 'Certificate must start with -----BEGIN CERTIFICATE...'}),
});
export type SslFormData = z.infer<typeof sslSchema>;

// Removed self-referential export
// export * from './zodSchema';