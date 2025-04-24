#!/usr/bin/env bun

// Simple development server using Bun's built-in capabilities
// This server serves the `dist` directory and proxies API requests.

const PORT = process.env.PORT || 3000;
const API_TARGET = process.env.API_TARGET || "http://localhost:8080"; // Your backend API URL
const DIST_DIR = "./dist"; // Directory containing built assets (index.html, js, css)

console.log(`🚀 Starting development server on http://localhost:${PORT}`);
console.log(`   Serving static files from: ${DIST_DIR}`);
console.log(`   Proxying API requests (/api/**) to: ${API_TARGET}`);

const server = Bun.serve({
    port: PORT,
    async fetch(req) {
        const url = new URL(req.url);
        const pathname = url.pathname;

        // 1. API Proxy
        if (pathname.startsWith('/api/')) {
            // Construct target URL
            const targetUrl = new URL(pathname, API_TARGET);
            // Copy search params
            targetUrl.search = url.search;

            console.log(`[API Proxy] ${req.method} ${pathname} -> ${targetUrl.toString()}`);

            try {
                // Forward the request, copying method, headers, and body
                const proxyRes = await fetch(targetUrl.toString(), {
                    method: req.method,
                    headers: req.headers,
                    body: req.body,
                    redirect: 'manual', // Handle redirects manually if needed
                });

                 // Forward the response back to the client
                 // Important: Create a new Headers object to avoid modifying the original
                 const responseHeaders = new Headers(proxyRes.headers);
                 responseHeaders.set('Access-Control-Allow-Origin', '*'); // Allow CORS for dev

                return new Response(proxyRes.body, {
                    status: proxyRes.status,
                    statusText: proxyRes.statusText,
                    headers: responseHeaders
                });
            } catch (error: any) {
                console.error(`[API Proxy] Error forwarding request to ${targetUrl}:`, error);
                return new Response(`API Proxy Error: ${error.message}`, { status: 502 }); // Bad Gateway
            }
        }

        // 2. Static File Serving
        // Determine the file path, defaulting to index.html for root or unknown paths
        let filePath = DIST_DIR + pathname;
        if (pathname === '/' || !await Bun.file(filePath).exists() || (await Bun.file(filePath).exists() && (await Bun.stat(filePath)).isDirectory())) {
             // Serve index.html for root, non-existent files, or directories
             filePath = DIST_DIR + '/index.html';
             console.log(`[Static] Serving index.html for ${pathname}`);
        } else {
             console.log(`[Static] Serving ${pathname}`);
        }


        const file = Bun.file(filePath);
        if (await file.exists()) {
            return new Response(file);
        }

        // 4. Not Found
        console.log(`[Static] File not found: ${filePath}`);
        return new Response("Not Found", { status: 404 });
    },
    error(error) {
        console.error("[Server Error]", error);
        return new Response("Internal Server Error", { status: 500 });
    },
});

console.log(`   Server listening on port ${server.port}`);

// You would typically run the `bun build:css` and `bun build:js --watch` (or similar)
// commands in separate terminals alongside this dev server.
// This server doesn't handle live reloading of JS/CSS automatically.