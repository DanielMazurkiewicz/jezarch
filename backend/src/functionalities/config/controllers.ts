import { BunRequest } from 'bun';
import { getConfig, setConfig } from './db';
import { AppConfigKeys, Config } from './models';
import { getSessionAndUser, isAllowedRole } from '../session/controllers';
import { Log } from '../log/db';

export const getConfigController = async (req: BunRequest<":key">) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    const key = req?.params?.key as AppConfigKeys;
    switch (key) {
        case AppConfigKeys.DEFAULT_LANGUAGE: {
            if (!isAllowedRole(sessionAndUser, 'admin', "regular_user")) return new Response("Forbidden", { status: 403 });
            break;
        }
        default:
            if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });
    }
    

    try {
        const value = await getConfig(key);
        return new Response(JSON.stringify({ [key]: value }), { status: 200 });
    } catch (error) {
        await Log.error('Error getting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to get config', error: error }), { status: 500 });
    }
};

export const setConfigController = async (req: BunRequest) => {
    const sessionAndUser = await getSessionAndUser(req);
    if (!sessionAndUser) return new Response("Unauthorized", { status: 401 });
    if (!isAllowedRole(sessionAndUser, 'admin')) return new Response("Forbidden", { status: 403 });

    try {
        const body = await req.json() as Config;

        const key = body.key as AppConfigKeys;
        const value = body.value;

        await setConfig(key, value);
        return new Response(JSON.stringify({ message: 'Config updated successfully' }), { status: 200 });
    } catch (error) {
        await Log.error('Error setting config', sessionAndUser.user.login, 'config', error);
        return new Response(JSON.stringify({ message: 'Failed to set config', error: error }), { status: 500 });
    }
};

