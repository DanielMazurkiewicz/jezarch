import { BunRequest, password } from 'bun';
import {
    createUser,
    getAllUsers, // This now includes assignedTags potentially
    getUserByLogin,
    getUserByUserId,
    updateUserPassword,
    updateUserRole,
    verifyPassword,
    adminSetUserPassword,
    getUserByLoginSafe,
    assignTagsToUser,
    getAssignedTagsForUser,
    updateUserPreferredLanguage, // Import new DB function
} from './db';
// Updated UserRole import, added schemas for password changes and language
import {
    User,
    UserCredentials,
    userSchema,
    UserRole,
    updateUserRoleSchema,
    changePasswordSchema, // Import change password schema
    setPasswordSchema, // Import set password schema
    updatePreferredLanguageSchema, // Import preferred language schema
    SupportedLanguage, // Import SupportedLanguage type
} from './models';
import { createSession, deleteSession } from '../session/db';
import { getSessionAndUser, isAllowedRole, isOwner } from '../session/controllers';
import { Log } from '../log/db';
import { z } from 'zod'; // Import z


export const createUserController = async (req: BunRequest) => {
    try {
        const sessionAndUser = await getSessionAndUser(req);
        if (!sessionAndUser) {
            return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
        if (!isAllowedRole(sessionAndUser, 'admin')) {
            return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await req.json();
        // Validate against userSchema (which includes password complexity and optional preferredLanguage)
        const validatedData = userSchema.parse(body);

        if (await getUserByLoginSafe(validatedData.login)) {
            return new Response(JSON.stringify({ message: "Username already exists" }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }

        // Backend decides default role (null). Pass preferredLanguage from validated data.
        await createUser(validatedData.login, validatedData.password, null, validatedData.preferredLanguage);
        await Log.info(`User created: ${validatedData.login} with lang ${validatedData.preferredLanguage} by admin ${sessionAndUser.user.login}`, sessionAndUser.user.login, 'user');

        const newUser = await getUserByLoginSafe(validatedData.login); // Fetches user without password

        return new Response(JSON.stringify(newUser), { status: 201, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        // Extract login for logging if sessionAndUser is available
        const actorLogin = (await getSessionAndUser(req))?.user?.login;
        await Log.error('Failed to create user', actorLogin, 'user', error);
        if (error instanceof z.ZodError) {
            return new Response(JSON.stringify({ message: 'Validation failed', errors: error.format() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        if (error.message?.includes('already exists')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 409, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ message: 'Failed to create user', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

// Updated to return users including assignedTags for 'user' role and preferredLanguage
export const getAllUsersController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        // getAllUsers from db now fetches assigned tags for 'user' roles and preferredLanguage
        const users = await getAllUsers();
        return new Response(JSON.stringify(users), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await Log.error('Failed to fetch users', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to get users' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const getUserByUserIdController = async (req: BunRequest<":userId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const targetUserId = parseInt(req.params.userId);
    if (isNaN(targetUserId)) {
        return new Response(JSON.stringify({ message: 'Invalid user ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }
    if (!isAllowedRole(sessionAndUser, 'admin') && !isOwner(sessionAndUser, targetUserId)) {
        return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // getUserByUserId now fetches assigned tags if role is 'user' and preferredLanguage
        const user = await getUserByUserId(targetUserId);
        if (!user) {
            await Log.warn(`User not found by ID: ${targetUserId}`, sessionAndUser.user.login, 'user');
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(user), { // Return user data (safe, includes tags if applicable, and language)
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await Log.error('Error fetching user by ID', sessionAndUser.user.login, 'user', { userId: req.params.userId, error });
        return new Response(JSON.stringify({ message: 'Failed to get user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const getUserByLoginController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const targetLogin = req.params.login;
    if (!isAllowedRole(sessionAndUser, 'admin') && sessionAndUser.user.login !== targetLogin) {
        return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        // getUserByLoginSafe now fetches assigned tags if role is 'user' and preferredLanguage
        const user = await getUserByLoginSafe(targetLogin);
        if (!user) {
            await Log.warn(`User not found by login: ${targetLogin}`, sessionAndUser.user.login, 'user');
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify(user), { // Return safe user data (includes tags if applicable, and language)
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error) {
        await Log.error('Error fetching user by login', sessionAndUser.user.login, 'user', { login: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to get user', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const updateUserRoleController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        const targetLogin = req.params.login;
        if (targetLogin === sessionAndUser.user.login) {
             await Log.warn(`Admin attempt to change own role blocked: ${targetLogin}`, sessionAndUser.user.login, 'user');
             return new Response(JSON.stringify({ message: 'Cannot change your own role' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await req.json() as { role: UserRole | null };
        const validation = updateUserRoleSchema.safeParse(body);
        if (!validation.success) {
             return new Response(JSON.stringify({ message: 'Invalid role specified', errors: validation.error.format() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const role = validation.data.role;

        const targetUser = await getUserByLoginSafe(targetLogin);
        if (!targetUser) {
             return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        // Clear assigned tags if changing role away from 'user'
        if (targetUser.role === 'user' && role !== 'user') {
            try {
                await assignTagsToUser(targetUser.userId, []);
                await Log.info(`Cleared assigned tags for user ${targetLogin} due to role change away from 'user'`, sessionAndUser.user.login, 'user');
            } catch (tagError: any) {
                await Log.error(`Failed to clear tags for user ${targetLogin} during role change`, sessionAndUser.user.login, 'user', tagError);
                // Decide if role change should proceed despite tag clearing failure
            }
        }

        await updateUserRole(targetLogin, role);
        await Log.info(`User role updated for ${targetLogin} to ${role === null ? 'NULL (disabled)' : role}`, sessionAndUser.user.login, 'user');
        return new Response(JSON.stringify({ message: 'User role updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        await Log.error('Error updating user role', sessionAndUser.user.login, 'user', { login: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to update user role', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

// --- NEW: Controller for Admin updating user's preferred language ---
// This also applies for a user updating their own language via the Header dropdown
export const updateUserPreferredLanguageController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });

    const targetLogin = req.params.login;

    // Check if user is admin OR if the user is updating their own language
    if (!isAllowedRole(sessionAndUser, 'admin') && sessionAndUser.user.login !== targetLogin) {
        await Log.warn(`Forbidden attempt to change language for ${targetLogin} by ${sessionAndUser.user.login}`, sessionAndUser.user.login, 'user');
        return new Response(JSON.stringify({ message: "Forbidden: You can only change your own language preference." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const body = await req.json() as { preferredLanguage: SupportedLanguage };
        const validation = updatePreferredLanguageSchema.safeParse(body);

        if (!validation.success) {
            return new Response(JSON.stringify({ message: 'Invalid language specified', errors: validation.error.format() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const { preferredLanguage } = validation.data;

        const targetUser = await getUserByLoginSafe(targetLogin);
        if (!targetUser) {
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        await updateUserPreferredLanguage(targetLogin, preferredLanguage);
        await Log.info(`User preferred language updated for ${targetLogin} to ${preferredLanguage} by ${sessionAndUser.user.login}`, sessionAndUser.user.login, 'user');

        // Fetch the updated user object (without password) to return
        const updatedUser = await getUserByLoginSafe(targetLogin);
        if (!updatedUser) {
             // This should ideally not happen if the update succeeded
             await Log.error(`Failed to fetch user ${targetLogin} after language update`, sessionAndUser.user.login, 'user');
             return new Response(JSON.stringify({ message: 'Language updated, but failed to fetch updated user details.' }), { status: 207, headers: { 'Content-Type': 'application/json' } }); // Multi-Status or similar
        }

        return new Response(JSON.stringify(updatedUser), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error: any) {
        await Log.error('Error updating user preferred language', sessionAndUser.user.login, 'user', { login: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to update user preferred language', error: error.message ?? String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};
// --- END NEW ---


// Controller for user changing their OWN password
export const updateUserPasswordController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    // Any logged-in user (admin, employee, user) can change their own password
    if (!isAllowedRole(sessionAndUser, 'admin', 'employee', 'user')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        const login = sessionAndUser.user.login;
        const body = await req.json();

        // Validate using changePasswordSchema
        const validation = changePasswordSchema.safeParse(body);
        if (!validation.success) {
             return new Response(JSON.stringify({ message: 'Validation failed', errors: validation.error.format() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const { oldPassword, password: newPassword } = validation.data;

        const isValid = await verifyPassword(login, oldPassword);
        if (!isValid) {
            await Log.warn('Invalid old password during password change attempt', sessionAndUser.user.login, 'auth');
            // Return specific error message for old password mismatch
            return new Response(JSON.stringify({ message: "Invalid current password", errors: { oldPassword: { _errors: ["Incorrect current password"]}}}), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        await updateUserPassword(login, newPassword);
        await Log.info('User password updated successfully', sessionAndUser.user.login, 'user');
        return new Response(null, { status: 204 });

    } catch (error) {
        await Log.error('Failed to update own password', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to update user password', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

// Controller for Admin setting ANY user's password
export const adminSetUserPasswordController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        const targetLogin = req.params.login;
        if (targetLogin === sessionAndUser.user.login) {
            await Log.warn(`Admin attempt to set own password via admin endpoint blocked: ${targetLogin}`, sessionAndUser.user.login, 'user');
            return new Response(JSON.stringify({ message: 'Cannot set your own password here. Use the change password feature.' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await req.json();
        // Validate using setPasswordSchema
        const validation = setPasswordSchema.safeParse(body);
        if (!validation.success) {
             return new Response(JSON.stringify({ message: 'New password does not meet complexity requirements.', errors: validation.error.format() }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        const newPassword = validation.data.password;

        const userExists = await getUserByLoginSafe(targetLogin);
        if (!userExists) {
            return new Response(JSON.stringify({ message: 'Target user not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        await adminSetUserPassword(targetLogin, newPassword);
        await Log.info(`Admin set password for user ${targetLogin}`, sessionAndUser.user.login, 'user');
        return new Response(null, { status: 204 });

    } catch (error) {
        await Log.error('Failed to admin-set user password', sessionAndUser.user.login, 'user', { targetLogin: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to set user password', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};


export const loginController = async (req: BunRequest) => {
    try {
        const body = await req.json() as UserCredentials;
        const { login, password } = body;

        if (!login || !password) {
            return new Response(JSON.stringify({ message: "Login and password are required" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const isValid = await verifyPassword(login, password);
        if (!isValid) {
            await Log.warn(`Invalid login attempt: ${login}`, login, 'auth', { login });
            return new Response(JSON.stringify({ message: "Invalid credentials" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        const user = await getUserByLogin(login); // Fetches user details including role, ID, preferredLanguage, and tags
        if (!user || user.userId === undefined) {
            await Log.error(`User data (incl. ID) not found after successful password verification: ${login}`, login, 'auth', { login });
            return new Response(JSON.stringify({ message: "Login failed due to internal inconsistency" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        if (user.role === null) {
             await Log.warn(`Login attempt by user with NULL role: ${login}`, login, 'auth', { login });
             return new Response(JSON.stringify({ message: "Account is disabled or has no assigned role." }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        const token = await createSession(user.userId);

        // Return user details WITHOUT password, but include assigned tags and preferredLanguage
        const { password: _pwd, ...userResponseData } = user;

        return new Response(JSON.stringify({
            token,
            ...userResponseData // Includes userId, login, role, assignedTags, preferredLanguage
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error) {
        await Log.error('Login error', undefined, 'auth', error);
        return new Response(JSON.stringify({ message: 'Failed to login', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const logoutController = async (req: BunRequest) => {
    try {
        const token = req.headers.get('Authorization');
        if (!token) {
            return new Response(JSON.stringify({ message: "Authorization token missing" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        await deleteSession(token);
        await Log.info('User session deleted successfully via logout', undefined, 'auth');
        return new Response(null, { status: 204 });
    } catch (error) {
        await Log.error('Logout failed', undefined, 'auth', error);
        return new Response(JSON.stringify({ message: "Internal server error during logout" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

// --- User Allowed Tags Controllers ---

export const getAssignedTagsForUserController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const targetLogin = req.params.login;
        const targetUser = await getUserByLoginSafe(targetLogin);
        if (!targetUser) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });

        if (targetUser.role !== 'user') {
             // Return empty array or maybe a specific message? Empty array is simpler for client.
             return new Response(JSON.stringify([]), { status: 200 });
        }

        // getAssignedTagsForUser already defined in db.ts
        const tags = await getAssignedTagsForUser(targetUser.userId);
        return new Response(JSON.stringify(tags), { status: 200 });

    } catch (error: any) {
        await Log.error(`Failed to get assigned tags for user ${req.params.login}`, sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to get assigned tags', error: error.message }), { status: 500 });
    }
};


export const assignTagsToUserController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const targetLogin = req.params.login;
        const targetUser = await getUserByLoginSafe(targetLogin);
        if (!targetUser) return new Response(JSON.stringify({ message: "User not found" }), { status: 404 });

        // assignTagsToUser DB function already checks role, no need to check here again

        const body = await req.json() as { tagIds: number[] };
        // Basic validation on tagIds array
        if (!Array.isArray(body.tagIds) || !body.tagIds.every(id => typeof id === 'number' && Number.isInteger(id) && id > 0)) {
            return new Response(JSON.stringify({ message: 'Invalid tagIds provided. Must be an array of positive integers.' }), { status: 400 });
        }
        const tagIds = body.tagIds;

        await assignTagsToUser(targetUser.userId, tagIds);
        await Log.info(`Admin assigned tags [${tagIds.join(',')}] to user ${targetLogin}`, sessionAndUser.user.login, 'user');

        const updatedTags = await getAssignedTagsForUser(targetUser.userId);
        return new Response(JSON.stringify(updatedTags), { status: 200 });

    } catch (error: any) {
         await Log.error(`Failed to assign tags to user ${req.params.login}`, sessionAndUser.user.login, 'user', error);
         // Check for specific error message from DB function
         if (error.message?.includes('Cannot assign tags to user')) {
            return new Response(JSON.stringify({ message: error.message }), { status: 400 });
         }
         return new Response(JSON.stringify({ message: 'Failed to assign tags', error: error.message }), { status: 500 });
    }
};