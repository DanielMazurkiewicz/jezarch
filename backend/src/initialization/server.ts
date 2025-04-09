import { routes } from "./routes"; // Import the combined routes object
import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig} from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from "./app_params";

let server: ReturnType<typeof Bun.serve>
export type ServerOptions = Parameters<typeof Bun.serve>[0]

export async function initializeServer() {
    console.log("* initializeServer")
    const port = AppParams.port || parseInt(await getConfig(AppConfigKeys.PORT) || "0") || AppParamsDefaults.port;
    const sslKey = await getConfig(AppConfigKeys.SSL_KEY);
    const sslCert = await getConfig(AppConfigKeys.SSL_CERT);

    const serverOptions: ServerOptions = {
        development: true,

        port: port,
        routes: routes,
        // fallback for unmatched routes:
        fetch(req) {
            return new Response("Not Found", { status: 404 });
        },
        error(error: Error): Response | Promise<Response> {
            console.error("--- Bun Serve Runtime Error ---");
            console.error(error);
            console.error("-------------------------------");
            // Avoid leaking stack traces in production
            return new Response(`Internal Server Error`, { status: 500 });
        },
        tls: sslKey && sslCert ? {
            key: sslKey,
            cert: sslCert,
        } : undefined
    };
    try {
        server = Bun.serve(serverOptions);
        if (server) {
            console.log(`Server listening on ${server.url?.protocol}//${server.hostname}:${server.port}`);
       } else {
            console.error("!!! Bun.serve() did not return a server instance.");
       }
    } catch (error) {
        console.error(error)
    }
}

export const getServer = () => server;
