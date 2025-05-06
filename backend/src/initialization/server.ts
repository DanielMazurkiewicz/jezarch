// backend/src/initialization/server.ts
import { routes, Routes } from "./routes";
import { AppParams } from "./app_params";
import { Log } from '../functionalities/log/db';
import path from 'node:path';
import { existsSync, watch } from 'node:fs'; // Added watch
import type { ServeOptions, Server, TLSServeOptions, WebSocketServeOptions, FileBlob } from 'bun';
import { EventEmitter } from 'node:events'; // Added EventEmitter

// --- Global Variables ---
let httpServer: Server | null = null;
let httpsServer: Server | null = null;
let httpsOptions: TLSServeOptions | null = null; // Store current TLS options
const fileWatcherEmitter = new EventEmitter(); // For signaling file changes
let watchDebounceTimeout: NodeJS.Timeout | null = null;
const WATCH_DEBOUNCE_DELAY = 10000; // 10 seconds

// --- Exported Status Variables ---
export let isSslEnabled: boolean = false;
export let httpHostname: string | undefined = undefined;
export let httpPort: number | undefined = undefined;
export let httpsHostname: string | undefined = undefined;
export let httpsPort: number | undefined = undefined;
export const publicDir = path.resolve(import.meta.dir, '../../../frontend-react/dist');
console.log(`* Serving static files from: ${publicDir}`);

// --- Helper Functions ---

// Common fetch handler for both HTTP and HTTPS servers
async function handleFetch(req: Request, serverInstance: Server): Promise<Response> {
    const url = new URL(req.url);
    let pathname = url.pathname;

    try {
        pathname = decodeURIComponent(pathname);
    } catch (e: any) {
        await Log.error("Failed to decode pathname", 'system', 'server', { pathname, error: e });
        return new Response("Bad Request", { status: 400 });
    }

    let requestedPath = pathname;
    if (requestedPath === '/' || requestedPath.endsWith('/')) {
        requestedPath = path.join(requestedPath, 'index.html');
    }

    const filePath = path.join(publicDir, requestedPath);
    const resolvedPath = path.resolve(filePath);

    if (!resolvedPath.startsWith(publicDir)) {
        await Log.warn(`Forbidden path access attempt: ${requestedPath}`, 'system', 'security', { resolvedPath, publicDir });
        return new Response("Forbidden", { status: 403 });
    }

    try {
        const file = Bun.file(resolvedPath);
        const exists = await file.exists();

        if (exists && (await file.stat()).isFile()) {
            return new Response(file);
        } else {
            const isAssetRequest = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i.test(requestedPath);
            if (!isAssetRequest) {
                const indexPath = path.join(publicDir, 'index.html');
                const indexFile = Bun.file(indexPath);
                if (await indexFile.exists()) {
                    return new Response(indexFile);
                }
            }
            return new Response("Not Found", { status: 404 });
        }
    } catch (error: any) {
        await Log.error(`Error accessing file ${resolvedPath}`, 'system', 'server', error);
        if (error.code === 'ENOENT') {
            return new Response("Not Found", { status: 404 });
        }
        return new Response("Internal Server Error", { status: 500 });
    }
}

// Common error handler
async function handleError(error: Error): Promise<Response> {
    await Log.error("Bun Serve Runtime Error", 'system', 'server', error);
    return new Response(`Internal Server Error`, { status: 500 });
}

// Function to load TLS files safely
function loadTlsFiles(keyPath: string, certPath: string, caPath?: string | null): Omit<TLSServeOptions, 'port'> | null {
    try {
        const key = Bun.file(keyPath);
        const cert = Bun.file(certPath);
        let ca: FileBlob | undefined = undefined;

        if (!key.size || !cert.size) {
             Log.error("HTTPS key or cert file is empty.", 'system', 'startup', { keyPath, certPath });
             return null;
        }

        if (caPath) {
            const caFile = Bun.file(caPath);
            if (caFile.size) {
                ca = caFile;
            } else {
                Log.warn("CA certificate path provided, but file is empty.", 'system', 'startup', { caPath });
            }
        }

        console.log(`* Loading TLS files: Key=${keyPath}, Cert=${certPath}${ca ? `, CA=${caPath}` : ''}`);
        return { key, cert, ca };
    } catch (error: any) {
        Log.error("Failed to load TLS files", 'system', 'startup', { keyPath, certPath, caPath, error });
        return null;
    }
}

