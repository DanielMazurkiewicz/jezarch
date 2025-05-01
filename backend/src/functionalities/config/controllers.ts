import { BunRequest } from 'bun';
import { getConfig, setConfig } from './db';
import { AppConfigKeys, Config } from './models';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';

export const getConfigController = async (req: BunRequest<":key">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    const key = req?.params?.key as AppConfigKeys;

    // Determine access based on key
    switch (key) {
        case AppConfigKeys.DEFAULT_LANGUAGE:
            // Allow admin and employees to read default language
            if (!isAllowedRole(sessionAndUser, 'admin', 'employee')) return new Response("Forbidden", { status: 403 });
            break;
        case AppConfigKeys.PORT:
        case AppConfigKeys.SSL_KEY:
        case AppConfigKeys.SSL_CERT:
        default:
             // Restrict other keys to admin only
            if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });
    }


    try {
        const value = await getConfig(key);
        if (value === undefined) {
             // If key exists but value is null/undefined in DB, return null
             // If key truly doesn't exist, maybe return 404? For now, return null.
             return new Response(JSON.stringify({ [key]: null }), { status: 200 });
        }
        return new Response(JSON.stringify({ [key]: value }), { status: 200 });
    } catch (error) {
        await Log.error('Error getting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to get config', error: error }), { status: 500 });
    }
};

export const setConfigController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can set config values
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as Config;

        // TODO: Add validation for key and value based on AppConfigKeys
        const key = body.key as AppConfigKeys;
        const value = body.value;

        if (!key || value === undefined) {
             return new Response(JSON.stringify({ message: 'Config key and value are required' }), { status: 400 });
        }

        // Example validation: Ensure PORT is a number
        if (key === AppConfigKeys.PORT && isNaN(parseInt(value))) {
             return new Response(JSON.stringify({ message: 'Port value must be a number' }), { status: 400 });
        }
        // Add more validation as needed

        await setConfig(key, value);
        await Log.info(`Config updated: ${key} set`, sessionAndUser.user.login, 'config');
        return new Response(JSON.stringify({ message: 'Config updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Error setting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to set config', error: error }), { status: 500 });
    }
};