// General utility functions - ADDING debounce

/** Formats bytes into a human-readable string (KB, MB, GB). */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }
    return `${size.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
}

/** Formats a date object or string into a localized date string. */
export function formatDate(dateInput: Date | string | number | undefined | null): string { // Allow number timestamp
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid Date";
        // Adjust options as needed
        return date.toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Error";
    }
}

/** Formats a date object or string into a localized date-time string. */
export function formatDateTime(dateInput: Date | string | number | undefined | null): string { // Allow number timestamp
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        if (isNaN(date.getTime())) return "Invalid Date";
        // Adjust options as needed
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    } catch (e) {
        console.error("Error formatting date/time:", dateInput, e);
        return "Error";
    }
}

/** Escapes HTML characters to prevent XSS. */
export function escapeHtml(unsafe: string): string {
    if (!unsafe) return "";
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


/** Debounce function */
export function debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
): (...args: Parameters<T>) => void {
    let timeout: ReturnType<typeof setTimeout> | null = null; // Ensure timeout type is correct
    return function executedFunction(...args: Parameters<T>) {
        const later = () => {
            timeout = null;
            func(...args);
        };
        if (timeout !== null) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(later, wait);
    };
}

/** Creates an HTMLElement with specified tag, classes, and attributes. */
export function createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    options?: {
        classes?: string | string[],
        attributes?: Record<string, string>,
        text?: string,
        html?: string,
        children?: (Node | string)[]
    }
): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (options?.classes) {
        const classesToAdd = Array.isArray(options.classes) ? options.classes : options.classes.split(' ');
        el.classList.add(...classesToAdd.filter(Boolean)); // Filter out empty strings
    }
    if (options?.attributes) {
        for (const key in options.attributes) {
            const value = options.attributes[key];
            if (value !== undefined && value !== null) { // Ensure value is set before setting attribute
                 el.setAttribute(key, value);
            }
        }
    }
    if (options?.text) {
        el.textContent = options.text;
    } else if (options?.html) {
        el.innerHTML = options.html; // Be careful with untrusted HTML
    }
    if (options?.children) {
        el.append(...options.children);
    }
    return el;
}


/** Type guard to check if an object is an instance of HTMLElement */
export function isHTMLElement(element: any): element is HTMLElement {
    return element instanceof HTMLElement;
}

/**
 * Simple helper for querySelector within a ShadowRoot or HTMLElement.
 * Throws error if element not found. Use `qsOptional` for optional elements.
 */
export function qs<E extends Element = Element>( // Generic Element type
    selector: string,
    parent: ShadowRoot | Element = document.body // Parent can be Element
): E {
    const element = parent.querySelector<E>(selector);
    if (!element) {
        const parentTag = parent instanceof Element ? parent.tagName : 'ShadowRoot';
        throw new Error(`Element not found for selector: ${selector} in parent ${parentTag}`);
    }
    return element;
}

/** Optional querySelector, returns null if not found. */
export function qsOptional<E extends Element = Element>( // Generic Element type
    selector: string,
    parent: ShadowRoot | Element = document.body // Parent can be Element
): E | null {
    return parent.querySelector<E>(selector);
}

/** querySelectorAll helper */
export function qsa<E extends Element = Element>( // Generic Element type
    selector: string,
    parent: ShadowRoot | Element = document.body // Parent can be Element
): NodeListOf<E> {
    return parent.querySelectorAll<E>(selector);
}