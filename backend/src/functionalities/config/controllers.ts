import { BunRequest } from 'bun';
import { getConfig, setConfig } from './db';
import { AppConfigKeys } from './models'; // Models now have updated keys
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';
// --- Import server control functions ---
import { reloadTlsConfiguration, stopHttpsServer } from '../../initialization/server';
// ------------------------------------
import { AppParams } from '../../initialization/app_params'; // Import AppParams to update runtime values
import { existsSync } from 'node:fs'; // To check file existence before setting


// --- NEW: Public Controller for Default Language ---
export const getDefaultLanguageController = async (req: BunRequest) => {
    try {
        // Fetch directly from AppParams to reflect the *currently active* value
        const defaultLanguage = AppParams.defaultLanguage;
        // Log if needed (consider rate limiting or reducing frequency)
        // await Log.info(`Public request for default language: ${defaultLanguage}`, 'public_api', 'config');
        return new Response(JSON.stringify({ defaultLanguage }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
        });
    } catch (error: any) {
        // Avoid logging sensitive details in public endpoint error
        console.error(`Error fetching default language for public request: ${error.message}`);
        await Log.error('Error getting default language (public)', 'system', 'config_public', error);
        return new Response(JSON.stringify({ message: 'Failed to get default language setting.' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
// --- END NEW CONTROLLER ---


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

    // --- UPDATED: Allow Employee to read Default Language ---
    const nonSensitiveKeysForEmployee: AppConfigKeys[] = [
         AppConfigKeys.DEFAULT_LANGUAGE,
         AppConfigKeys.HTTP_PORT,
         AppConfigKeys.HTTPS_PORT,
    ];

    // Basic Access Control
    if (!isAllowedRole(sessionAndUser, 'admin')) {
        // If employee, allow access only to specific non-sensitive keys
        if (isAllowedRole(sessionAndUser, 'employee')) {
            if (!nonSensitiveKeysForEmployee.includes(key)) {
                 await Log.warn(`Employee attempt to access restricted/unknown config key: ${key}`, sessionAndUser.user.login, 'config');
                 return new Response("Forbidden: Access denied for this configuration key", { status: 403 });
            }
        } else {
             // If not admin or employee, deny all config access via this authenticated route
             await Log.warn(`Unauthorized role (${sessionAndUser.user.role}) attempt to access config key: ${key}`, sessionAndUser.user.login, 'config');
             return new Response("Forbidden", { status: 403 });
        }
    }
    // --- END ACCESS CONTROL UPDATE ---


    // If key is not valid enum value (even for admin)
    if (!Object.values(AppConfigKeys).includes(key)) {
         await Log.warn(`Attempt to access invalid config key: ${key}`, sessionAndUser.user.login, 'config');
         return new Response(JSON.stringify({ message: "Invalid configuration key requested." }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
         });
    }

    try {
        // Fetch directly from AppParams to reflect the *currently active* value
        // including overrides from env/cmd, not just the DB value.
        let value: string | number | null | undefined;
        let displayValue: string | number | null | undefined;

         switch (key) {
             case AppConfigKeys.DEFAULT_LANGUAGE: value = AppParams.defaultLanguage; break;
             case AppConfigKeys.HTTP_PORT: value = AppParams.httpPort; break;
             case AppConfigKeys.HTTPS_PORT: value = AppParams.httpsPort; break;
             case AppConfigKeys.HTTPS_KEY_PATH: value = AppParams.httpsKeyPath; break;
             case AppConfigKeys.HTTPS_CERT_PATH: value = AppParams.httpsCertPath; break;
             case AppConfigKeys.HTTPS_CA_PATH: value = AppParams.httpsCaPath; break;
             default:
                // Fallback to DB for potentially unknown keys (shouldn't happen with enum check)
                value = await getConfig(key);
         }
         displayValue = value; // Start with the actual value

        // --- Mask sensitive values for non-admins (even if admin check passed, extra safety) ---
        if (sensitiveKeys.includes(key) && !isAllowedRole(sessionAndUser, 'admin')) { // Check role again for masking
            // Return a placeholder or existence status instead of the actual path
             displayValue = value ? "*** SET (Path Hidden) ***" : null; // Show if set, otherwise null
        }
        // --- End Masking ---

        // Return null if value is undefined or null
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
             // Ensure value is not undefined. Allow null *only* for path keys.
             // Exception: Allow setting ports/language to null? No, validate below.
            return new Response(JSON.stringify({ message: `Config key '${key}' requires a value (null only allowed for paths)` }), { status: 400 });
        }

        // --- Specific Validations and Processing ---
        let originalValue: string | number | null | undefined;
        let processedValue: string | number | null = value; // Start with input, process below

        switch (key) {
             case AppConfigKeys.HTTP_PORT:
             case AppConfigKeys.HTTPS_PORT:
                 originalValue = key === AppConfigKeys.HTTP_PORT ? AppParams.httpPort : AppParams.httpsPort;
                 if (value === null) return new Response(JSON.stringify({ message: 'Port value cannot be null.' }), { status: 400 });
                 const portNum = parseInt(value);
                 if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
                     return new Response(JSON.stringify({ message: 'Invalid Port value. Must be a number between 1 and 65535.' }), { status: 400 });
                 }
                 processedValue = portNum; // Store as number internally
                 break;
             case AppConfigKeys.DEFAULT_LANGUAGE:
                 originalValue = AppParams.defaultLanguage;
                 // --- UPDATED: Validate against known supported languages ---
                 if (value === null || !existsSync(value)) { // Re-using existsSync logic doesn't fit, use explicit check
                    // Correct the check to ensure the value is one of the supported languages
                    const supportedLangs = ['en', 'pl']; // Assuming these are your supported languages
                    if (value === null || !supportedLangs.includes(value)) {
                         return new Response(JSON.stringify({ message: `Invalid Default Language value. Must be one of: ${supportedLangs.join(', ')}.` }), { status: 400 });
                    }
                 }
                 // --- END UPDATE ---
                 processedValue = value.trim();
                 break;
             case AppConfigKeys.HTTPS_KEY_PATH:
             case AppConfigKeys.HTTPS_CERT_PATH:
             case AppConfigKeys.HTTPS_CA_PATH:
                 // Store original value for comparison
                 if (key === AppConfigKeys.HTTPS_KEY_PATH) originalValue = AppParams.httpsKeyPath;
                 else if (key === AppConfigKeys.HTTPS_CERT_PATH) originalValue = AppParams.httpsCertPath;
                 else originalValue = AppParams.httpsCaPath;

                 if (value === null) {
                     processedValue = null; // Allow clearing
                 } else {
                     value = value.trim();
                     if (value === '') {
                         return new Response(JSON.stringify({ message: `Path for ${key} cannot be empty string. Use null to clear.` }), { status: 400 });
                     }
                      // Check file existence *before* saving
                     if (!existsSync(value)) {
                         await Log.warn(`Admin tried to set non-existent path for ${key}: ${value}`, sessionAndUser.user.login, 'config');
                         return new Response(JSON.stringify({ message: `Path does not exist on server: ${value}` }), { status: 400 });
                     }
                     processedValue = value;
                 }
                 break;
        }
        // --- End Specific Validations ---

        // Check if the effective value changed
        const valueChanged = String(originalValue ?? '') !== String(processedValue ?? ''); // Compare string representations

        // Determine if manual restart is needed based on the key being changed
        const keysRequiringRestart: AppConfigKeys[] = [
            AppConfigKeys.HTTP_PORT, // Port changes always need full restart
            AppConfigKeys.HTTPS_PORT,
        ];
         const keysTriggeringTlsReload: AppConfigKeys[] = [
            AppConfigKeys.HTTPS_KEY_PATH,
            AppConfigKeys.HTTPS_CERT_PATH,
            AppConfigKeys.HTTPS_CA_PATH,
        ];
        const needsManualRestart = keysRequiringRestart.includes(key) && valueChanged;
        const triggersTlsReload = keysTriggeringTlsReload.includes(key) && valueChanged;

        // Store the processed value in DB (convert numbers/nulls to string for DB)
        const valueForDb = processedValue === null ? '' : String(processedValue);
        await setConfig(key, valueForDb);

        // --- Update runtime AppParams ---
        // This makes the change immediately effective for subsequent requests *within this process*
        // that read AppParams directly, BEFORE a restart/reload might happen.
        switch (key) {
             case AppConfigKeys.DEFAULT_LANGUAGE: AppParams.defaultLanguage = processedValue as string; break;
             case AppConfigKeys.HTTP_PORT: AppParams.httpPort = processedValue as number; break;
             case AppConfigKeys.HTTPS_PORT: AppParams.httpsPort = processedValue as number; break;
             case AppConfigKeys.HTTPS_KEY_PATH: AppParams.httpsKeyPath = processedValue as string | null; break;
             case AppConfigKeys.HTTPS_CERT_PATH: AppParams.httpsCertPath = processedValue as string | null; break;
             case AppConfigKeys.HTTPS_CA_PATH: AppParams.httpsCaPath = processedValue as string | null; break;
        }
        await Log.info(`Config updated: ${key} set to '${valueForDb}' (Runtime updated). Value changed: ${valueChanged}`, sessionAndUser.user.login, 'config');


        // --- Trigger Server Actions ---
        let actionMessage = '';
        if (needsManualRestart) {
             actionMessage = ' Manual server restart required for changes to take effect.';
             // We don't attempt automatic restart for port changes.
        } else if (triggersTlsReload) {
             // Check if both key and cert are now set, otherwise stop HTTPS
             if (AppParams.httpsKeyPath && AppParams.httpsCertPath) {
                 await Log.info(`Triggering TLS reload due to config change for ${key}`, sessionAndUser.user.login, 'config');
                 reloadTlsConfiguration(); // Attempt to reload TLS config in the running server
                 actionMessage = ' HTTPS configuration reloaded.';
             } else {
                 await Log.info(`Stopping HTTPS server because key/cert paths are no longer fully set after change to ${key}`, sessionAndUser.user.login, 'config');
                 stopHttpsServer();
                 actionMessage = ' HTTPS server stopped.';
             }
        }

        const responseMessage = `Config '${key}' updated successfully.${actionMessage}`;
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

// --- NEW: Controller to clear HTTPS settings ---
export const clearHttpsConfigController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        let changesMade = false;
        const httpsKeys: AppConfigKeys[] = [
            AppConfigKeys.HTTPS_KEY_PATH,
            AppConfigKeys.HTTPS_CERT_PATH,
            AppConfigKeys.HTTPS_CA_PATH,
            // Also clear port? Maybe not, user might want to re-enable later. Let's keep port.
            // AppConfigKeys.HTTPS_PORT,
        ];

        for (const key of httpsKeys) {
            const currentValue = await getConfig(key); // Check DB value
            if (currentValue && currentValue !== '') {
                 await setConfig(key, ''); // Set to empty string in DB (representing null)
                 changesMade = true;
                 // Update runtime AppParams
                 if (key === AppConfigKeys.HTTPS_KEY_PATH) AppParams.httpsKeyPath = null;
                 else if (key === AppConfigKeys.HTTPS_CERT_PATH) AppParams.httpsCertPath = null;
                 else if (key === AppConfigKeys.HTTPS_CA_PATH) AppParams.httpsCaPath = null;
                 await Log.info(`Cleared HTTPS config key: ${key}`, sessionAndUser.user.login, 'config');
            }
        }

        if (changesMade) {
            stopHttpsServer(); // Stop the HTTPS server if settings were cleared
            return new Response(JSON.stringify({ message: "HTTPS configuration cleared successfully. HTTPS server stopped." }), { status: 200 });
        } else {
             return new Response(JSON.stringify({ message: "HTTPS configuration was already clear. No changes made." }), { status: 200 });
        }

    } catch (error: any) {
        await Log.error('Error clearing HTTPS config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to clear HTTPS configuration', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};
// --- END NEW CONTROLLER ---