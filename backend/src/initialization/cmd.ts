export interface CommandLineParams {
    dbPath?: string;
    port?: number;
    defaultLanguage?: string;
    logDuration?: number; // in milliseconds
    help?: boolean;
}

export const CmdParams: CommandLineParams = {};

export function initializeCmdParams() {
    const args = Bun.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--db-path':
                CmdParams.dbPath = args[++i];
                break;

            case '--port':
                //@ts-ignore
                CmdParams.port = parseInt(args[++i]);
                break;

            case '--default-language':
                CmdParams.defaultLanguage = args[++i];
                break;

            case '--log':
                const duration = args[++i];
                if (!duration) {
                    console.error(`Invalid duration: ${duration}`);
                    process.exit(1);
                }
                const unit = duration[duration.length - 1];
                const value = parseInt(duration.substring(0, duration.length - 1));
                let durationMs: number;

                switch (unit) {
                    case 's':
                        durationMs = value * 1000;
                        break;
                    case 'm':
                        durationMs = value * 60 * 1000;
                        break;
                    case 'h':
                        durationMs = value * 60 * 60 * 1000;
                        break;
                    default:
                        throw new Error(`Unsupported time unit: ${unit}.  Use s, m, or h.`);
                }

                CmdParams.logDuration = durationMs;

                break;

            case '--help':
                CmdParams.help = true;
                break;

            default:
                console.error(`Unknown argument: ${arg}`);
                process.exit(1);
        }
    }

}

initializeCmdParams()