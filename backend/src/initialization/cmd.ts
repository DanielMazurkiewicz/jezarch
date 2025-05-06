export interface CommandLineParams {
    dbPath?: string;
    httpPort?: number; // Renamed from port
    httpsPort?: number; // New
    httpsKeyPath?: string; // New
    httpsCertPath?: string; // New
    httpsCaPath?: string; // New
    defaultLanguage?: string;
    logDuration?: number; // in milliseconds
    help?: boolean;
    debugConsole?: boolean;
}

// Initialize with an empty object, values will be populated
export const CmdParams: CommandLineParams = {};

// Renamed function for clarity, no longer sets AppParams directly
export function parseCmdParams() {
    console.log("* Parsing Command Line Parameters...");

    const args = Bun.argv.slice(2); // Get arguments after 'bun run' and script name

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        if (arg === undefined) {
            console.warn(`Undefined argument encountered at index ${i}. Skipping.`);
            continue;
        }

        // Helper to get the next argument value
        const nextArg = (): string | undefined => {
            i++; // Increment index to consume the value
            return args[i];
        };

        switch (arg) {
            case '--db-path':
                CmdParams.dbPath = nextArg();
                break;

            case '--http-port': // Renamed from --port
                const httpPortArg = nextArg();
                if (httpPortArg !== undefined) {
                    const parsedPort = parseInt(httpPortArg);
                    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
                        CmdParams.httpPort = parsedPort;
                    } else {
                        console.error(`Invalid HTTP port number: ${httpPortArg}. Must be 1-65535.`);
                        process.exit(1);
                    }
                } else {
                    console.error(`Missing port number after --http-port argument.`);
                    process.exit(1);
                }
                break;

            case '--https-port': // New
                const httpsPortArg = nextArg();
                if (httpsPortArg !== undefined) {
                    const parsedPort = parseInt(httpsPortArg);
                    if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort <= 65535) {
                        CmdParams.httpsPort = parsedPort;
                    } else {
                        console.error(`Invalid HTTPS port number: ${httpsPortArg}. Must be 1-65535.`);
                        process.exit(1);
                    }
                } else {
                    console.error(`Missing port number after --https-port argument.`);
                    process.exit(1);
                }
                break;

            case '--https-key-path': // New
                CmdParams.httpsKeyPath = nextArg();
                break;

            case '--https-cert-path': // New
                CmdParams.httpsCertPath = nextArg();
                break;

            case '--https-ca-path': // New
                CmdParams.httpsCaPath = nextArg();
                break;

            case '--default-language':
                CmdParams.defaultLanguage = nextArg();
                break;

            case '--log':
                const duration = nextArg();
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
                    case 's': durationMs = value * 1000; break;
                    case 'm': durationMs = value * 60 * 1000; break;
                    case 'h': durationMs = value * 60 * 60 * 1000; break;
                    default:
                        console.error(`Unsupported time unit: ${unit}. Use s, m, or h.`);
                        process.exit(1);
                }
                CmdParams.logDuration = durationMs;
                break;

            case '--debug-console':
                CmdParams.debugConsole = true;
                // No value needed for flags
                break;

            case '--help':
                CmdParams.help = true;
                printHelp();
                process.exit(0); // Exit after showing help
                break;

            default:
                // Handle potential values without flags or unknown flags
                if (!arg.startsWith('--')) {
                     // Ignore values without preceding flags for now, or you could error out
                     console.warn(`Ignoring argument without a flag: ${arg}.`);
                } else {
                     console.error(`Unknown argument: ${arg}`);
                     printHelp();
                     process.exit(1);
                }
        }
    }
    // Log the parsed command-line parameters
    console.log("* Parsed Command Line Parameters:", CmdParams);
}

function printHelp() {
    console.log(`
Usage: bun run src/main.ts [options]

Options:
  --db-path <path>         Path to the SQLite database file.
                           (Default: ./jezarch.sqlite.db)
  --http-port <number>     Port number for the HTTP server.
                           (Default: 8080)
  --https-port <number>    Port number for the HTTPS server.
                           (Default: 8443)
  --https-key-path <path>  Path to the HTTPS private key file (PEM format).
                           (Default: none)
  --https-cert-path <path> Path to the HTTPS certificate file (PEM format).
                           (Default: none)
  --https-ca-path <path>   Path to the HTTPS Certificate Authority chain file (PEM format).
                           (Optional, Default: none)
  --default-language <lang> Language code for the default language.
                           (Default: en)
  --log <duration><unit>   Dump logs for the specified duration and exit.
                           Units: s (seconds), m (minutes), h (hours).
                           Example: --log 5m
  --debug-console          Print all internal logs (Log.info, Log.error)
                           to the console in a readable format.
  --help                   Display this help message and exit.

Environment variables can also be used (overridden by command-line args):
  JEZARCH_DB_PATH
  JEZARCH_HTTP_PORT
  JEZARCH_HTTPS_PORT
  JEZARCH_HTTPS_KEY_PATH
  JEZARCH_HTTPS_CERT_PATH
  JEZARCH_HTTPS_CA_PATH
  JEZARCH_DEFAULT_LANGUAGE
`);
}

// Parse command line arguments immediately when the module is loaded
parseCmdParams();