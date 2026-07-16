export const jsonResponse = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const jsonError = (message: string, status = 500, details?: unknown) =>
    jsonResponse({ message, ...(details !== undefined ? { error: details } : {}) }, status);
