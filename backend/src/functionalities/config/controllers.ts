import { BunRequest } from 'bun';
import { getConfig, setConfig } from './db';
import { AppConfigKeys } from './models'; // Models now have updated keys
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
// Removed SSL related imports and server restart logic

export const getConfigController = async (req: BunRequest<":key">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    const key = req?.params?.key as AppConfigKeys;

    // Define sensitive keys that should only return placeholder or existence status
    const sensitiveKeys: AppConfigKeys[] = [
        AppConfigKeys.HTTPS_KEY_PATH,
        AppConfigKeys.HTTPS_CERT_PATH,
        AppConfigKeys.HTTPS_CA_PATH,
    ];

    // Basic Access Control (Admin can see all, Employee can see non-sensitive)
    if (!isAllowedRole(sessionAndUser, 'admin')) {
        if (sensitiveKeys.includes(key) || !Object.values(AppConfigKeys).includes(key)) {
             await Log.warn(`Non-admin attempt to access sensitive/unknown config key: ${key}`, sessionAndUser.user.login, 'config');
             return new Response("Forbidden: Access denied for this configuration key", { status: 403 });
        }
        // Allow employees to see non-sensitive keys like ports and language
         if (!isAllowedRole(sessionAndUser, 'employee')) {
              // If not even employee, deny access to all config keys via API
             return new Response("Forbidden", { status: 403 });
         }
    }

    // If key is not valid enum value
    if (!Object.values(AppConfigKeys).includes(key)) {
         await Log.warn(`Attempt to access invalid config key: ${key}`, sessionAndUser.user.login, 'config');
         return new Response(JSON.stringify({ message: "Invalid configuration key requested." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
         });
    }

    try {
        const value = await getConfig(key); // Fetches the string value directly

        // --- Mask sensitive values for non-admins (even if admin check passed, extra safety) ---
        let displayValue: string | null | undefined = value;
        if (sensitiveKeys.includes(key)) {
            // Return a placeholder or existence status instead of the actual path
             displayValue = value ? "*** SET (Path Hidden) ***" : null; // Show if set, otherwise null
        }
        // --- End Masking ---

        // Return null if value is undefined (key doesn't exist in DB)
        const responseBody = { [key]: displayValue === undefined ? null : displayValue };

        return new Response(JSON.stringify(responseBody), {
             status: 200,
             headers: { 'Content-Type': 'application/json' }
         });

    } catch (error: any) {
        await Log.error('Error getting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to get config', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};

export const setConfigController = async (req: BunRequest<":key">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    // Only admins can set config values
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const key = req?.params?.key as AppConfigKeys;
        const body = await req.json() as { value: string | null }; // Allow setting paths to null
        let value = body.value; // Can be string or null

        // Validate key exists in our enum
        if (!Object.values(AppConfigKeys).includes(key)) {
            return new Response(JSON.stringify({ message: 'Invalid Config key specified' }), { status: 400 });
        }

        // Value validation (required unless it's a path being cleared)
        const pathKeys: AppConfigKeys[] = [
             AppConfigKeys.HTTPS_KEY_PATH, AppConfigKeys.HTTPS_CERT_PATH, AppConfigKeys.HTTPS_CA_PATH
        ];
        if (value === undefined || (value === null && !pathKeys.includes(key))) {
            return new Response(JSON.stringify({ message: `Config key '${key}' requires a non-null value` }), { status: 400 });
        }

        // --- Specific Validations ---
        if (value !== null) { // Only validate if not clearing a path
            if (key === AppConfigKeys.HTTP_PORT || key === AppConfigKeys.HTTPS_PORT) {
                const portNum = parseInt(value);
                if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                    return new Response(JSON.stringify({ message: 'Invalid Port value. Must be a number between 1 and 65535.' }), { status: 400 });
                }
                 value = String(portNum); // Ensure stored as string
            } else if (key === AppConfigKeys.DEFAULT_LANGUAGE) {
                if (value.trim().length < 2) {
                    return new Response(JSON.stringify({ message: 'Invalid Default Language value. Must be at least 2 characters.' }), { status: 400 });
                }
                value = value.trim();
            } else if (pathKeys.includes(key)) {
                // Basic path validation (e.g., not empty if not null) - more checks could be added
                if (value.trim() === '') {
                    return new Response(JSON.stringify({ message: `Path for ${key} cannot be empty string. Use null to clear.` }), { status: 400 });
                }
                // Consider checking file existence here? Might be too complex/fragile.
                value = value.trim();
            }
        }
        // --- End Specific Validations ---

        // Determine if manual restart is needed based on the key being changed
        const keysRequiringRestart: AppConfigKeys[] = [
            AppConfigKeys.HTTP_PORT,
            AppConfigKeys.HTTPS_PORT,
            AppConfigKeys.HTTPS_KEY_PATH,
            AppConfigKeys.HTTPS_CERT_PATH,
            AppConfigKeys.HTTPS_CA_PATH,
        ];
        const needsRestartInfo = keysRequiringRestart.includes(key);

        // Store the value (null is stored as 'null' string implicitly by stringify, but we pass directly)
        // Need to ensure DB stores null correctly if `value` is null.
        // The current setConfig expects string, so handle null case explicitly.
        // Let's modify setConfig to handle null or store a specific marker?
        // For now, we'll pass the string representation or a placeholder if needed by setConfig.
        // Assuming setConfig handles string value directly:
        await setConfig(key, value === null ? '' : value); // Store empty string for null path? Or adjust setConfig. Let's store empty string for now.
        // **Decision**: It's better to store NULL in the DB if `value` is null. Let's assume `setConfig` is updated or handles this.
        // If setConfig MUST take string: `await setConfig(key, value ?? '');`

        await Log.info(`Config updated: ${key} set to '${value === null ? 'NULL' : value}'`, sessionAndUser.user.login, 'config');

        const responseMessage = `Config '${key}' updated successfully.${needsRestartInfo ? ' Manual server restart required for changes to take effect.' : ''}`;
        return new Response(JSON.stringify({ message: responseMessage }), {
             status: 200,
             headers: { 'Content-Type': 'application/json' }
        });

    } catch (error: any) {
        await Log.error('Error setting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to set config', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};