import { z, ZodError, type ZodSchema } from 'zod';

type ValidationResult<T> =
    | { success: true; data: T }
    | { success: false; errors: Record<string, string[]> }; // Map field names to error messages

/**
 * Validates form data against a Zod schema.
 *
 * @param schema The Zod schema to validate against.
 * @param data The form data object.
 * @returns ValidationResult object.
 */
export function validateForm<T>(schema: ZodSchema<T>, data: unknown): ValidationResult<T> {
    try {
        const validatedData = schema.parse(data);
        return { success: true, data: validatedData };
    } catch (error) {
        if (error instanceof ZodError) {
            const fieldErrors: Record<string, string[]> = {};
            error.errors.forEach(err => {
                // Use only the first path element as the field name for simple forms
                const path = err.path[0] as string; // Assume simple path for form fields
                if (path) { // Ensure path exists
                    if (!fieldErrors[path]) {
                        fieldErrors[path] = [];
                    }
                    fieldErrors[path].push(err.message);
                } else {
                    // Handle top-level form errors (e.g., from refine)
                    if (!fieldErrors['_form']) fieldErrors['_form'] = [];
                    fieldErrors['_form'].push(err.message);
                }
            });
            console.warn("Form validation failed:", fieldErrors);
            return { success: false, errors: fieldErrors };
        }
        // Handle unexpected errors
        console.error("Unexpected validation error:", error);
        return { success: false, errors: { _form: ["An unexpected validation error occurred."] } };
    }
}

/**
 * Updates the UI to display validation errors next to form fields.
 * Assumes error elements have an ID like `field-name-error`.
 * Assumes input elements have an ID matching the field name.
 *
 * @param errors The error object from `validateForm`.
 * @param parentElement The container element (usually shadowRoot or a form element) where fields and error messages reside.
 */
export function displayValidationErrors(errors: Record<string, string[]>, parentElement: ShadowRoot | HTMLElement): void {
    // Clear previous errors first
    clearValidationErrors(parentElement);

    for (const field in errors) {
        const errorMessages = errors[field];
        if (!errorMessages) continue; // Skip if no messages for this field

        if (field === '_form') { // Handle general form errors
            const formErrorElement = parentElement.querySelector<HTMLElement>(`#form-error`); // Assuming a general error display element
            if (formErrorElement) {
                // Use 'message' property if it's an ErrorDisplay component
                if ('message' in formErrorElement && typeof (formErrorElement as any).message === 'string') {
                    (formErrorElement as any).message = errorMessages.join(', ');
                } else {
                    formErrorElement.textContent = errorMessages.join(', ');
                }
                // Use 'hidden' property if it's an ErrorDisplay component
                if ('hidden' in formErrorElement && typeof (formErrorElement as any).hidden === 'boolean') {
                    (formErrorElement as any).hidden = false;
                } else {
                    // FIX: Check if it's an HTMLElement before accessing style/attributes
                     if (formErrorElement instanceof HTMLElement) {
                        formErrorElement.style.display = 'block'; // Or flex, etc.
                        formErrorElement.removeAttribute('hidden');
                     }
                }
            }
            continue;
        }

        const errorSpan = parentElement.querySelector<HTMLSpanElement>(`#${field}-error`);
        if (errorSpan) {
            errorSpan.textContent = errorMessages.join(', ');
            // Use data attribute or class to control visibility via CSS
            errorSpan.dataset.visible = "true";
            errorSpan.style.display = 'block'; // Ensure display is correct if using style attribute
        } else {
            console.warn(`No error element found for field: ${field} (expected #${field}-error)`);
        }

        // Add aria-invalid to the input field
        const inputElement = parentElement.querySelector<HTMLElement>(`#${field}`); // Query by ID
        inputElement?.setAttribute('aria-invalid', 'true');
    }
}

/**
 * Clears previously displayed validation errors.
 *
 * @param parentElement The container element.
 */
export function clearValidationErrors(parentElement: ShadowRoot | HTMLElement): void {
     // Clear general form error
     const formErrorElement = parentElement.querySelector<HTMLElement>(`#form-error`);
     if (formErrorElement) {
         // Use 'message' property if it's an ErrorDisplay component
         if ('message' in formErrorElement && typeof (formErrorElement as any).message === 'string') {
             (formErrorElement as any).message = '';
         } else {
             formErrorElement.textContent = '';
         }
          // Use 'hidden' property if it's an ErrorDisplay component
          if ('hidden' in formErrorElement && typeof (formErrorElement as any).hidden === 'boolean') {
             (formErrorElement as any).hidden = true;
         } else {
              // FIX: Check if it's an HTMLElement before accessing style/attributes
              if (formErrorElement instanceof HTMLElement) {
                 formErrorElement.style.display = 'none';
                 formErrorElement.setAttribute('hidden', '');
              }
         }
     }
     // Clear field-specific errors
    parentElement.querySelectorAll<HTMLSpanElement>('.error-message').forEach(span => {
        span.textContent = '';
        // Reset visibility control
        delete span.dataset.visible;
        span.style.display = 'none'; // Ensure it's hidden if using style attribute
    });
    // Remove aria-invalid attribute
    parentElement.querySelectorAll<HTMLElement>('[aria-invalid="true"]').forEach(input => {
        input.removeAttribute('aria-invalid');
    });
}