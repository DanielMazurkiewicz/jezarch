import { userRoutes } from '../functionalities/user/routes';
import { noteRoutes } from '../functionalities/note/routes';
import { configRoutes } from '../functionalities/config/routes';
import { logRoutes } from '../functionalities/log/routes';
import { apiRoutes } from '../functionalities/api/routes';
import { tagRoutes } from '../functionalities/tag/routes';
import { signatureComponentRoutes } from '../functionalities/signature/component/routes';
import { signatureElementRoutes } from '../functionalities/signature/element/routes';


export const routes = {
    ...apiRoutes,
    ...userRoutes,
    ...noteRoutes,
    ...configRoutes,
    ...logRoutes,
    ...tagRoutes,
    ...signatureComponentRoutes,
    ...signatureElementRoutes,
};