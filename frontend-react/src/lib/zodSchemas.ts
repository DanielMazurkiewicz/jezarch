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

// Base password schema for reuse
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number");

// Registration Schema
export const registerSchema = z.object({
    login: z.string().min(3, "Login must be at least 3 characters").max(50),
    password: passwordSchema,
    confirmPassword: z.string()
    // Removed role from frontend registration schema, backend handles default assignment
    // role: z.enum(['admin', 'employee', 'user']).optional(), // Updated roles
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"], // Correct path for the error message
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// --- User Management ---
// Change Password by User (requires old password)
export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
});
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

// Admin Set Password (only new password needed)
export const setPasswordSchema = z.object({
    password: passwordSchema,
});
export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

// Role Update Schema (used in UserManagement)
export const updateUserRoleSchema = z.object({
     // Updated roles
    role: z.enum(['admin', 'employee', 'user']).nullable(),
});
export type UpdateUserRoleFormData = z.infer<typeof updateUserRoleSchema>;


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
    index_type: z.enum(["dec", "roman", "small_char", "capital_char"]),
});
export type CreateSignatureComponentFormData = z.infer<typeof createSignatureComponentFormSchema>;

// --- Signature Element ---
export const elementFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(),
    index: z.string().max(20, "Index override too long").optional().nullable(),
    parentIds: z.array(z.number().int().positive()).optional().default([]),
});
export type ElementFormData = z.infer<typeof elementFormSchema>;

// --- Archive Document ---
export const createArchiveDocumentFormSchema = z.object({
    parentUnitArchiveDocumentId: z.preprocess(
        (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
        z.number().int().positive().nullable().optional()
    ),
    type: z.enum(["unit", "document"]),
    topographicSignatureElementIds: z.array(z.array(z.number().int().positive())).optional().default([]),
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
    isDigitized: z.boolean().optional().default(false),
    digitizedVersionLink: z.preprocess(
        (val) => (val === "" ? null : val),
        z.string().url("Invalid URL format").nullable().optional()
    ),
    tagIds: z.array(z.number().int().positive()).optional().default([]),
}).refine(data => data.isDigitized || !data.digitizedVersionLink, {
    message: "Digitized link requires 'Is Digitized' to be checked",
    path: ["digitizedVersionLink"],
});
export type CreateArchiveDocumentFormData = z.infer<typeof createArchiveDocumentFormSchema>;

// --- Settings ---
export const settingsSchema = z.object({
    [AppConfigKeys.PORT]: z.coerce
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
export const sslSchema = z.object({
    key: z.string().min(1, "Private key is required.").trim().refine(val => val.startsWith('-----BEGIN'), { message: 'Key must start with -----BEGIN...'}),
    cert: z.string().min(1, "Certificate is required.").trim().refine(val => val.startsWith('-----BEGIN CERTIFICATE'), { message: 'Certificate must start with -----BEGIN CERTIFICATE...'}),
});
export type SslFormData = z.infer<typeof sslSchema>;

// --- User Tag Assignment ---
export const assignTagsSchema = z.object({
    tagIds: z.array(z.number().int().positive(), { invalid_type_error: "Tags must be an array of numbers" }).default([]),
});
export type AssignTagsFormData = z.infer<typeof assignTagsSchema>;