import { getSessionByToken } from './db';
import { getUserByUserId } from '../user/db';
import { SessionAndUser } from './models';
import { BunRequest } from 'bun';
import { UserRole } from '../user/models';

export async function getSessionAndUser(req: BunRequest): Promise<undefined | SessionAndUser> {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return;
    
    const session = await getSessionByToken(authHeader);
    if (!session) return;
    
    const user = await getUserByUserId(session.userId);
    if (!user) return;
    
    return {
        user, session
    }
}


export function isAllowedRole(sessionAndUser: SessionAndUser, ...roles: UserRole[]) {
    if (!roles.length) return true
    return roles.includes(sessionAndUser.user.role)
}

export function isOwner(sessionAndUser: SessionAndUser, ownerUserId: number) {
    return sessionAndUser.user.userId === ownerUserId
}