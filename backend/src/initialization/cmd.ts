export interface CommandLineParams {
    dbPath?: string;
    port?: number;
    defaultLanguage?: string;
    logDuration?: number; // in milliseconds
    help?: boolean;
    debugConsole?: boolean; // New flag for console debugging
}

export const CmdParams: CommandLineParams = {};

export function initializeCmdParams() {
    console.log("* initializeCmdParams")

    const args = Bun.argv.slice(2);

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        switch (arg) {
            case '--db-path':
                CmdParams.dbPath = args[++i];
                break;

            case '--port':
                const portArg = args[++i];
                const parsedPort = parseInt(portArg);
                if (!isNaN(parsedPort)) {
                    CmdParams.port = parsedPort;
                } else {
                    console.error(`Invalid port number: ${portArg}`);
                    // Keep going or exit? For now, let it potentially be overridden by config/defaults.
                    // process.exit(1);
                }
                break;

            case '--default-language':
                CmdParams.defaultLanguage = args[++i];
                break;

            case '--log':
                const duration = args[++i];
                if (!duration) {
                    console.error(`Missing duration value for --log`);
                    process.exit(1);
                }
                const unit = duration.slice(-1);
                const valueStr = duration.substring(0, duration.length - 1);
                const value = parseInt(valueStr);

                if (isNaN(value) || value <= 0) {
                     console.error(`Invalid duration value: ${valueStr}`);
                     process.exit(1);
                }

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
                        console.error(`Unsupported time unit: ${unit}. Use s, m, or h.`);
                        process.exit(1);
                }

                CmdParams.logDuration = durationMs;
                break;

            case '--debug-console': // Handle the new flag
                CmdParams.debugConsole = true;
                break;

            case '--help':
                CmdParams.help = true;
                // Print help message immediately and exit if --help is found
                printHelp();
                process.exit(0);
                break; // Though exit() prevents reaching here

            default:
                console.error(`Unknown argument: ${arg}`);
                printHelp(); // Show help on unknown argument
                process.exit(1);
        }
    }
}

function printHelp() {
    console.log(`
Usage: bun run src/main.ts [options]

Options:
  --db-path <path>        Path to the SQLite database file.
                          (Default: ./jezarch.sqlite.db)
  --port <number>         Port number for the server to listen on.
                          (Default: 8080)
  --default-language <lang> Language code for the default language.
                          (Default: en)
  --log <duration><unit>  Dump logs for the specified duration and exit.
                          Units: s (seconds), m (minutes), h (hours).
                          Example: --log 5m
  --debug-console         Print all internal logs (Log.info, Log.error)
                          to the console in a readable format.
  --help                  Display this help message and exit.

Environment variables can also be used:
  JEZARCH_DB_PATH
  JEZARCH_PORT
  JEZARCH_DEFAULT_LANGUAGE
`);
}


// Initialize immediately when the module is loaded
initializeCmdParams();