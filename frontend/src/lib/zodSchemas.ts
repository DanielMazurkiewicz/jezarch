import { z } from 'zod';
import type { SignatureComponentIndexType } from '../../../backend/src/functionalities/signature/component/models';
import type { ArchiveDocumentType } from '../../../backend/src/functionalities/archive/document/models';
import { AppConfigKeys } from '../../../backend/src/functionalities/config/models';
import { searchRequestSchema as backendSearchRequestSchema } from '../../../backend/src/utils/search_validation';
// --- UPDATED: Import supportedLanguages and correct type ---
import { supportedLanguages, type SupportedLanguage as BackendSupportedLanguage } from '../../../backend/src/functionalities/user/models'; // Import supportedLanguages
// --- Use the imported type ---
type SupportedLanguage = BackendSupportedLanguage;
// -----------------------------

// --- Auth ---
export const loginSchema = z.object({
    login: z.string().min(1, "Login is required"),
    password: z.string().min(1, "Password is required"),
});
export type LoginFormData = z.infer<typeof loginSchema>;

export const passwordSchema = z.string().min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain at least one uppercase letter")
    .regex(/[a-z]/, "Must contain at least one lowercase letter")
    .regex(/[0-9]/, "Must contain at least one number");

export const registerSchema = z.object({
    login: z.string().min(3, "Login must be at least 3 characters").max(50),
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
export type RegisterFormData = z.infer<typeof registerSchema>;

// --- User Management ---
export const userCreateSchema = z.object({
    login: z.string().min(3, "Login must be at least 3 characters").max(50),
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
export type UserCreateFormData = z.infer<typeof userCreateSchema>;

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    password: passwordSchema,
    confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, {
    message: "New passwords don't match",
    path: ["confirmPassword"],
});
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const setPasswordSchema = z.object({
    password: passwordSchema,
});
export type SetPasswordFormData = z.infer<typeof setPasswordSchema>;

export const updateUserRoleSchema = z.object({
    role: z.enum(['admin', 'employee', 'user']).nullable(),
});
export type UpdateUserRoleFormData = z.infer<typeof updateUserRoleSchema>;

// --- NEW: User Preferred Language Schema ---
export const updatePreferredLanguageFormSchema = z.object({
    // --- Ensure this uses the imported `supportedLanguages` ---
    preferredLanguage: z.enum(supportedLanguages, {
    // --------------------------------------------------------
        errorMap: (issue, ctx) => {
             if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                 return { message: `Please select a valid language. Supported: ${supportedLanguages.map(s => s.toUpperCase()).join(', ')}.` };
             }
             return { message: ctx.defaultError };
        }
    }),
});
export type UpdatePreferredLanguageFormData = z.infer<typeof updatePreferredLanguageFormSchema>;
// --- END NEW ---


// --- Tag ---
export const tagFormSchema = z.object({
    name: z.string().min(1, "Tag name cannot be empty").max(50, "Tag name too long"),
    description: z.string().max(255, "Description too long").optional().nullable(),
});
export type TagFormData = z.infer<typeof tagFormSchema>;

// --- Note ---
export const noteFormSchema = z.object({
    title: z.string().min(1, "Title cannot be empty"),
    content: z.string().optional().nullable(),
    shared: z.boolean().optional().default(false),
    tagIds: z.array(z.number().int().positive()).optional().default([]),
});
export type NoteFormData = z.infer<typeof noteFormSchema>;

// --- Signature Component ---
export const createSignatureComponentFormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty").max(100),
    description: z.string().max(500).optional().nullable(),
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
    // --- UPDATED: Validate against imported supportedLanguages ---
    [AppConfigKeys.DEFAULT_LANGUAGE]: z.enum(supportedLanguages, {
    // ----------------------------------------------------------
        errorMap: (issue, ctx) => {
             if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                 return { message: `Please select a valid language. Supported: ${supportedLanguages.map(s => s.toUpperCase()).join(', ')}.` };
             }
             return { message: ctx.defaultError };
        }
    }),
    [AppConfigKeys.HTTP_PORT]: z.coerce
        .number({ invalid_type_error: "HTTP Port must be a number" })
        .int("HTTP Port must be an integer")
        .min(1, "HTTP Port must be at least 1")
        .max(65535, "HTTP Port cannot exceed 65535"),
    [AppConfigKeys.HTTPS_PORT]: z.coerce
        .number({ invalid_type_error: "HTTPS Port must be a number" })
        .int("HTTPS Port must be an integer")
        .min(1, "HTTPS Port must be at least 1")
        .max(65535, "HTTPS Port cannot exceed 65535"),
    [AppConfigKeys.HTTPS_KEY_PATH]: z.string().max(1024, "Path too long").optional().nullable(),
    [AppConfigKeys.HTTPS_CERT_PATH]: z.string().max(1024, "Path too long").optional().nullable(),
    [AppConfigKeys.HTTPS_CA_PATH]: z.string().max(1024, "Path too long").optional().nullable(),
}).refine(data => !(data[AppConfigKeys.HTTPS_KEY_PATH] && !data[AppConfigKeys.HTTPS_CERT_PATH]), {
    message: "Certificate path is required if key path is provided.",
    path: [AppConfigKeys.HTTPS_CERT_PATH],
}).refine(data => !(!data[AppConfigKeys.HTTPS_KEY_PATH] && data[AppConfigKeys.HTTPS_CERT_PATH]), {
    message: "Key path is required if certificate path is provided.",
    path: [AppConfigKeys.HTTPS_KEY_PATH],
});
export type SettingsFormData = z.infer<typeof settingsSchema>;

// --- User Tag Assignment ---
export const assignTagsSchema = z.object({
    tagIds: z.array(z.number().int().positive(), { invalid_type_error: "Tags must be an array of numbers" }).default([]),
});
export type AssignTagsFormData = z.infer<typeof assignTagsSchema>;

// --- Batch Tagging ---
export const batchTagDialogSchema = z.object({
    tagIds: z.array(z.number().int().positive())
             .min(1, "Please select at least one tag."),
});
export type BatchTagDialogFormData = z.infer<typeof batchTagDialogSchema>;