// Added getAssignedTagsForUserController, assignTagsToUserController
// Added updateUserPreferredLanguageController
import {
    createUserController,
    getAllUsersController,
    getUserByLoginController,
    loginController,
    logoutController,
    updateUserPasswordController,
    updateUserRoleController,
    adminSetUserPasswordController,
    getAssignedTagsForUserController, // New import
    assignTagsToUserController,       // New import
    updateUserPreferredLanguageController, // New import
} from './controllers';

export const userRoutes = {
    // List all users (Admin only)
    '/api/users/all': {
        GET: getAllUsersController,
    },
    // Get/Update specific user by login
    '/api/user/by-login/:login': {
        GET: getUserByLoginController,    // Admin or self
        PATCH: updateUserRoleController, // Admin only (cannot change self)
    },
    // Admin set password for a user
    '/api/user/by-login/:login/set-password': {
        PATCH: adminSetUserPasswordController, // Admin only (cannot set self)
    },
    // --- NEW: Admin set preferred language for a user ---
    '/api/user/by-login/:login/language': {
        PATCH: updateUserPreferredLanguageController, // Admin only
    },
    // --- END NEW ---
    // --- New routes for User Tag Assignment (Admin only) ---
    '/api/user/by-login/:login/tags': {
        GET: getAssignedTagsForUserController, // Get tags assigned to a 'user' role user
        PUT: assignTagsToUserController,       // Set/Replace tags assigned to a 'user' role user
    },
    // --- End New Routes ---
    // User changes their own password
    '/api/user/change-password': {
        POST: updateUserPasswordController // Authenticated users
    },
    // User Registration
    '/api/user/create': {
        POST: createUserController
    },
    // Login
    '/api/user/login': {
        POST: loginController
    },
    // Logout
    '/api/user/logout': {
        POST: logoutController
    },
};