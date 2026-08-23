import { getAllLogs, Log } from "../functionalities/log/db";
import { CmdParams } from "../initialization/cmd";

export const dumpLogs = async () => {
    if (CmdParams.logDuration) {
        // Dump logs from the requested time window (e.g. --log 5m) and exit
        console.log(`Dumping logs from the last ${CmdParams.logDuration / 1000} seconds...`);
        const logs = await getAllLogs(CmdParams.logDuration);

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