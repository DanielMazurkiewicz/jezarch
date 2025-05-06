// backend/src/initialization/server.ts
import { routes, Routes } from "./routes"; // Import the Routes type
import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig } from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from "./app_params";
import { Log } from '../functionalities/log/db'; // Import Log
import path from 'node:path';
// Import necessary types
import { ServeOptions, Server, TLSServeOptions, FileBlob } from 'bun'; // Include FileBlob

let server: Server;

const currentDir = import.meta.dir;
export const publicDir = path.resolve(currentDir, '../../../frontend-react/dist'); // Export publicDir
// const publicDir = path.resolve(currentDir, '../../../frontend-solid/dist');
// const publicDir = path.resolve(currentDir, '../../../frontend-vanilla/dist');
console.log(`* Serving static files from: ${publicDir}`);

// Export variables to hold server status for logging
export let isSslEnabled: boolean = false;
export let serverHostname: string | undefined = undefined;
export let serverPort: number | undefined = undefined;

export async function initializeServer() {
    console.log("* initializeServer");
    const port = AppParams.httpPort


    // Define MyServerOptions independently, ensuring compatibility with Bun.serve
    // This structure aims to match the overload where 'routes' is provided.
    interface MyServerOptions {
        port: number; // We require and provide a number
        // Align fetch return type strictly with base ServeOptions (must return Response or Promise<Response>)
        fetch: (req: Request, server: Server) => Promise<Response> | Response;
        routes: Routes; // We require routes
        error: (error: Error) => Response | Promise<Response>; // We require error handler
        // Define TLS structure based on TLSServeOptions['tls']
        tls?: {
            key?: FileBlob | string;
            cert?: FileBlob | string;
            ca?: FileBlob | string | (FileBlob | string)[];
            passphrase?: string;
            dhParamsFile?: string;
            // Removed 'secureOptions' as it might not be standard or needed here
            // secureOptions?: number;
        };
        development?: boolean; // Optional development flag
        hostname?: string; // Optional hostname
        // Base path for routes can be added if needed:
        // baseURI?: string;
    }

    const serverOptions: MyServerOptions = {
        port: port,

        // Ensure the fetch function implementation matches the stricter return type
        async fetch(req, serverInstance: Server): Promise<Response> {
            const url = new URL(req.url);
            let pathname = url.pathname;

            // Fetch handler is the fallback when no API route matches
            // Log.info(`No API route matched ${pathname}, attempting static file serve...`, 'system', 'server'); // Optional: more verbose logging

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

            // Security check: Ensure resolved path is still within the public directory
            if (!resolvedPath.startsWith(publicDir)) {
                await Log.warn(`Forbidden path access attempt: ${requestedPath}`, 'system', 'security', { resolvedPath, publicDir });
                return new Response("Forbidden", { status: 403 });
            }

            try {
                const file = Bun.file(resolvedPath);
                const exists = await file.exists();

                if (exists && (await file.stat()).isFile()) {
                    // Log.info(`Serving static file: ${requestedPath}`, 'system', 'server', { resolvedPath }); // Optional: log successful serves
                    return new Response(file);
                } else {
                     // Log.info(`Static file not found or is directory: ${requestedPath}`, 'system', 'server', { resolvedPath }); // Optional: log not found
                     // Check if it's an asset request or potential SPA route
                     const isAssetRequest = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i.test(requestedPath);
                     if (!isAssetRequest) {
                         // If not an asset, try serving index.html for SPA routing
                         const indexPath = path.join(publicDir, 'index.html');
                         const indexFile = Bun.file(indexPath);
                         if (await indexFile.exists()) {
                            // Log.info(`Serving SPA fallback: ${requestedPath}`, 'system', 'server', { indexPath }); // Optional: log SPA fallback
                            return new Response(indexFile);
                         }
                     }
                    // If it's an asset or index.html doesn't exist, return 404
                    // Log.info(`Final fallback: 404 Not Found for ${requestedPath}`, 'system', 'server'); // Optional: log final 404
                    return new Response("Not Found", { status: 404 });
                }
            } catch (error: any) {
                 await Log.error(`Error accessing file ${resolvedPath}`, 'system', 'server', error);
                 if (error.code === 'ENOENT') {
                      // Return 404 if file doesn't exist after checks
                      return new Response("Not Found", { status: 404 });
                 }
                 // Ensure error cases also return a Response
                 return new Response("Internal Server Error", { status: 500 });
            }
        },
        // error handler definition
        async error(error: Error): Promise<Response> { // Can be async to use Log
            await Log.error("Bun Serve Runtime Error", 'system', 'server', error);
            return new Response(`Internal Server Error`, { status: 500 });
        },
        // tls definition using Bun.file
        tls: isSslEnabled ? {
            key: undefined, 
            cert: undefined,
        } : undefined,
         development: process.env.NODE_ENV !== 'production',
         routes: routes, // Pass the imported routes object
         // Optionally set hostname if needed, default is localhost
         // hostname: "0.0.0.0", // Example: listen on all interfaces
    };
    try {
        // Pass the options. The cast might still be needed if TS struggles with the overload resolution.
        server = Bun.serve(serverOptions as ServeOptions);
        if (server) {
            // Store hostname and port after server starts
            serverHostname = server.hostname;
            serverPort = server.port;
            console.log(`Server listening on ${server.url?.protocol}//${serverHostname}:${serverPort}`);
        } else {
            // This case should ideally use Log.error, but if Log itself failed, console.error is the fallback
            console.error("!!! Bun.serve() did not return a server instance.");
            await Log.error("Bun.serve() did not return a server instance", 'system', 'startup');
        }
    } catch (error: any) {
         // Use console.error here as logging might not be available if server start fails critically
        console.error("Failed to start server:", error);
        // Attempt to log, but it might fail if the error is DB-related
        await Log.error('Failed to start server', 'system', 'startup', error).catch(console.error);
        process.exit(1);
    }
}

export const getServer = () => server;