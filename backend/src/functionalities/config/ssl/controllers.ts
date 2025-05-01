import { getConfig, setConfig } from '../db';
import { AppConfigKeys } from '../models';
import { generateSelfSignedCert } from '../../../utils/generateSelfSignedCert';
import { BunRequest } from 'bun';
import { SslConfig } from './models';
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';
// Removed: import { triggerServerRestart } from '../../../utils/server_restart';

export const uploadSslController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as SslConfig;
        const key = body.key;
        const cert = body.cert;

        if (!key || !cert) {
            return new Response(JSON.stringify({ message: 'Key and certificate are required' }), { status: 400 });
        }

        // Uploading SSL files always requires a restart
        await setConfig(AppConfigKeys.SSL_KEY, key);
        await setConfig(AppConfigKeys.SSL_CERT, cert);
        await Log.info('SSL configuration uploaded', sessionAndUser.user.login, 'ssl');

        // Updated message to require manual restart
        const responseMessage = 'SSL configuration updated successfully. Manual server restart required for changes to take effect.';
        const response = new Response(JSON.stringify({ message: responseMessage }), { status: 200 });

        // Removed automatic restart trigger

        return response;

    } catch (error: any) {
        await Log.error('Error uploading SSL config', sessionAndUser.user.login, 'ssl', error);
         return new Response(JSON.stringify({ message: 'Failed to upload SSL config', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
         });
    }
};

export const generateSslController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const { key, cert } = await generateSelfSignedCert();

        // Generating new SSL files also requires a restart
        await setConfig(AppConfigKeys.SSL_KEY, key);
        await setConfig(AppConfigKeys.SSL_CERT, cert);
        await Log.info('Self-signed SSL certificate generated and saved', sessionAndUser.user.login, 'ssl');

        // Updated message to require manual restart
        const responseMessage = 'Self-signed SSL certificate generated and saved. Manual server restart required for changes to take effect.';
        const response = new Response(JSON.stringify({ message: responseMessage }), { status: 201 });

        // Removed automatic restart trigger

        return response;

    } catch (error: any) {
        await Log.error('Error generating SSL certificate', sessionAndUser.user.login, 'ssl', error);
         return new Response(JSON.stringify({ message: 'Failed to generate SSL certificate', error: error.message ?? String(error) }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
         });
    }
};


// Expose SSL controllers through the main config controller
export const sslControllers = {
    uploadSslController,
    generateSslController,
};