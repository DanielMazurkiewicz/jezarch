import { BunRequest } from 'bun';
import { getAllLogs, Log, purgeLogsOlderThan } from './db';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { SearchRequest, SearchResponse, buildSearchQueries, executeSearch } from "../../utils/search";
import { LogEntry } from "./models";
import { jsonResponse, jsonError } from '../../utils/http';

export const searchLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return jsonError('Unauthorized', 401);
    if (!isAllowedRole(sessionAndUser, 'admin')) return jsonError('Forbidden', 403);

    try {
        const searchRequest = await req.json() as SearchRequest;
        const allowedFields: (keyof LogEntry)[] = ['level', 'createdOn', 'userId', 'category', 'message', 'id'];
        const primaryKey = 'id';

        const { dataQuery, countQuery } = await buildSearchQueries<LogEntry>(
            'logs',
            searchRequest,
            allowedFields,
            undefined,
            primaryKey
        );

        const response = await executeSearch<LogEntry>(dataQuery, countQuery);
        return jsonResponse(response);
    } catch (error) {
        await Log.error('Log search failed', sessionAndUser.user.login, 'log', error);
        return jsonError('Failed to search logs', 500, error instanceof Error ? error.message : 'Unknown error');
    }
};

// --- NEW: Controller for purging logs ---
export const purgeLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return jsonError('Unauthorized', 401);
    if (!isAllowedRole(sessionAndUser, 'admin')) return jsonError('Forbidden', 403);

    try {
        const url = new URL(req.url);
        const daysParam = url.searchParams.get('days');
        const DEFAULT_PURGE_DAYS = 7;
        let days = DEFAULT_PURGE_DAYS;
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

        return jsonResponse({
            message: `Successfully purged ${deletedCount} log entries older than ${days} days.`,
            deletedCount: deletedCount
        });

    } catch (error: any) {
        await Log.error('Log purge failed', sessionAndUser.user.login, 'log', { error });
        return jsonError('Failed to purge logs', 500, error instanceof Error ? error.message : 'Unknown error');
    }
};
// --- END NEW CONTROLLER ---

// Deprecated - Use searchLogsController instead
export const getAllLogsController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return jsonError('Unauthorized', 401);
    if (!isAllowedRole(sessionAndUser, 'admin')) return jsonError('Forbidden', 403);

    try {
        const logs = await getAllLogs();
        return jsonResponse(logs);
    } catch (error) {
        await Log.error('Error getting logs (deprecated endpoint)', sessionAndUser.user.login, 'log', error);
        return jsonError('Failed to get logs', 500, error);
    }
};