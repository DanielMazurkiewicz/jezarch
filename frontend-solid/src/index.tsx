// Removed the HMR directive /* @refresh reload */
import { render } from "solid-js/web";
// Router is now managed within App.tsx
import { NotificationProvider } from "@/context/NotificationContext"; // Import provider
import App from "./App";

// Import global CSS files
import "./styles/theme.css"; // CSS Variables theme file
import "./styles/global.css"; // Global styles

const root = document.getElementById("root");
if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    "Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?"
  );
}

render(
  () => (
    // Router wrapper removed, handled inside App component
    <NotificationProvider> {/* Wrap App with NotificationProvider */}
        <App />
    </NotificationProvider>
  ),
  root! // Use non-null assertion because of the dev check
);