// backend/src/initialization/server.ts
import { routes } from "./routes";
import { AppParams } from "./app_params";
import { Log } from '../functionalities/log/db';
import type { Routes } from './routes';
import type { RouterTypes } from 'bun';
import path from 'node:path';
import { existsSync, watch } from 'node:fs'; // Added watch
import type { ServeOptions, Server, TLSServeOptions, WebSocketServeOptions, FileBlob } from 'bun';
import { EventEmitter } from 'node:events'; // Added EventEmitter

// --- Global Variables ---
let httpServer: Server | null = null;
let httpsServer: Server | null = null;
let httpsOptions: TLSServeOptions | null = null; // Store current TLS options
const fileWatcherEmitter = new EventEmitter(); // For signaling file changes
let watchDebounceTimeout: ReturnType<typeof setTimeout> | null = null;
const WATCH_DEBOUNCE_DELAY = 10000; // 10 seconds

// --- Exported Status Variables ---
export let isSslEnabled: boolean = false;
export let httpHostname: string | undefined = undefined;
export let httpPort: number | undefined = undefined;
export let httpsHostname: string | undefined = undefined;
export let httpsPort: number | undefined = undefined;
function findPublicDir(): string {
    const starts = [process.cwd(), import.meta.dir];
    for (const start of starts) {
        let dir: string | null = path.resolve(start);
        while (dir) {
            const candidate = path.join(dir, 'frontend', 'dist');
            if (existsSync(path.join(candidate, 'index.html'))) return candidate;
            const parent = path.dirname(dir);
            if (parent === dir) break;
            dir = parent;
        }
    }
    return path.resolve(import.meta.dir, '../../../frontend/dist');
}
export const publicDir = findPublicDir();
console.log(`* Serving static files from: ${publicDir}`);

// --- Helper Functions ---

/** Security headers applied to every response (API + static). */
function withSecurityHeaders(response: Response): Response {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('Referrer-Policy', 'same-origin');
    if (isSslEnabled) {
        response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    return response;
}

// Common fetch handler for both HTTP and HTTPS servers
async function handleFetch(req: Request, serverInstance: Server): Promise<Response> {
    const url = new URL(req.url);
    let pathname = url.pathname;

    // Unmatched /api/* routes must never fall through to the SPA shell —
    // clients would otherwise parse HTML as a failed JSON payload.
    const isApiRequest = pathname === '/api' || pathname.startsWith('/api/');

    try {
        pathname = decodeURIComponent(pathname);
    } catch (e: any) {
        await Log.error("Failed to decode pathname", 'system', 'server', { pathname, error: e });
        return withSecurityHeaders(new Response("Bad Request", { status: 400 }));
    }

    if (isApiRequest) {
        return withSecurityHeaders(new Response(JSON.stringify({ message: 'Not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
    }

    let requestedPath = pathname;
    if (requestedPath === '/' || requestedPath.endsWith('/')) {
        requestedPath = path.join(requestedPath, 'index.html');
    }

    const filePath = path.join(publicDir, requestedPath);
    const resolvedPath = path.resolve(filePath);

    // Exact-match or true subpath check: a bare prefix test would also accept
    // sibling directories such as ".../frontend/dist-evil".
    if (resolvedPath !== publicDir && !resolvedPath.startsWith(publicDir + path.sep)) {
        await Log.warn(`Forbidden path access attempt: ${requestedPath}`, 'system', 'security', { resolvedPath, publicDir });
        return withSecurityHeaders(new Response("Forbidden", { status: 403 }));
    }

    try {
        const file = Bun.file(resolvedPath);
        const exists = await file.exists();

        if (exists && (await file.stat()).isFile()) {
            return withSecurityHeaders(new Response(file));
        } else {
            const isAssetRequest = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i.test(requestedPath);
            if (!isAssetRequest) {
                const indexPath = path.join(publicDir, 'index.html');
                const indexFile = Bun.file(indexPath);
                if (await indexFile.exists()) {
                    return withSecurityHeaders(new Response(indexFile));
                }
            }
            return withSecurityHeaders(new Response("Not Found", { status: 404 }));
        }
    } catch (error: any) {
        await Log.error(`Error accessing file ${resolvedPath}`, 'system', 'server', error);
        if (error.code === 'ENOENT') {
            return withSecurityHeaders(new Response("Not Found", { status: 404 }));
        }
        return withSecurityHeaders(new Response("Internal Server Error", { status: 500 }));
    }
}

// Common error handler
async function handleError(error: Error): Promise<Response> {
    await Log.error("Bun Serve Runtime Error", 'system', 'server', error);
    return withSecurityHeaders(new Response(`Internal Server Error`, { status: 500 }));
}

// Graceful shutdown: stop accepting connections, close the DB cleanly.
let shuttingDown = false;
async function shutdown(signal: string) {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`\n* Received ${signal}, shutting down...`);
    try {
        httpServer?.stop(true);
        httpsServer?.stop(true);
        const { closeDatabase } = await import('./db');
        closeDatabase();
        console.log('* Shutdown complete.');
    } catch (error) {
        console.error('* Error during shutdown:', error);
    }
    process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Function to load TLS files safely
function loadTlsFiles(keyPath: string, certPath: string, caPath?: string | null): Pick<TLSServeOptions, 'key' | 'cert' | 'ca'> | null {
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
            // ...httpsServer.development, // Reuse existing server options like hostname, fetch, error etc.
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
              const reloadOptions: ServeOptions & { tls: any } & { routes: RouterTypes.RouteValue<string> } = {
                  port: httpsPort!,
                  hostname: httpsHostname,
                  development: process.env.NODE_ENV !== 'production',
                  fetch: handleFetch,
                  error: handleError,
                  tls: newTlsConfig,
                  routes: routes,
              };

            const reloaded = httpsServer.reload(reloadOptions as unknown as WebSocketServeOptions);

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
    };

    // --- Start HTTP Server ---
    try {
        httpServer = Bun.serve({
            ...baseServerOptions,
            port: AppParams.httpPort,
            routes: routes,
        } as ServeOptions);
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
                    routes: routes,
                 } as unknown as TLSServeOptions;
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