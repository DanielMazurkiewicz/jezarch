export const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const jsonError = (message: string, status = 500, details?: unknown) =>
    jsonResponse({ message, ...(details !== undefined ? { error: details } : {}) }, status);

/**
 * Uniform 500 response: full details go to the server log only — the client
 * receives an opaque message (internal errors previously leaked SQL/paths).
 */
export const jsonInternalError = async (
    error: unknown,
    context: { userLogin?: string; area: string; action: string }
): Promise<Response> => {
    // Imported lazily to avoid a circular import with the Log module.
    const { Log } = await import('../functionalities/log/db');
    await Log.error(context.action, context.userLogin, context.area, error);
    return jsonError('Internal server error', 500);
};
