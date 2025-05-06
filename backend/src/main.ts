
import { initializeCmdParams, CmdParams } from './initialization/cmd'; // Import CmdParams
import { initializeAppParams, AppParams } from './initialization/app_params'; // Import AppParams
import { initializeDatabase, dbForeignKeysEnabled, dbJournalMode } from './initialization/db'; // Import DB status vars
import { initializeConfigs } from './initialization/config';
import { dumpLogs } from './utils/dumpLogs';
import { initializeServer, publicDir, isSslEnabled, serverHostname, serverPort } from './initialization/server'; // Import server status vars
import { Log } from './functionalities/log/db';

async function main() {
    try {
        // Initialization sequence
        // initializeCmdParams is called automatically on import
        await initializeAppParams();
        await initializeDatabase();
        await initializeConfigs();
        await dumpLogs(); // Exits if --log is used
        await initializeServer();

        // Gather data for the final log message
        const serverLogData = {
            message: `Server initialized and running.`,
            config: {
                port: AppParams.port, // Final port used
                hostname: serverHostname, // Actual hostname server is listening on
                dbPath: AppParams.dbPath,
                defaultLanguage: AppParams.defaultLanguage,
                sslEnabled: isSslEnabled,
                staticFilesDir: publicDir,
            },
            db: {
                foreignKeys: dbForeignKeysEnabled ? 'ON' : 'OFF',
                journalMode: dbJournalMode,
            },
            cmdParams: CmdParams, // Log command line parameters provided
            envVars: { // Optionally log relevant env vars (be careful with secrets)
                JEZARCH_DB_PATH: process.env.JEZARCH_DB_PATH,
                JEZARCH_PORT: process.env.JEZARCH_PORT,
                JEZARCH_DEFAULT_LANGUAGE: process.env.JEZARCH_DEFAULT_LANGUAGE,
            }
        };

        // Log the comprehensive server status
        Log.info(serverLogData.message, 'system', 'startup', serverLogData);

    } catch (error) {
        // Use console.error as a fallback if logging system fails during startup
        console.error('!!! CRITICAL SERVER INITIALIZATION FAILED !!!', error);
        // Attempt to log the error using the Log service, but it might fail
        await Log.error('Server initialization failed critically', 'system', 'startup', error)
                 .catch(logErr => console.error('Logging service failed during critical error:', logErr));
        process.exit(1);
    }
}

main();