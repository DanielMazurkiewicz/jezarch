
import { ZodSchema, z } from 'zod';

export interface UserCredentials {
  login: string;
  password: string;
}

export type UserRole = "admin" | "regular_user";

export interface User {
    userId: number;
    login: string;
    password?: string; // Store hashed password only
    role: UserRole;
}

export const userSchema = z.object({
  login: z.string().min(3).max(50),
  password: z.string().min(8)  // Enforce minimum 8 characters
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[0-9]/, "Must contain at least one number"),
  role: z.enum(['admin', 'regular_user']).optional(),
});