// Function to watch TLS files and trigger reload
function watchTlsFiles() {
    const filesToWatch = [AppParams.httpsKeyPath, AppParams.httpsCertPath, AppParams.httpsCaPath].filter(Boolean) as string[];
    if (filesToWatch.length === 0) return; // No files to watch

    console.log("* Starting file watchers for TLS files:", filesToWatch);

    filesToWatch.forEach(filePath => {
        if (!existsSync(filePath)) {
             Log.warn(`Cannot watch non-existent TLS file: ${filePath}`, 'system', 'server');
             return; // Skip watching if file doesn't exist initially
        }
        try {
            watch(filePath, (eventType, filename) => {
                if (filename) {
                    Log.info(`TLS file change detected: ${eventType} on ${filename}`, 'system', 'server');
                    // Debounce the reload signal
                    if (watchDebounceTimeout) clearTimeout(watchDebounceTimeout);
                    watchDebounceTimeout = setTimeout(() => {
                        fileWatcherEmitter.emit('reloadTls');
                        watchDebounceTimeout = null;
                    }, WATCH_DEBOUNCE_DELAY);
                }
            });
        } catch (error) {
             Log.error(`Failed to start file watcher for ${filePath}`, 'system', 'server', error);
        }
    });
}

// Function to handle TLS reload logic
async function handleTlsReload() {
    console.log("* Reloading TLS configuration...");
    if (!httpsServer) {
        Log.warn("handleTlsReload called but HTTPS server is not running.", 'system', 'server');
        return;
    }

    const newTlsConfig = loadTlsFiles(AppParams.httpsKeyPath!, AppParams.httpsCertPath!, AppParams.httpsCaPath);

    if (newTlsConfig) {
        httpsOptions = {
            ...httpsServer.development, // Reuse existing server options like hostname, fetch, error etc.
            port: httpsPort!, // Use the existing port
            ...newTlsConfig, // Apply new key/cert/ca
            development: process.env.NODE_ENV !== 'production',
             fetch: handleFetch, // Re-apply fetch handler
             error: handleError, // Re-apply error handler
             // We need to be careful here. Server.reload() needs the full options.
             // Let's construct the full options again.
             // Bun doesn't directly expose routes after start, so we re-pass them.
        };

        try {
            // Reconstruct the full server options for reload
             const reloadOptions: ServeOptions = {
                 port: httpsPort!,
                 hostname: httpsHostname,
                 development: process.env.NODE_ENV !== 'production',
                 fetch: handleFetch,
                 error: handleError,
                 tls: newTlsConfig, // Use the newly loaded config
                 routes: routes, // Re-apply routes
                 websocket: undefined, // Assuming no websockets for now
             };

            const reloaded = httpsServer.reload(reloadOptions as WebSocketServeOptions); // Type assertion might be needed

            if (reloaded) {
                 isSslEnabled = true; // Ensure status reflects loaded state
                 Log.info("HTTPS server TLS configuration reloaded successfully.", 'system', 'server');
            } else {
                 Log.error("httpsServer.reload() returned false. TLS reload failed.", 'system', 'server');
            }
        } catch (reloadError) {
            Log.error("Error during httpsServer.reload()", 'system', 'server', reloadError);
        }
    } else {
        Log.error("Failed to load new TLS files during reload. HTTPS server might be using old config or become unavailable.", 'system', 'server');
        // Optionally stop the HTTPS server if files are invalid?
        // httpsServer.stop(); httpsServer = null; isSslEnabled = false;
    }
}


