import { userRoutes } from '../functionalities/user/routes';
import { noteRoutes } from '../functionalities/note/routes';
import { configRoutes } from '../functionalities/config/routes';
import { logRoutes } from '../functionalities/log/routes';
import { apiRoutes } from '../functionalities/api/routes';
import { tagRoutes } from '../functionalities/tag/routes';
import { signatureComponentRoutes } from '../functionalities/signature/component/routes';
import { signatureElementRoutes } from '../functionalities/signature/element/routes';
import { archiveDocumentRoutes } from '../functionalities/archive/document/routes';

// Removed incorrect import: import app from "../../../frontend/dist/index.html"


import { RouterTypes } from 'bun';

export type Routes = {
    [x: string]: RouterTypes.RouteValue<string>;
};

export const routes: Routes = {
    // API routes should come first to ensure they are matched before the static fallback
    ...apiRoutes,
    ...userRoutes,
    ...configRoutes,
    ...logRoutes,
    ...tagRoutes,
    ...signatureComponentRoutes,
    ...signatureElementRoutes,
    ...noteRoutes,
    ...archiveDocumentRoutes,
    // No need to explicitly define "/" route here if handled by static server logic
    // "/": app, // Removed this line
}