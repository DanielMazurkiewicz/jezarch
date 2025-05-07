import { ZodSchema, z } from 'zod';
import { Tag } from '../tag/models'; // Import Tag for assignedTags

export interface UserCredentials {
    login: string;
    password: string;
}

// Base User Roles - Updated: 'regular_user' -> 'employee', added 'user'
export type UserRole = "admin" | "employee" | "user";

// Supported languages - added Polish
export const supportedLanguages = ['en', 'pl'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];
// Define and EXPORT the default language here
export const defaultLanguage: SupportedLanguage = 'en';

// User interface allows role to be null
// Added optional assignedTags field
// Added preferredLanguage field
export interface User {
    userId: number;
    login: string;
    password?: string; // Store hashed password only
    role: UserRole | null; // Role can now be null
    assignedTags?: Tag[]; // Tags assigned to this user (relevant for 'user' role)
    preferredLanguage: SupportedLanguage; // Added preferred language
}

// Schema for registration allows optional role
export const userSchema = z.object({
    login: z.string().min(3, "Login must be at least 3 characters").max(50),
    password: z.string().min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Must contain at least one uppercase letter")
        .regex(/[a-z]/, "Must contain at least one lowercase letter")
        .regex(/[0-9]/, "Must contain at least one number"),
    // Role is optional on creation, backend handles default assignment
    // Role field removed from frontend schema, assigned by backend/admin
    // role: z.enum(['admin', 'employee', 'user']).optional(),
    // --- NEW: Allow preferredLanguage on creation, defaults to 'en' if not provided ---
    // Ensure the default in the schema matches the exported constant
    preferredLanguage: z.enum(supportedLanguages).optional().default(defaultLanguage),
});

// Schema for role update allows specific roles or null
export const updateUserRoleSchema = z.object({
    // Updated role enum for validation
    role: z.enum(['admin', 'employee', 'user']).nullable(),
});

// --- NEW: Schema for preferred language update ---
export const updatePreferredLanguageSchema = z.object({
    preferredLanguage: z.enum(supportedLanguages, {
        errorMap: (issue, ctx) => {
            if (issue.code === z.ZodIssueCode.invalid_enum_value) {
                return { message: `Invalid language. Supported: ${supportedLanguages.join(', ')}.` };
            }
            return { message: ctx.defaultError };
        }
    }),
});
// --- END NEW ---

// --- User Allowed Tags ---
// Model for the relationship between users and allowed tags
export interface UserAllowedTag {
    userId: number;
    tagId: number;
}

// --- Change Password Schemas ---
// Schema for user changing their own password
// --- UPDATED: Removed confirmPassword and refine ---
export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, "Current password is required"),
    password: userSchema.shape.password, // Reuse password complexity rules
});

// Schema for admin setting password (only requires new password)
export const setPasswordSchema = z.object({
    password: userSchema.shape.password, // Reuse password complexity rules
});
