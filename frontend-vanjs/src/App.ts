import van, { State } from "vanjs-core"; // Added State import
import { Router, navigate, useLocation } from "@/lib/router";
import { authStore } from "@/state/authStore";
import Layout from "@/components/Layout/Layout";
import LoginForm from "@/components/Auth/LoginForm";
import RegisterForm from "@/components/Auth/RegisterForm";
import LoadingSpinner from "@/components/Shared/LoadingSpinner";
// Import Page Components
// Removed DashboardPage import as it's defined below
import NotesPage from "@/components/Notes/NotesPage";
import TagsPage from "@/components/Tags/TagsPage";
import ComponentsPage from "@/components/Signatures/ComponentsPage";
import ElementsPage from "@/components/Signatures/ElementsPage";
import ArchivePage from "@/components/Archive/ArchivePage";
import AdminPage from "@/components/Admin/AdminPage";
// Import Toaster - Assuming a VanJS compatible Toaster implementation exists
// import { Toaster } from "@/components/ui/Toaster";
import * as styles from "@/styles/utils.css";
import { style } from "@vanilla-extract/css";

const { div, h1, p } = van.tags; // Added h1, p

// --- Styles ---
const fullScreenCenter = style([styles.flex, styles.justifyCenter, styles.itemsCenter, styles.minHScreen, styles.wFull, styles.bgMuted]);
const authContainerStyle = style([styles.flex, styles.justifyCenter, styles.itemsCenter, styles.minHScreen, styles.wFull, styles.bgMuted, styles.p4]);

// --- Placeholder Pages/Wrappers ---
const NotFoundPage = () => div({ class: styles.p6 }, h1("404 - Page Not Found"));

// --- Protected Route Logic ---
interface ProtectedRouteProps {
    allowedRoles?: string[];
    children: () => (HTMLElement | State<HTMLElement | null> | null); // Function that returns the element/state to render
}
const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps): State<HTMLElement | null> => {
    const { isAuthenticated, isLoading, user } = authStore;

    // This derived state handles the logic and returns the appropriate element or null
    return van.derive(() => {
        if (isLoading.val) {
            return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' }));
        }
        if (!isAuthenticated.val) {
             // Use requestAnimationFrame to avoid navigating during render derivation
             requestAnimationFrame(() => navigate('/login', { replace: true, state: { from: window.location.pathname } }));
            return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show spinner while redirecting
        }
        if (allowedRoles && allowedRoles.length > 0) {
            const userRole = user.val?.role;
            if (!userRole || !allowedRoles.includes(userRole)) {
                 requestAnimationFrame(() => navigate('/', { replace: true }));
                 return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show spinner while redirecting
            }
        }
        // Execute the children function which might return an HTMLElement or State<HTMLElement>
        const childContent = children();
         // Check if the result is a state and return it directly if so
        if (typeof childContent === 'object' && childContent !== null && 'val' in childContent && 'oldVal' in childContent) {
            return childContent as State<HTMLElement | null>; // Router needs to handle state results
        }
        // Otherwise, wrap the direct HTMLElement result (or null) in a state
        // Although this shouldn't happen if children() always returns a state or null/element directly
        // return van.state(childContent as HTMLElement | null); // Cast might be needed
        return childContent as HTMLElement | null; // Let Router handle direct element
    });
};


// --- App Component Definition ---
const App = () => {
    const { isAuthenticated, isLoading } = authStore;

    const routes = [
        // --- Auth Routes ---
        { path: "/login", component: () => {
            // Use derive for reactive rendering based on auth state
            return van.derive(() => {
                if (isLoading.val) {
                    return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show loading
                }
                if (isAuthenticated.val) {
                    requestAnimationFrame(() => navigate('/', { replace: true })); // Redirect if logged in
                    return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show spinner while redirecting
                }
                // Render login form if not loading and not authenticated
                return div({ class: authContainerStyle }, LoginForm({ onSwitchToRegister: () => navigate('/register', { replace: true }) }));
            });
        }},
        { path: "/register", component: () => {
             // Use derive for reactive rendering based on auth state
             return van.derive(() => {
                if (isLoading.val) {
                    return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show loading
                }
                 if (isAuthenticated.val) {
                     requestAnimationFrame(() => navigate('/', { replace: true })); // Redirect if logged in
                     return div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' })); // Show spinner while redirecting
                 }
                // Render register form if not loading and not authenticated
                return div({ class: authContainerStyle }, RegisterForm({ onSwitchToLogin: () => navigate('/login', { replace: true }) }));
            });
        }},

        // --- Protected Routes (Wrap content with Layout and ProtectedRoute) ---
        // The component now directly returns the result of ProtectedRoute (which is a State)
        { path: "/", component: () => ProtectedRoute({ children: () => Layout(DashboardPage()) }) },
        { path: "/notes", component: () => ProtectedRoute({ children: () => Layout(NotesPage()) }) },
        { path: "/tags", component: () => ProtectedRoute({ children: () => Layout(TagsPage()) }) },
        { path: "/signatures", component: () => ProtectedRoute({ children: () => Layout(ComponentsPage()) }) },
        { path: "/signatures/:componentId/elements", component: () => ProtectedRoute({ children: () => Layout(ElementsPage()) }) },
        { path: "/archive", component: () => ProtectedRoute({ children: () => Layout(ArchivePage()) }) },
        // Admin Route
        { path: "/admin", component: () => ProtectedRoute({ allowedRoles: ['admin'], children: () => Layout(AdminPage()) }) },

        // Add other protected routes...
    ];

    // --- Main Render Logic ---
    return div( // Outer div for potential Toaster placement
        () => isLoading.val
            ? div({ class: fullScreenCenter }, LoadingSpinner({ size: 'lg' }))
            : Router({ routes, notFoundComponent: () => Layout(NotFoundPage()) }), // Pass Layout to NotFound too
        // Toaster() // Render toaster outside the router potentially
    );
};

export default App;

// Simple Dashboard Component (moved here for brevity)
//const { h1, p } = van.tags; // Already defined above
const DashboardPage = () => {
    const { user } = authStore;
    return div({ class: styles.spaceY4 },
        h1({ class: styles.text2xl }, () => `Welcome, ${user.val?.login || 'User'}!`),
        p({ class: styles.textMutedForeground }, "Select a section from the sidebar to get started.")
    );
};