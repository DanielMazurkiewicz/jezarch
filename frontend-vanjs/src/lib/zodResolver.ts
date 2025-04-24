import { z, ZodError } from 'zod';

// Basic Zod resolver for VanJS state or plain objects
// Returns success status and formatted errors

type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: Partial<Record<keyof T, string>> };

export function zodResolver<T extends z.ZodTypeAny>(schema: T) {
    return (values: z.infer<T>): ValidationResult<z.infer<T>> => {
        try {
            const data = schema.parse(values);
            return { success: true, data };
        } catch (error) {
            if (error instanceof ZodError) {
                const errors: Partial<Record<keyof z.infer<T>, string>> = {};
                error.errors.forEach((err) => {
                    if (err.path.length > 0) {
                        // Assuming simple, non-nested paths for now
                        const field = err.path[0] as keyof z.infer<T>;
                        // Only store the first error per field
                        if (!errors[field]) {
                            errors[field] = err.message;
                        }
                    } else {
                        // Handle global errors if needed
                        console.warn("ZodResolver: Global error:", err.message);
                    }
                });
                return { success: false, errors };
            }
            // Re-throw unexpected errors
            throw error;
        }
    };
}