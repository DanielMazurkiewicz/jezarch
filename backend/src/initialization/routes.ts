import { userRoutes } from '../functionalities/user/routes';
import { noteRoutes } from '../functionalities/note/routes';
import { configRoutes } from '../functionalities/config/routes';
import { logRoutes } from '../functionalities/log/routes';
import { apiRoutes } from '../functionalities/api/routes';
import { tagRoutes } from '../functionalities/tag/routes';
import { signatureComponentRoutes } from '../functionalities/signature/component/routes';
import { signatureElementRoutes } from '../functionalities/signature/element/routes';
import { archiveDocumentRoutes } from '../functionalities/archive/document/routes';
// --- NEW: Import admin DB routes ---
import { adminDbRoutes } from '../functionalities/admin_db/routes';


import { RouterTypes } from 'bun';

export type Routes = {
    [x: string]: RouterTypes.RouteValue<string>;
};

// Ensure userRoutes includes the new tag assignment routes
export const routes: Routes = {
    // API routes should come first to ensure they are matched before the static fallback
    ...apiRoutes,
    ...userRoutes, // Includes the new /api/user/by-login/:login/tags routes
    ...configRoutes,
    ...logRoutes,
    ...tagRoutes,
    ...signatureComponentRoutes,
    ...signatureElementRoutes,
    ...noteRoutes,
    ...archiveDocumentRoutes,
    // --- NEW: Add admin DB routes ---
    ...adminDbRoutes,
    // No need to explicitly define "/" route here if handled by static server logic
}