// --- Main Initialization ---
export async function initializeServer() {
    console.log("* initializeServer: Starting HTTP server...");

    // --- Base Server Options (Common for HTTP/HTTPS) ---
    const baseServerOptions: Omit<ServeOptions, 'port' | 'tls'> = {
        hostname: "0.0.0.0", // Listen on all interfaces by default
        fetch: handleFetch,
        error: handleError,
        development: process.env.NODE_ENV !== 'production',
        routes: routes,
    };

    // --- Start HTTP Server ---
    try {
        httpServer = Bun.serve({
            ...baseServerOptions,
            port: AppParams.httpPort,
        });
        httpHostname = httpServer.hostname;
        httpPort = httpServer.port;
        console.log(`* HTTP Server listening on http://${httpHostname}:${httpPort}`);
    } catch (error: any) {
        Log.error('Failed to start HTTP server', 'system', 'startup', error);
        console.error("!!! CRITICAL: Failed to start HTTP server:", error);
        process.exit(1); // Exit if HTTP fails
    }

    // --- Start HTTPS Server (if configured and files exist) ---
    if (AppParams.httpsKeyPath && AppParams.httpsCertPath) {
        console.log("* HTTPS configuration detected. Attempting to start HTTPS server...");
        const initialTlsConfig = loadTlsFiles(AppParams.httpsKeyPath, AppParams.httpsCertPath, AppParams.httpsCaPath);

        if (initialTlsConfig) {
            try {
                 httpsOptions = {
                    ...baseServerOptions,
                    port: AppParams.httpsPort,
                    tls: initialTlsConfig,
                 };
                httpsServer = Bun.serve(httpsOptions as ServeOptions);
                httpsHostname = httpsServer.hostname;
                httpsPort = httpsServer.port;
                isSslEnabled = true;
                console.log(`* HTTPS Server listening on https://${httpsHostname}:${httpsPort}`);

                // Start watching files only AFTER successful HTTPS server start
                 watchTlsFiles();
                 // Listen for reload events
                 fileWatcherEmitter.on('reloadTls', handleTlsReload);

            } catch (error: any) {
                Log.error('Failed to start HTTPS server', 'system', 'startup', { error, key: AppParams.httpsKeyPath, cert: AppParams.httpsCertPath });
                console.error("!!! WARNING: Failed to start HTTPS server:", error);
                // Continue running HTTP only
            }
        } else {
            Log.warn("HTTPS configuration paths set, but failed to load key/cert files. HTTPS server not started.", 'system', 'startup');
        }
    } else {
        console.log("* HTTPS key/cert paths not configured. Skipping HTTPS server.");
    }
}

// --- Getters and Control Functions ---
export const getHttpServer = () => httpServer;
export const getHttpsServer = () => httpsServer;

// Function to be called when config changes require TLS reload
export function reloadTlsConfiguration() {
     if (!isSslEnabled || !httpsServer) {
         Log.warn("reloadTlsConfiguration called, but HTTPS is not enabled or server not running.", 'system', 'server');
         // If paths *are* now set, perhaps try starting the server? Complex.
         // For now, just reload if already running.
         return;
     }
     // Trigger the reload process directly
     handleTlsReload();
}

// Function to stop the HTTPS server (e.g., when config is cleared)
export function stopHttpsServer() {
    if (httpsServer) {
        console.log("* Stopping HTTPS server...");
        httpsServer.stop(true); // true for graceful shutdown
        httpsServer = null;
        httpsOptions = null;
        isSslEnabled = false;
        httpsHostname = undefined;
        httpsPort = undefined;
        // Clear file watchers? More complex, maybe just let them error silently or manage them.
        fileWatcherEmitter.off('reloadTls', handleTlsReload); // Stop listening
        Log.info("HTTPS server stopped.", 'system', 'server');
    }
}

// Function to potentially start HTTPS server if config is added later (more complex)
// export async function startHttpsServerIfNeeded() { ... }