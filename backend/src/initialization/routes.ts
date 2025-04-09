import { userRoutes } from '../functionalities/user/routes';
import { noteRoutes } from '../functionalities/note/routes';
import { configRoutes } from '../functionalities/config/routes';
import { logRoutes } from '../functionalities/log/routes';
import { apiRoutes } from '../functionalities/api/routes';
import { tagRoutes } from '../functionalities/tag/routes';
import { signatureComponentRoutes } from '../functionalities/signature/component/routes';
import { signatureElementRoutes } from '../functionalities/signature/element/routes';
import { archiveDocumentRoutes } from '../functionalities/archive/document/routes';


// import app from "../../../frontend/dist/index.html"
import app from "../../../frontend/src/index.html"


import { RouterTypes } from 'bun';

export type Routes = {
    [x: string]: RouterTypes.RouteValue<string>;
};

export const routes: Routes = {
    ...apiRoutes,
    ...userRoutes,
    ...configRoutes,
    ...logRoutes,
    ...tagRoutes,
    ...signatureComponentRoutes,
    ...signatureElementRoutes,
    ...noteRoutes,
    ...archiveDocumentRoutes,
    "/": app,

}