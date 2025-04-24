import { BunRequest, password } from 'bun';
import { createUser, getAllUsers, getUserByLogin, getUserByUserId, updateUserPassword, updateUserRole, verifyPassword } from './db';
import { User, UserCredentials, userSchema } from './models';
import { createSession, deleteSession } from '../session/db';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';


export const createUserController = async (req: BunRequest) => {
    try {
        const body = await req.json();
        const validatedData = userSchema.parse(body);

        // Check if user already exists
        if (await getUserByLogin(validatedData.login)) {
            return new Response("Username already exists", { status: 400 });
        }

        await createUser(validatedData.login, validatedData.password);
        return new Response(JSON.stringify({
            login: validatedData.login,
            message: 'User created successfully'
        }), { status: 201, headers: { 'Content-Type': 'application/json' } }); // Added Content-Type

    } catch (error) {
        await Log.error('Failed to create user', undefined, 'user', error);
        // Ensure error responses are also JSON
        return new Response(JSON.stringify({
            message: 'Failed to create user',
            // Optionally include error details in dev mode
            // error: error instanceof Error ? error.message : String(error)
        }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const getAllUsersController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } }); // Return JSON error
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } }); // Return JSON error

    try {
        const users = await getAllUsers();
        // Return users without password hash
        return new Response(JSON.stringify(users.map(u => ({ userId: u.userId, login: u.login, role: u.role }))), {
            status: 200,
            headers: { 'Content-Type': 'application/json' } // Added Content-Type
        });
    } catch (error) {
        await Log.error('Failed to fetch users', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to get users' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const getUserByUserIdController = async (req: BunRequest<":userId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        const userId = parseInt(req.params.userId);
         if (isNaN(userId)) {
             return new Response(JSON.stringify({ message: 'Invalid user ID' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
         }
        const user = await getUserByUserId(userId);
        if (!user) {
            await Log.warn(`User not found by ID: ${userId}`, sessionAndUser.user.login, 'user'); // Changed to warn
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ userId: user.userId, login: user.login, role: user.role }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' } // Added Content-Type
        });
    } catch (error) {
        await Log.error('Error fetching user by ID', sessionAndUser.user.login, 'user', { userId: req.params.userId, error });
        return new Response(JSON.stringify({ message: 'Failed to get user' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const getUserByLoginController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    // Allow regular users to get their own profile? Or admin only? Adjust as needed.
    if (!isAllowedRole(sessionAndUser, 'admin') && sessionAndUser.user.login !== req.params.login) {
        return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    try {
        const login = req.params.login;
        const user = await getUserByLogin(login);
        if (!user) {
            await Log.warn(`User not found by login: ${login}`, sessionAndUser.user.login, 'user'); // Changed to warn
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
        return new Response(JSON.stringify({ userId: user.userId, login: user.login, role: user.role }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' } // Added Content-Type
        });
    } catch (error) {
        await Log.error('Error fetching user by login', sessionAndUser.user.login, 'user', { login: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to get user', error: error }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const updateUserRoleController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });


    try {
        const login = req.params.login;
        // Prevent admin from changing their own role
        if (login === sessionAndUser.user.login) {
             await Log.warn(`Admin attempt to change own role blocked: ${login}`, sessionAndUser.user.login, 'user');
             return new Response(JSON.stringify({ message: 'Cannot change your own role' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const body = await req.json() as Pick<User, "role">;
        const role = body.role;
        // Validate role
        if (role !== 'admin' && role !== 'regular_user') {
             return new Response(JSON.stringify({ message: 'Invalid role specified' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const userExists = await getUserByLogin(login);
        if (!userExists) {
             return new Response(JSON.stringify({ message: 'User not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }

        await updateUserRole(login, role);
        await Log.info(`User role updated for ${login} to ${role}`, sessionAndUser.user.login, 'user');
        return new Response(JSON.stringify({ message: 'User role updated successfully' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } catch (error) {
        await Log.error('Error updating user role', sessionAndUser.user.login, 'user', { login: req.params.login, error });
        return new Response(JSON.stringify({ message: 'Failed to update user role' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const updateUserPasswordController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response(JSON.stringify({ message: "Unauthorized" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    // Any logged-in user can change their own password
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response(JSON.stringify({ message: "Forbidden" }), { status: 403, headers: { 'Content-Type': 'application/json' } });

    try {
        const login = sessionAndUser.user.login; // User changes their own password
        const body = await req.json() as { password: string, oldPassword: string };
        const newPassword = body.password;
        const oldPassword = body.oldPassword;

        // Basic validation
        if (!newPassword || !oldPassword || typeof newPassword !== 'string' || typeof oldPassword !== 'string' || newPassword.length < 8) {
             return new Response(JSON.stringify({ message: 'Invalid input: Old password required, new password must be at least 8 characters' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const isValid = await verifyPassword(login, oldPassword);
        if (!isValid) {
            await Log.warn('Invalid old password during password change attempt', sessionAndUser.user.login, 'auth');
            return new Response(JSON.stringify({ message: "Invalid current password" }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        await updateUserPassword(login, newPassword);
        await Log.info('User password updated successfully', sessionAndUser.user.login, 'user');
        // Return 204 No Content on success for password change
        return new Response(null, { status: 204 });

    } catch (error) {
        await Log.error('Failed to update password', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to update user password' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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

        const user = await getUserByLogin(login);
        if (!user) {
            await Log.error(`User data not found after successful password verification: ${login}`, login, 'auth', { login });
            return new Response(JSON.stringify({ message: "Login failed due to internal inconsistency" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }
        const token = await createSession(user.userId);

        // *** FIX: Added Content-Type header ***
        return new Response(JSON.stringify({
            token,
            role: user.role || null,
            login: user.login,
            userId: user.userId
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' } // Set Content-Type
        });
        // *************************************

    } catch (error) {
        await Log.error('Login error', undefined, 'auth', error);
        return new Response(JSON.stringify({ message: 'Failed to login', error: error instanceof Error ? error.message : String(error) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};

export const logoutController = async (req: BunRequest) => {
    try {
        const token = req.headers.get('Authorization');
        if (!token) {
            // No need to log error if token simply isn't present
            return new Response(JSON.stringify({ message: "Authorization token missing" }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }
        await deleteSession(token);
        await Log.info('User session deleted successfully via logout', undefined, 'auth');
        // Send 204 No Content on successful logout
        return new Response(null, { status: 204 });
    } catch (error) {
        await Log.error('Logout failed', undefined, 'auth', error);
        return new Response(JSON.stringify({ message: "Internal server error during logout" }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
};