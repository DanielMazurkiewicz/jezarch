import { BunRequest } from 'bun';
import { getAllLogs, Log, purgeLogsOlderThan } from './db'; // Added purgeLogsOlderThan import
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

// --- NEW: Controller for purging logs ---
export const purgeLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const url = new URL(req.url);
        const daysParam = url.searchParams.get('days');
        // Default to 7 days if parameter is missing or invalid
        let days = 7;
        if (daysParam) {
            const parsedDays = parseInt(daysParam, 10);
            if (!isNaN(parsedDays) && parsedDays > 0) {
                days = parsedDays;
            } else {
                await Log.warn(`Invalid 'days' parameter for log purge: ${daysParam}. Defaulting to 7.`, sessionAndUser.user.login, 'log');
            }
        }

        const deletedCount = await purgeLogsOlderThan(days);
        await Log.info(`Purged ${deletedCount} log entries older than ${days} days.`, sessionAndUser.user.login, 'log', { days, deletedCount });

        return new Response(JSON.stringify({
            message: `Successfully purged ${deletedCount} log entries older than ${days} days.`,
            deletedCount: deletedCount
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        await Log.error('Log purge failed', sessionAndUser.user.login, 'log', { error });
        return new Response(JSON.stringify({
            message: 'Failed to purge logs',
            error: error instanceof Error ? error.message : 'Unknown error'
        }), { status: 500 });
    }
};
// --- END NEW CONTROLLER ---

// Deprecated - Use searchLogsController instead
export const getAllLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const logs = await getAllLogs();
        return new Response(JSON.stringify(logs), { status: 200 });
    } catch (error) {
        await Log.error('Error getting logs (deprecated endpoint)', sessionAndUser.user.login, 'log', error);
        return new Response(JSON.stringify({ message: 'Failed to get logs', error: error }), { status: 500 });
    }
};