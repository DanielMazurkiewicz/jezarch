// backend/src/initialization/server.ts
import { routes, Routes } from "./routes"; // Import the Routes type
import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig } from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from "./app_params";

import path from 'node:path';
// Import necessary types
import { ServeOptions, Server, TLSServeOptions, FileBlob } from 'bun'; // Include FileBlob

let server: Server;

const currentDir = import.meta.dir;
const publicDir = path.resolve(currentDir, '../../../frontend/dist');
console.log(`* Serving static files from: ${publicDir}`);


export async function initializeServer() {
    console.log("* initializeServer");
    const port = AppParams.port || parseInt(await getConfig(AppConfigKeys.PORT) || "0") || AppParamsDefaults.port;
    const sslKeyPath = await getConfig(AppConfigKeys.SSL_KEY);
    const sslCertPath = await getConfig(AppConfigKeys.SSL_CERT);

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
            console.log(`No API route matched ${pathname}, attempting static file serve...`);

            try {
                pathname = decodeURIComponent(pathname);
            } catch (e) {
                console.error("Failed to decode pathname:", pathname);
                return new Response("Bad Request", { status: 400 });
            }

            let requestedPath = pathname;
            if (requestedPath === '/' || requestedPath.endsWith('/')) {
                 requestedPath = path.join(requestedPath, 'index.html');
            }

            const filePath = path.join(publicDir, requestedPath);
            const resolvedPath = path.resolve(filePath);

            if (!resolvedPath.startsWith(publicDir)) {
                console.warn(`Forbidden path access attempt: ${requestedPath} resolved outside public directory (${publicDir})`);
                return new Response("Forbidden", { status: 403 });
            }

            try {
                const file = Bun.file(resolvedPath);
                const exists = await file.exists();

                if (exists && (await file.stat()).isFile()) {
                    console.log(`Serving static file: ${requestedPath} -> ${resolvedPath}`);
                    return new Response(file);
                } else {
                     console.log(`Static file not found or is directory: ${requestedPath} -> ${resolvedPath}`);
                     const isAssetRequest = /\.(css|js|json|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|map)$/i.test(requestedPath);
                     if (!isAssetRequest) {
                         const indexPath = path.join(publicDir, 'index.html');
                         const indexFile = Bun.file(indexPath);
                         if (await indexFile.exists()) {
                            console.log(`Serving SPA fallback: ${requestedPath} -> ${indexPath}`);
                            return new Response(indexFile);
                         }
                     }
                    console.log(`Final fallback: 404 Not Found for ${requestedPath}`);
                    return new Response("Not Found", { status: 404 });
                }
            } catch (error: any) {
                 console.error(`Error accessing file ${resolvedPath}:`, error);
                 if (error.code === 'ENOENT') {
                      return new Response("Not Found", { status: 404 });
                 }
                 // Ensure error cases also return a Response
                 return new Response("Internal Server Error", { status: 500 });
            }
        },
        // error handler definition
        error(error: Error): Response { // Explicitly return Response
            console.error("--- Bun Serve Runtime Error ---");
            console.error(error);
            console.error("-------------------------------");
            return new Response(`Internal Server Error`, { status: 500 });
        },
        // tls definition using Bun.file
        tls: sslKeyPath && sslCertPath ? {
            key: Bun.file(sslKeyPath),
            cert: Bun.file(sslCertPath),
        } : undefined,
         development: process.env.NODE_ENV !== 'production',
         routes: routes, // Pass the imported routes object
    };
    try {
        // Pass the options. The cast might still be needed if TS struggles with the overload resolution.
        server = Bun.serve(serverOptions as ServeOptions);
        if (server) {
            console.log(`Server listening on ${server.url?.protocol}//${server.hostname}:${server.port}`);
        } else {
            console.error("!!! Bun.serve() did not return a server instance.");
        }
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}

export const getServer = () => server;