import { getAllLogs, Log } from "../functionalities/log/db";
import { CmdParams } from "../initialization/cmd";

export const dumpLogs = async () => {
    if (CmdParams.logDuration) {
        // Dump logs if --log is specified
        console.log(`Dumping logs for ${CmdParams.logDuration / 1000} seconds...`);
        const logs = await getAllLogs(); // Assuming you have a getAllLogs function in your log db

        logs.forEach(logEntry => {
            console.log(`[${logEntry.createdOn}] [Level: ${logEntry.level}] User:${logEntry.userId || 'system'} Category:${logEntry.category || 'general'}: ${logEntry.message}`);
            if (logEntry.data) {
                try {
                    console.log(JSON.stringify(JSON.parse(logEntry.data), null, 2))
                } catch (e) {
                    console.log(logEntry.data)
                }
            }
        });
        process.exit(0); // Exit after dumping logs
    }
}