import van from "vanjs-core";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/Alert"; // Use Alert component, added AlertTitle
import * as icons from "@/components/ui/icons"; // Import icons
import { style } from "@vanilla-extract/css";
import * as styles from "@/styles/utils.css"; // Import utils for size styles if needed

const { span } = van.tags;

// --- Styles ---
// Optional: Add specific styles if default Alert isn't enough
const errorDisplayIconStyle = style([styles.h4, styles.w4, { // Explicitly set size (h-4, w-4)
   // Example: Tweak icon size or alignment if needed
   // marginTop: '1px', // Adjust alignment if needed
}]);

// --- Component ---
interface ErrorDisplayProps {
    message: string | null;
    title?: string; // Optional title
    class?: string; // Allow passing additional classes to the Alert container
}

const ErrorDisplay = ({ message, title, class: className = '' }: ErrorDisplayProps) => {
    // Don't render if message is null or empty
    if (!message) {
        return null;
    }

    // Render the Alert component with destructive variant
    return Alert({ variant: "destructive", class: className },
        // Pass the icon as a child
        icons.AlertCircleIcon({ class: errorDisplayIconStyle }), // Use icon component with styles
        // Conditionally render title
        title ? AlertTitle(title) : null,
        // Use AlertDescription for the message content
        AlertDescription(message)
    );
};

export default ErrorDisplay;