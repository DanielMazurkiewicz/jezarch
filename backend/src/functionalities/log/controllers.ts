import { BunRequest } from 'bun';
import { getAllLogs, Log } from './db';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';

import { SearchRequest, SearchResponse, buildSearchQueries, executeSearch } from "../../utils/search";
import { LogEntry } from "./models";

export const searchLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const searchRequest = await req.json() as SearchRequest;
        const allowedFields: (keyof LogEntry)[] = ['level', 'createdOn', 'userId', 'category', 'message', 'id']; // 'id' is the PK
        const primaryKey = 'id'; // <-- Specify the correct primary key

        // --- FIX: Added await and specified primaryKey ---
        const { dataQuery, countQuery } = await buildSearchQueries<LogEntry>(
            'logs',
            searchRequest,
            allowedFields,
            undefined, // No custom handlers needed for logs currently
            primaryKey // Pass the correct primary key here
        );
        // -----------------------------------------------

        const response = await executeSearch<LogEntry>(dataQuery, countQuery);
        return new Response(JSON.stringify(response), { status: 200 });
    } catch (error) {
        await Log.error('Log search failed', sessionAndUser.user.login, 'log', error);
        return new Response(JSON.stringify({
            message: 'Failed to search logs',
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};

export const getAllLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const logs = await getAllLogs();
        return new Response(JSON.stringify(logs), { status: 200 });
    } catch (error) {
        await Log.error('Error getting logs', sessionAndUser.user.login, 'log', error);
        return new Response(JSON.stringify({ message: 'Failed to get logs', error: error }), { status: 500 });
    }
};