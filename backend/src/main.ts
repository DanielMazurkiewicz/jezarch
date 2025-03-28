
import { initializeCmdParams } from './initialization/cmd';
import { initializeAppParams } from './initialization/app_params';
import { initializeDatabase } from './initialization/db';
import { initializeConfigs } from './initialization/config';
import { dumpLogs } from './utils/dumpLogs';
import { initializeServer } from './initialization/server';
import { Log } from './functionalities/log/db';

async function main() {
    try {
        // await initializeCmdParams(); // auto initialized in initialization file
        await initializeAppParams();
        await initializeDatabase();
        await initializeConfigs();
        await dumpLogs();
        await initializeServer();
        Log.info("Server is running")
    } catch (error) {
        await Log.error('Server initialization failed', undefined, 'startup', error);
        process.exit(1);
    }
}

main();

