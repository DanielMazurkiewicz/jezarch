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
        }), { status: 201 });

    } catch (error) {
        await Log.error('Failed to create user', undefined, 'user', error);
        return new Response(JSON.stringify({
            message: 'Failed to create user',
        }), { status: 500 });
    }
};

export const getAllUsersController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const users = await getAllUsers();
        return new Response(JSON.stringify(users.map(u => ({ ...u, password: "" }))), { status: 200 });
    } catch (error) {
        await Log.error('Failed to fetch users', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to get users' }), { status: 500 });
    }
};

export const getUserByUserIdController = async (req: BunRequest<":userId">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });


    try {
        const userId = parseInt(req.params.userId);
        const user = await getUserByUserId(userId);
        if (!user) {
            await Log.error(`User not found`, sessionAndUser.user.login, 'user', { userId });
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
        }
        return new Response(JSON.stringify({ ...user, password: "" }), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching user by ID', sessionAndUser.user.login, 'user', { error });
        return new Response(JSON.stringify({ message: 'Failed to get user' }), { status: 500 });
    }
};

export const getUserByLoginController = async (req: BunRequest<":login">) => {

    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const login = req.params.login;
        const user = await getUserByLogin(login);
        if (!user) {
            await Log.error(`User not found: ${login}`, sessionAndUser.user.login, 'user');
            return new Response(JSON.stringify({ message: 'User not found' }), { status: 404 });
        }
        return new Response(JSON.stringify({ ...user, password: "" }), { status: 200 });
    } catch (error) {
        await Log.error('Error fetching user by login', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to get user', error: error }), { status: 500 });
    }
};

export const updateUserRoleController = async (req: BunRequest<":login">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });


    try {
        const login = req.params.login;
        const body = await req.json() as Pick<User, "role">;
        const role = body.role as 'admin' | 'regular_user'; // Type assertion
        await updateUserRole(login, role);
        return new Response(JSON.stringify({ message: 'User role updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Error updating user role', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to update user role' }), { status: 500 });
    }
};

export const updateUserPasswordController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin', 'regular_user')) return new Response("Forbidden", { status: 403 });

    try {
        const login = sessionAndUser.user.login
        const body = await req.json() as { password: string, oldPassword: string };
        const newPassword = body.password as string; // TODO: validation
        const oldPassword = body.oldPassword as string; // TODO: validation

        const isValid = await verifyPassword(login, oldPassword);
        if (!isValid) {
            await Log.error('Invalid old password', sessionAndUser.user.login, 'auth');
            return new Response("Invalid password", { status: 401 });
        }
        await updateUserPassword(login, newPassword);
        return new Response(JSON.stringify({ message: 'User role updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Failed to update password', sessionAndUser.user.login, 'user', error);
        return new Response(JSON.stringify({ message: 'Failed to update user password', error: error }), { status: 500 });
    }
};

export const loginController = async (req: BunRequest) => {
    try {
        const body = await req.json() as UserCredentials;
        const { login, password } = body;
        // ... validation ...
        const isValid = await verifyPassword(login, password);
        if (!isValid) {
            await Log.error(`Invalid login attempt: ${login}`, login, 'auth', { login });
            return new Response("Invalid credentials", { status: 401 });
        }

        const user = await getUserByLogin(login);
        if (!user) {
            await Log.error(`Login doesn't exist: ${login}`, login, 'auth', { login });
            return new Response("Login doesn't exist", { status: 500 });
        }
        const token = await createSession(
            user.userId
        );
        return new Response(JSON.stringify({ token, role: user.role || null, login }), { status: 200 });
    } catch (error) {
        await Log.error('Login error', undefined, 'auth', error);
        return new Response(JSON.stringify({ message: 'Failed to login', error: error }), { status: 500 });
    }
};

export const logoutController = async (req: BunRequest) => {
    try {
        const token = req.headers.get('Authorization');
        if (!token) {
            await Log.error('Missing auth token', undefined, 'auth');
            return new Response("Bad Request", { status: 400 });
        }
        await deleteSession(token);
        return new Response("Logged out", { status: 200 });
    } catch (error) {
        await Log.error('Logout failed', undefined, 'auth', error);
        return new Response("Internal server error", { status: 500 });
    }
};