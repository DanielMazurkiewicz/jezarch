import { getConfig, setConfig } from '../db';
import { AppConfigKeys } from '../models';
import { generateSelfSignedCert } from '../../../utils/generateSelfSignedCert';
import { BunRequest } from 'bun';
import { SslConfig } from './models';
import { getSessionAndUser, isAllowedRole } from '../../session/controllers';
import { Log } from '../../log/db';

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

        await setConfig(AppConfigKeys.SSL_KEY, key);
        await setConfig(AppConfigKeys.SSL_CERT, cert);

        return new Response(JSON.stringify({ message: 'SSL configuration updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Error uploading SSL config', sessionAndUser.user.login, 'ssl', error);
        return new Response(JSON.stringify({ message: 'Failed to upload SSL config', error: error }), { status: 500 });
    }
};

export const generateSslController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const { key, cert } = await generateSelfSignedCert();

        await setConfig(AppConfigKeys.SSL_KEY, key);
        await setConfig(AppConfigKeys.SSL_CERT, cert);

        return new Response(JSON.stringify({ message: 'Self-signed SSL certificate generated and saved' }), { status: 201 });
    } catch (error) {
        await Log.error('Error generating SSL certificate', sessionAndUser.user.login, 'ssl', error);
        return new Response(JSON.stringify({ message: 'Failed to generate SSL certificate', error: error }), { status: 500 });
    }
};


// Expose SSL controllers through the main config controller
export const sslControllers = {
    uploadSslController,
    generateSslController,
};
