
// Removed initializeCmdParams import as parsing happens on module load
import { CmdParams } from './initialization/cmd';
// Renamed initializeAppParams to finalizeAppParams
import { AppParams, finalizeAppParams } from './initialization/app_params';
import { initializeDatabase, dbForeignKeysEnabled, dbJournalMode } from './initialization/db'; // Import DB status vars
import { initializeConfigs } from './initialization/config';
import { dumpLogs } from './utils/dumpLogs';
import { initializeServer, publicDir, isSslEnabled, serverHostname, serverPort } from './initialization/server'; // Import server status vars
import { Log } from './functionalities/log/db';

async function main() {
    try {
        // Initialization sequence
        // CmdParams are parsed when ./initialization/cmd is imported
        await initializeDatabase(); // DB needs to be up before reading/writing config
        await initializeConfigs(); // Reads DB config, applies overrides (Cmd, Env)
        await dumpLogs(); // Exits if --log is used
        await initializeServer(); // Reads final AppParams to configure server

        // Finalize and log parameters AFTER server initialization
        finalizeAppParams();

        // Gather data for the final log message using the *final* AppParams
        const serverLogData = {
            message: `Server initialized and running.`,
            config: {
                httpPort: AppParams.httpPort, // Use final HTTP port
                httpsPort: AppParams.httpsPort, // Use final HTTPS port
                hostname: serverHostname, // Actual hostname server is listening on
                dbPath: AppParams.dbPath,
                defaultLanguage: AppParams.defaultLanguage,
                sslEnabled: isSslEnabled,
                httpsKeyPath: AppParams.httpsKeyPath, // Log final paths
                httpsCertPath: AppParams.httpsCertPath,
                httpsCaPath: AppParams.httpsCaPath,
                staticFilesDir: publicDir,
            },
            db: {
                foreignKeys: dbForeignKeysEnabled ? 'ON' : 'OFF',
                journalMode: dbJournalMode ?? 'Default', // Handle null case
            },
            cmdParams: CmdParams, // Log command line parameters provided
            envVars: { // Log relevant env vars (be careful with secrets)
                JEZARCH_DB_PATH: process.env.JEZARCH_DB_PATH,
                JEZARCH_HTTP_PORT: process.env.JEZARCH_HTTP_PORT,
                JEZARCH_HTTPS_PORT: process.env.JEZARCH_HTTPS_PORT,
                JEZARCH_HTTPS_KEY_PATH: process.env.JEZARCH_HTTPS_KEY_PATH,
                JEZARCH_HTTPS_CERT_PATH: process.env.JEZARCH_HTTPS_CERT_PATH,
                JEZARCH_HTTPS_CA_PATH: process.env.JEZARCH_HTTPS_CA_PATH,
                JEZARCH_DEFAULT_LANGUAGE: process.env.JEZARCH_DEFAULT_LANGUAGE,
            }
        };

        // Log the comprehensive server status
        Log.info(serverLogData.message, 'system', 'startup', serverLogData);

    } catch (error) {
        console.error('!!! CRITICAL SERVER INITIALIZATION FAILED !!!', error);
        // Attempt to log the error using the Log service, but it might fail
        await Log.error('Server initialization failed critically', 'system', 'startup', error)
                 .catch(logErr => console.error('Logging service failed during critical error:', logErr));
        process.exit(1);
    }
}

main();