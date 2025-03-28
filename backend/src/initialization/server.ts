import { routes } from "./routes"; // Import the combined routes object
import { AppConfigKeys } from '../functionalities/config/models';
import { getConfig} from '../functionalities/config/db';
import { AppParams, AppParamsDefaults } from "./app_params";


let server: ReturnType<typeof Bun.serve>
export type ServerOptions = Parameters<typeof Bun.serve>[0]

export async function initializeServer() {
    const port = AppParams.port || parseInt(await getConfig(AppConfigKeys.PORT) || "0") || AppParamsDefaults.port;
    const sslKey = await getConfig(AppConfigKeys.SSL_KEY);
    const sslCert = await getConfig(AppConfigKeys.SSL_CERT);

    const serverOptions: ServerOptions = {
        port: port,
        routes: routes,
        // (optional) fallback for unmatched routes:
        fetch(req) {
            return new Response("Not Found", { status: 404 });
        },
        tls: sslKey && sslCert ? {
            key: sslKey,
            cert: sslCert,
        } : undefined
    };

    server = Bun.serve(serverOptions);
}

export const getServer = () => server;
