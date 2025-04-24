// Basic production server using Bun's built-in capabilities
// Serves the pre-built 'dist' directory.
import path from 'path'; // Import path module

const PORT = process.env.PORT || 3000;
const DIST_DIR = path.resolve(process.cwd(), "./dist"); // Use absolute path for reliability
const INDEX_HTML = path.join(DIST_DIR, "index.html");

console.log(`📦 Starting production server on http://localhost:${PORT}`);
console.log(`   Serving static files from: ${DIST_DIR}`);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        let pathname = url.pathname;

        // Simple security: prevent accessing files outside DIST_DIR
        if (pathname.includes('..')) {
             console.warn(`[400] Blocked potentially malicious path: ${pathname}`);
             return new Response("Bad Request", { status: 400 });
        }

        // Handle root path
        if (pathname === '/') {
            pathname = '/index.html';
        }

        let filePath = path.join(DIST_DIR, pathname);
        const file = Bun.file(filePath);

        try {
            const exists = await file.exists();

            if (exists) {
                 // Bun automatically sets appropriate Content-Type based on file extension
                 return new Response(file);
            } else {
                 // If the file doesn't exist, serve index.html for client-side routing
                 console.log(`[SPA Fallback] Serving index.html for ${url.pathname}`);
                 const indexFile = Bun.file(INDEX_HTML);
                 if (await indexFile.exists()) {
                     return new Response(indexFile);
                 } else {
                     console.error(`[500] index.html not found at ${INDEX_HTML}`);
                     return new Response("Not Found", { status: 404 }); // Or 500 if index is critical
                 }
            }
        } catch (error) {
             console.error(`[500] Error serving ${pathname}:`, error);
             return new Response("Internal Server Error", { status: 500 });
        }
    },
    error(error) {
        console.error("[Server Error]", error);
        return new Response("Internal Server Error", { status: 500 });
    },
});

console.log(`   Server listening on port ${server.port}`);