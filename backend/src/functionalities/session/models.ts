import { User } from "../user/models";

export interface Session {
    sessionId?: number;
    userId: number; // Foreign key referencing users table
    token: string;   // Unique session token (e.g., UUID)
    createdOn: Date;
    expiresOn: Date;
}

export interface SessionAndUser {
    session: Session
    user: User
}