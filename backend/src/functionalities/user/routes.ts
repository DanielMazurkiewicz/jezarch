import { createUserController, getAllUsersController,  getUserByLoginController,  loginController, logoutController, updateUserPasswordController, updateUserRoleController } from './controllers';

export const userRoutes = {
    '/api/users/all': {
        GET: getAllUsersController,
    },
    '/api/user/by-login/:login': {
        GET: getUserByLoginController,
        PATCH: updateUserRoleController,
    },
    '/api/user/change-password': {
        POST: updateUserPasswordController
    },
    '/api/user/create': {
        POST: createUserController
    },
    '/api/user/login': {
        POST: loginController
    },
    '/api/user/logout': {
        POST: logoutController
    },
};