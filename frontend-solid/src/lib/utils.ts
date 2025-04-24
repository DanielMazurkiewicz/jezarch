import { clsx, type ClassValue } from "clsx";

// Basic cn function using clsx (without twMerge)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Other potential utility functions can go here
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
};

export const formatDate = (dateInput: Date | string | number | undefined | null): string => { // Accept number for timestamps
    if (!dateInput) return "N/A";
    try {
        const date = new Date(dateInput);
        // Check if the date is valid
        if (isNaN(date.getTime())) {
            console.warn("formatDate received invalid date:", dateInput);
            return "Invalid Date";
        }
        // Format valid date (more detailed)
        return date.toLocaleString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            // timeZoneName: 'short' // Optional: Add timezone
        });
    } catch (e) {
        console.error("Error formatting date:", dateInput, e);
        return "Error";
    }
};