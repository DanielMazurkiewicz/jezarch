import { BunRequest } from 'bun';


export const getApiStatusController = async (req: BunRequest) => {
    return new Response(JSON.stringify({
        message: "API is working"
    }), { status: 200 });
};

export const getApiPingController = async (req: BunRequest) => {
    return new Response("PONG", { status: 200 });
};

