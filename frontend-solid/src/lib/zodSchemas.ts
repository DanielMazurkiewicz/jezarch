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
    title: z.string().min(1, "Title cannot be empty").max(255, "Title too long"),
    content: z.string().max(10000, "Content is too long").optional().nullable(), // Allow null content, add max length
    shared: z.boolean().optional().default(false),
    // TagIds are handled by the TagSelector component's state,
    // but include in schema for potential validation/linking if needed.
    // Defaulting to empty array.
    tagIds: z.array(z.number().int().positive()).optional().default([]),
});
export type NoteFormData = z.infer<typeof noteFormSchema>;

// --- Signature Component ---
export const createSignatureComponentFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(), // Allow null
    // Ensure the enum values match the backend exactly
    index_type: z.enum(["dec", "roman", "small_char", "capital_char"], { required_error: "Index type is required" }),
});
export type CreateSignatureComponentFormData = z.infer<typeof createSignatureComponentFormSchema>;

// --- Signature Element ---
// Note: Backend handles index generation if not provided
export const elementFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(),
    // Allow empty string for index, backend should interpret as 'auto'
    index: z.string().max(20, "Index override too long").optional().nullable(),
    // Parent IDs handled by selector state, include here if schema needs to validate it (e.g., max parents)
    parentIds: z.array(z.number().int().positive()).optional().default([]),
});
export type ElementFormData = z.infer<typeof elementFormSchema>;

// --- Archive Document ---
// This schema is for the frontend form, mapping to CreateArchiveDocumentInput/UpdateArchiveDocumentInput on the backend
export const createArchiveDocumentFormSchema = z.object({
    parentUnitArchiveDocumentId: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
        z.number().int().positive().nullable().optional()
    ),
    type: z.enum(["unit", "document"]),
    topographicSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    descriptiveSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
    title: z.string().min(1, "Title cannot be empty").max(500, "Title too long"),
    creator: z.string().min(1, "Creator cannot be empty").max(255, "Creator name too long"),
    creationDate: z.string().min(1, "Creation date cannot be empty").max(100, "Date string too long"), // Basic validation
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
    isDigitized: z.boolean().optional().default(false),
    digitizedVersionLink: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url("Invalid URL format").max(1024, "URL too long").nullable().optional()
    ),
    tagIds: z.array(z.number().int().positive()).optional().default([]),
}).superRefine((data, ctx) => {
    if (data.isDigitized && !data.digitizedVersionLink) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Digitized link is required when 'Is Digitized' is checked",
            path: ["digitizedVersionLink"],
        });
    }
    if (!data.isDigitized && data.digitizedVersionLink) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Cannot provide a link unless 'Is Digitized' is checked",
            path: ["digitizedVersionLink"],
        });
    }
    if (data.type === 'document' && data.parentUnitArchiveDocumentId === null) {
         ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Documents must belong to a Parent Unit.',
            path: ['parentUnitArchiveDocumentId'],
        });
    }
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