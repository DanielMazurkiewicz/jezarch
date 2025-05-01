import { getSessionByToken } from './db';
import { getUserByUserId } from '../user/db';
import { SessionAndUser } from './models';
import { BunRequest } from 'bun';
import { UserRole } from '../user/models'; // UserRole now includes 'employee' and 'user'

export async function getSessionAndUser(req: BunRequest): Promise<undefined | SessionAndUser> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return;

    const session = await getSessionByToken(authHeader);
    if (!session) return;

    const user = await getUserByUserId(session.userId);
    // User might be undefined if deleted but session lingers, or if role is null
    if (!user) return;

    // IMPORTANT: Check if user role is null. If so, treat as unauthorized/invalid session.
    // Users with null role should not be able to perform actions requiring roles.
    if (user.role === null) {
        // Optionally: Log this occurrence
        // Log.warn(`Session token presented for user with NULL role: ${user.login}`, user.login, 'auth');
        // Optionally: Delete the invalid session?
        // await deleteSession(authHeader);
        return; // Return undefined, effectively denying access
    }

    return {
        user, session
    }
}


export function isAllowedRole(sessionAndUser: SessionAndUser, ...roles: UserRole[]) {
    if (!roles.length) return true; // If no specific roles required, allow access
    // User role can technically be null here if the check in getSessionAndUser is removed/modified
    // If role is null, they don't match any specific required role.
    if (sessionAndUser.user.role === null) return false;
    // Check against the provided roles (which now include 'employee' and 'user')
    return roles.includes(sessionAndUser.user.role);
}

export function isOwner(sessionAndUser: SessionAndUser, ownerUserId: number) {
    return sessionAndUser.user.userId === ownerUserId
}