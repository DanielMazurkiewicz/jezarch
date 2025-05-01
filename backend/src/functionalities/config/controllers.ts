import { BunRequest } from 'bun';
import { getConfig, setConfig } from './db';
import { AppConfigKeys, Config } from './models';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
// Removed: import { triggerServerRestart } from '../../utils/server_restart';

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
            // Restrict SSL info display even further? Maybe only check existence?
            // For now, restrict these sensitive/technical ones to admin.
            if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });
            break;
        default:
             // If a key is not explicitly handled, deny access by default? Or allow admin?
             // For safety, restrict unknown keys to admin.
            if (!isAllowedRole(sessionAndUser, 'admin')) {
                await Log.warn(`Attempt to access unknown/unhandled config key: ${key}`, sessionAndUser.user.login, 'config');
                return new Response("Forbidden: Unknown configuration key", { status: 403 });
            }
    }


    try {
        const value = await getConfig(key); // Fetches the string value directly
        // --- FIX: Return the value directly under the key, not nested ---
        if (value === undefined) {
             // If key exists but value is null/undefined in DB, return null
             // If key truly doesn't exist, maybe return 404? For now, return null.
             return new Response(JSON.stringify({ [key]: null }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' } // Ensure correct headers
            });
        }
        // Return the value directly associated with the key
        return new Response(JSON.stringify({ [key]: value }), {
             status: 200,
             headers: { 'Content-Type': 'application/json' } // Ensure correct headers
         });
         // --- End FIX ---
    } catch (error: any) {
        await Log.error('Error getting config', sessionAndUser.user.login, 'config', error);
        // Ensure error response has correct content type and structure
        return new Response(JSON.stringify({ message: 'Failed to get config', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const setConfigController = async (req: BunRequest<":key">) => { // Adjusted to handle :key in PUT if desired, or use single endpoint
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can set config values
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        // Assuming the key is in the URL and value in the body for PUT /api/configs/:key
        // Or if using a single endpoint like PUT /api/configs, parse from body
        const key = req?.params?.key as AppConfigKeys; // Get key from URL param
        const body = await req.json() as { value: string }; // Expect only value in body
        const value = body.value;

        // // --- Alternative: If using a single PUT /api/config ---
        // const body = await req.json() as Config;
        // const key = body.key as AppConfigKeys;
        // const value = body.value;
        // // --- End Alternative ---


        if (!key || value === undefined || value === null) { // Check for null value as well
             return new Response(JSON.stringify({ message: 'Config key (in URL) and non-null value (in body) are required' }), { status: 400 });
        }

        // Validate specific keys
        if (key === AppConfigKeys.PORT) {
            const portNum = parseInt(value);
             if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                return new Response(JSON.stringify({ message: 'Invalid Port value. Must be a number between 1 and 65535.' }), { status: 400 });
             }
        }
        if (key === AppConfigKeys.DEFAULT_LANGUAGE) {
            if (value.trim().length < 2) { // Basic validation for language code
                 return new Response(JSON.stringify({ message: 'Invalid Default Language value. Must be at least 2 characters.' }), { status: 400 });
            }
        }
        // Add more validation as needed for other keys

        // --- Check if restart is needed (for messaging only) ---
        let needsRestartInfo = false;
        const keysRequiringRestart: AppConfigKeys[] = [AppConfigKeys.PORT, AppConfigKeys.SSL_CERT, AppConfigKeys.SSL_KEY];
        if (keysRequiringRestart.includes(key)) {
            // Check if the value actually changed (optional, simple check is fine too)
            const currentVal = await getConfig(key);
            if (String(currentVal) !== String(value)) {
                needsRestartInfo = true;
            }
        }
        // --- End Check ---

        await setConfig(key, value);
        await Log.info(`Config updated: ${key} set to '${value}'`, sessionAndUser.user.login, 'config');

        const responseMessage = `Config '${key}' updated successfully.${needsRestartInfo ? ' Manual server restart required for changes to take effect.' : ''}`;
        const response = new Response(JSON.stringify({ message: responseMessage }), {
             status: 200,
             headers: { 'Content-Type': 'application/json' } // Ensure correct headers
        });

        // Removed automatic restart trigger

        return response;

    } catch (error: any) {
        await Log.error('Error setting config', sessionAndUser.user.login, 'config', error);
         return new Response(JSON.stringify({ message: 'Failed to set config', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
         });
    }
};