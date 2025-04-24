// --- Core Libraries & Setup ---
import './styles/global.css';
import './styles/theme.css';
import { Router } from './lib/router';
import { authService } from './lib/auth-service'; // Import instance
import { showToast } from './components/ui/toast-handler';

// --- Web Components ---
// Shared UI
import './components/ui/app-button';
import './components/ui/app-input';
import './components/ui/app-checkbox';
import './components/ui/app-label';
import './components/ui/app-dialog';
import './components/ui/app-card';
import './components/ui/toast-handler';
import './components/ui/loading-spinner';
import './components/ui/error-display';
import './components/ui/app-badge';
import './components/ui/app-select';
import './components/ui/app-textarea';
import './components/ui/app-popover';
import './components/ui/app-command';
import './components/ui/app-toggle-group';
import './components/ui/app-pagination';
// Shared Functionality
import './components/shared/theme-toggle';
import './components/shared/auth-guard';
import './components/shared/main-layout';
import './components/shared/tag-selector';
// Corrected export name usage
import './components/shared/element-selector'; // Defines element-selector
import './components/shared/parent-element-selector'; // Defines parent-element-selector
import './components/shared/signature-selector';
import './components/shared/search-bar';
// Specific Feature Components (Notes, Admin, Signatures, Archive)
import './components/notes/note-editor';
import './components/notes/note-list';
import './components/notes/note-preview-dialog';
import './components/admin/tag-manager';
import './components/admin/user-management';
import './components/signatures/component-list';
import './components/signatures/component-form';
import './components/signatures/element-list';
import './components/signatures/element-form';
import './components/archive/document-list';
import './components/archive/document-form';
import './components/archive/document-preview-dialog';
import './components/shared/element-browser-popover-content'; // Dependency for signature/archive

// --- Pages ---
import './components/pages/login-page';
import './components/pages/register-page';
import './components/pages/home-page';
import './components/pages/admin-page';
import './components/pages/notes/notes-page';
import './components/pages/signatures/components-page';
import './components/pages/elements-page';
import './components/pages/archive/archive-page';
import './components/pages/not-found-page'; // 404 page

// --- Initialize Router ---
// Pass authService instance to Router constructor
const router = new Router(document.getElementById('app-root') as HTMLElement, { authService });
// Export router AND authService instance for global use
export { router, authService };

// --- Define Routes ---
router
    .addRoute('/', 'home-page')
    .addRoute('/login', 'login-page')
    .addRoute('/register', 'register-page')
    .addRoute('/admin', 'admin-page', true) // Requires admin
    .addRoute('/notes', 'notes-page', false, true) // Requires auth
    .addRoute('/signatures', 'components-page', false, true) // Requires auth
    .addRoute('/signatures/components/:componentid/elements', 'elements-page', false, true) // Requires auth
    .addRoute('/archive', 'archive-page', false, true) // Requires auth
    // Add more routes as needed
    .setNotFound('not-found-page') // Set 404 page
    .listen(); // Start listening for route changes

// --- Global Error Handling ---
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled Promise Rejection:', event.reason);
    showToast(`An unexpected error occurred: ${event.reason?.message || 'Unknown error'}`, 'error');
});

window.addEventListener('error', (event) => {
    console.error('Unhandled Error:', event.error);
     // Avoid flooding toasts for minor errors, focus on critical ones if possible
     if (event.error instanceof Error) { // Check if it's a real error object
         showToast(`An unexpected error occurred: ${event.error.message}`, 'error');
     } else {
         showToast('An unexpected error occurred.', 'error');
     }
});


// --- Initial Authentication Check ---
// We need to wait for the auth service to initialize before starting the router
// to ensure guards have the correct initial state.
async function initializeApp() {
    try {
        await authService.ensureInitialized();
        console.log("Auth Service Initialized. Starting Router.");
        router.navigateTo(window.location.pathname + window.location.search); // Navigate to initial URL after auth check
    } catch (error) {
        console.error("Failed to initialize auth service:", error);
        showToast("Application initialization failed. Please refresh.", "error");
        // Potentially show a static error message in the UI
    }
}

// Delay initial navigation until auth is ready
initializeApp();


console.log('App initialized');