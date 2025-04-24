#!/usr/bin/env bun
// Assuming usage of @vanilla-extract/bun-plugin
import { vanillaExtractPlugin } from "@vanilla-extract/bun-plugin";
import { rm, mkdir, readdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

const outdir = path.join(process.cwd(), "dist-ve"); // Separate dir for VE output
const finalCssFile = path.join(process.cwd(), "dist/assets/styles.css"); // Final destination

(async () => {
    console.log("🍦 Compiling Vanilla Extract styles...");

    // 1. Clean previous VE output directory
    if (existsSync(outdir)) {
        await rm(outdir, { recursive: true, force: true });
    }
    await mkdir(outdir, { recursive: true });

    // 2. Ensure final destination directory exists
    const finalDir = path.dirname(finalCssFile);
    if (!existsSync(finalDir)) {
        await mkdir(finalDir, { recursive: true });
    }

    try {
        const result = await Bun.build({
            // Entrypoint should ideally import all .css.ts files needed
            // Or include multiple entrypoints if necessary
            entrypoints: [path.join(process.cwd(), "src/styles/index.ts")], // Changed entrypoint
            outdir: outdir, // Intermediate output dir for VE plugin
            plugins: [
                vanillaExtractPlugin({
                    // Optional configuration:
                    // identifiers: process.env.NODE_ENV === 'production' ? 'short' : 'debug',
                     outputCss: true, // Ensure CSS is outputted by the plugin
                }),
            ],
            // Target doesn't matter much as we only care about the CSS side effect
            target: "bun",
             // Externalize dependencies that shouldn't be bundled with CSS generation logic
             external: ['vanjs-core', '@vanilla-extract/css', '@vanilla-extract/dynamic']
        });

        if (!result.success) {
            console.error("❌ Bun build step for CSS generation failed:");
            result.logs.forEach(log => console.error(`   - ${log.message}`));
            process.exit(1);
        }

        // 3. Find the generated CSS file by the VE plugin
        // The plugin typically outputs CSS named after the entrypoint or a generic name.
        const files = await readdir(outdir);
        const cssFile = files.find(f => f.endsWith('.css'));

        if (cssFile) {
            const generatedCssPath = path.join(outdir, cssFile);
            // Move/Copy the generated CSS to the final destination
            await Bun.write(finalCssFile, await Bun.file(generatedCssPath).text());
            console.log(`✅ CSS compiled successfully to ${path.relative(process.cwd(), finalCssFile)}`);
            // Optional: Clean up the intermediate dist-ve directory
            // await rm(outdir, { recursive: true, force: true });
        } else {
            console.warn(`⚠️ Vanilla Extract CSS output file not found in ${outdir}. Check plugin configuration or output.`);
            console.log("   Directory contents:", files);
             process.exit(1); // Exit if CSS wasn't generated
        }

    } catch (error) {
        console.error("❌ CSS compilation failed:", error);
        process.exit(1);
    }
})();