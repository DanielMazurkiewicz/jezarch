// Bunfile.js
export default {
    entrypoints: ["index.ts"],
    outfile: "./dist/server.js", // Optional: Bundle to a single file
    format: "esm", // Use ES modules
    sourcemap: true, // Generate source maps for debugging
};
