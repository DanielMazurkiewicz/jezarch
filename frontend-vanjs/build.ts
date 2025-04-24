#!/usr/bin/env bun
import { build, type BuildConfig } from "bun";
import { rm, cp, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { Glob } from "bun";

// Basic argument parsing (can be expanded if needed)
const getArg = (argName: string): string | undefined => {
  const argIndex = process.argv.indexOf(argName);
  return argIndex !== -1 && process.argv.length > argIndex + 1 ? process.argv[argIndex + 1] : undefined;
};

// --- Configuration ---
const entrypoint = "src/main.ts";
const outdir = getArg('--outdir') ?? path.join(process.cwd(), "dist");
const publicDir = path.join(process.cwd(), "public"); // Directory for static assets
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');

(async () => {
  console.log(`\n🚀 Starting build process (${isProd ? 'production' : 'development'})...`);
  console.log(`   Output directory: ${path.relative(process.cwd(), outdir)}`);

  // 1. Clean output directory
  if (existsSync(outdir)) {
    console.log(`🗑️ Cleaning previous build at ${outdir}`);
    await rm(outdir, { recursive: true, force: true });
  }
  await mkdir(outdir, { recursive: true });
  console.log(`   Directory cleaned/created.`);

  // 2. Build the VanJS application code
  console.log(`🔧 Building application code: ${entrypoint}`);
  const buildConfig: BuildConfig = {
    entrypoints: [entrypoint],
    outdir: path.join(outdir, "assets"), // Place JS output in assets subdir
    target: "browser",
    minify: isProd,
    sourcemap: isProd ? "none" : "inline",
    naming: "[name]-[hash].[ext]", // Add hash for cache busting in prod
    define: {
      "process.env.NODE_ENV": JSON.stringify(isProd ? "production" : "development"),
      // Add other global defines if necessary
    },
    loader: {
      // Add loaders if needed (e.g., for fonts, images not handled by VE)
      // ".woff": "file",
      // ".woff2": "file",
    }
  };

  const result = await build(buildConfig);

  if (!result.success) {
    console.error("\n❌ JavaScript build failed:");
    result.logs.forEach(log => console.error(`   - ${log}`));
    process.exit(1);
  }
  console.log(`   JavaScript build successful.`);
  // Get the generated JS file path (assuming one entry point)
  const jsOutput = result.outputs.find(o => o.kind === 'entry-point');
  const jsFileName = jsOutput ? path.basename(jsOutput.path) : 'main.js'; // Fallback name

  // 3. Copy static assets from public directory
  if (existsSync(publicDir)) {
      console.log(`📂 Copying static assets from ${publicDir}`);
      const publicGlob = new Glob("**/*");
      let copiedCount = 0;
      for await (const file of publicGlob.scan(publicDir)) {
          const sourcePath = path.join(publicDir, file);
          const destPath = path.join(outdir, file);
          await mkdir(path.dirname(destPath), { recursive: true });
          await cp(sourcePath, destPath);
          copiedCount++;
      }
      console.log(`   Copied ${copiedCount} static assets.`);
  } else {
      console.log(`   Public directory ${publicDir} not found, skipping static asset copy.`);
  }

  // 4. Copy Vanilla Extract CSS output (assuming build:css ran first)
  const veCssFile = path.join(process.cwd(), "dist-ve/styles.css"); // Path where compile-css outputs
  const veCssDest = path.join(outdir, "assets/styles.css");
  if (existsSync(veCssFile)) {
      console.log(`💅 Copying compiled CSS: ${path.relative(process.cwd(), veCssFile)}`);
      await mkdir(path.dirname(veCssDest), { recursive: true });
      await cp(veCssFile, veCssDest);
      console.log(`   CSS copied to ${path.relative(process.cwd(), veCssDest)}.`);
  } else {
      console.warn(`⚠️ Compiled CSS file not found at ${veCssFile}. Run 'bun build:css' first.`);
      // Decide if build should fail here? For now, just warn.
  }

  // 5. Create index.html dynamically (or copy a template and inject)
  console.log(`📄 Generating index.html`);
  const indexHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="icon" type="image/svg+xml" href="/logo.svg">
    <title>JezArch (VanJS)</title>
    <link rel="stylesheet" href="/assets/styles.css">
    <script type="module" src="/assets/${jsFileName}" defer></script>
</head>
<body>
    <div id="root"></div>
</body>
</html>`;
  await Bun.write(path.join(outdir, "index.html"), indexHtmlContent);
  console.log(`   index.html generated.`);

  // 6. Build Server (Optional - if you want a standalone server)
  console.log(`🔧 Building server code...`);
  const serverBuildConfig: BuildConfig = {
      entrypoints: ["src/server.ts"], // Assuming you have a server entry point
      outdir: outdir,
      target: "bun",
      minify: isProd,
      sourcemap: "none",
      naming: "[name].js",
      external: ["bun", "sqlite"], // Mark bun/sqlite as external if used directly
  };
  const serverResult = await build(serverBuildConfig);
   if (!serverResult.success) {
       console.error("\n❌ Server build failed:");
       serverResult.logs.forEach(log => console.error(`   - ${log}`));
       // Don't necessarily exit(1) if only server build fails, main app might be ok
   } else {
       console.log(`   Server build successful.`);
   }


  console.log(`\n✅ Build completed successfully!`);

})().catch(err => {
  console.error("\n❌ Build script encountered an unexpected error:", err);
  process.exit(1);
});