import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig, setConfig } from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from './app_params';
import { CmdParams } from './cmd'; // Import CmdParams
import { Log } from '../functionalities/log/db'; // Import Log for warnings
import { existsSync } from 'node:fs'; // Import existsSync to check file paths

// Function to safely parse an integer from config/env/cmd
const safelyParseInt = (value: string | number | undefined | null, defaultValue: number): number => {
    if (value === undefined || value === null) return defaultValue;
    const parsed = parseInt(String(value), 10);
    return !isNaN(parsed) && parsed > 0 && parsed <= 65535 ? parsed : defaultValue;
};

// Function to safely get a string path from config/env/cmd
// Also checks if the file exists if the path is not null/empty
const safelyGetStringPath = (value: string | undefined | null, defaultValue: string | null, checkExists: boolean = true): string | null => {
    let pathValue: string | null = null;
    if (value !== undefined && value !== null && String(value).trim() !== '') {
        pathValue = String(value).trim();
    } else {
        pathValue = defaultValue;
    }

    if (pathValue && checkExists && !existsSync(pathValue)) {
        Log.warn(`Configuration path not found: "${pathValue}". Setting will be ignored.`, 'system', 'startup');
        return null; // Treat non-existent file as null
    }
    return pathValue;
};


export async function initializeConfigs() {
    console.log("* Initializing Configs from DB and applying overrides...");

    // Define the order of precedence: CmdParams > Env Vars > DB Config > Defaults
    // Defaults are already set in AppParams

    // --- Database Paths ---
    // DB Path is special: Cmd > Env > Default (Not stored in DB config table)
    AppParams.dbPath = CmdParams.dbPath
                      || process.env.JEZARCH_DB_PATH
                      || AppParamsDefaults.dbPath;

    // --- Language ---
    const langFromDb = await getConfig(AppConfigKeys.DEFAULT_LANGUAGE);
    AppParams.defaultLanguage = CmdParams.defaultLanguage
                               || process.env.JEZARCH_DEFAULT_LANGUAGE
                               || langFromDb
                               || AppParamsDefaults.defaultLanguage;
    // If default was used because DB was empty, store the default in DB
    if (!langFromDb && AppParams.defaultLanguage === AppParamsDefaults.defaultLanguage) {
         await setConfig(AppConfigKeys.DEFAULT_LANGUAGE, AppParamsDefaults.defaultLanguage);
         await Log.info(`Stored default language ('${AppParamsDefaults.defaultLanguage}') in database config.`, 'system', 'startup');
    }

    // --- HTTP Port ---
    const httpPortFromDb = await getConfig(AppConfigKeys.HTTP_PORT);
    AppParams.httpPort = safelyParseInt(
                                CmdParams.httpPort
                                || process.env.JEZARCH_HTTP_PORT
                                || httpPortFromDb,
                                AppParamsDefaults.httpPort
                           );
    if (!httpPortFromDb && AppParams.httpPort === AppParamsDefaults.httpPort) {
        await setConfig(AppConfigKeys.HTTP_PORT, String(AppParamsDefaults.httpPort));
        await Log.info(`Stored default HTTP port (${AppParamsDefaults.httpPort}) in database config.`, 'system', 'startup');
    }


    // --- HTTPS Port ---
    const httpsPortFromDb = await getConfig(AppConfigKeys.HTTPS_PORT);
    AppParams.httpsPort = safelyParseInt(
                                CmdParams.httpsPort
                                || process.env.JEZARCH_HTTPS_PORT
                                || httpsPortFromDb,
                                AppParamsDefaults.httpsPort
                           );
    if (!httpsPortFromDb && AppParams.httpsPort === AppParamsDefaults.httpsPort) {
        await setConfig(AppConfigKeys.HTTPS_PORT, String(AppParamsDefaults.httpsPort));
        await Log.info(`Stored default HTTPS port (${AppParamsDefaults.httpsPort}) in database config.`, 'system', 'startup');
    }

    // --- HTTPS Key Path ---
    const httpsKeyPathFromDb = await getConfig(AppConfigKeys.HTTPS_KEY_PATH);
    AppParams.httpsKeyPath = safelyGetStringPath(
                                CmdParams.httpsKeyPath
                                || process.env.JEZARCH_HTTPS_KEY_PATH
                                || httpsKeyPathFromDb,
                                AppParamsDefaults.httpsKeyPath, // Default is null
                                true // Check if file exists
                           );
    // Don't store null default in DB for paths, only store if explicitly set and exists

    // --- HTTPS Cert Path ---
    const httpsCertPathFromDb = await getConfig(AppConfigKeys.HTTPS_CERT_PATH);
    AppParams.httpsCertPath = safelyGetStringPath(
                                CmdParams.httpsCertPath
                                || process.env.JEZARCH_HTTPS_CERT_PATH
                                || httpsCertPathFromDb,
                                AppParamsDefaults.httpsCertPath, // Default is null
                                true // Check if file exists
                           );

    // --- HTTPS CA Path ---
    const httpsCaPathFromDb = await getConfig(AppConfigKeys.HTTPS_CA_PATH);
    AppParams.httpsCaPath = safelyGetStringPath(
                                CmdParams.httpsCaPath
                                || process.env.JEZARCH_HTTPS_CA_PATH
                                || httpsCaPathFromDb,
                                AppParamsDefaults.httpsCaPath, // Default is null
                                true // Check if file exists
                           );


    // Log the final computed configuration parameters
    console.log(`* Config Initialization Complete. Effective Parameters:`);
    console.log(`  - DB Path: ${AppParams.dbPath}`);
    console.log(`  - Default Language: ${AppParams.defaultLanguage}`);
    console.log(`  - HTTP Port: ${AppParams.httpPort}`);
    console.log(`  - HTTPS Port: ${AppParams.httpsPort}`);
    console.log(`  - HTTPS Key Path: ${AppParams.httpsKeyPath ?? 'Not Set / Not Found'}`);
    console.log(`  - HTTPS Cert Path: ${AppParams.httpsCertPath ?? 'Not Set / Not Found'}`);
    console.log(`  - HTTPS CA Path: ${AppParams.httpsCaPath ?? 'Not Set / Not Found'}`);

}