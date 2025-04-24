#!/usr/bin/env bun
import { build, type BuildConfig, type BuildArtifact, type Loader } from "bun";
import { existsSync } from "fs";
import { rm, cp, mkdir } from "fs/promises";
import path, { dirname } from "path";
import { Glob } from "bun";
import { SolidPlugin } from "bun-plugin-solid";

// Helper function to convert kebab-case to camelCase
const toCamelCase = (str: string): string => {
  return str.replace(/-([a-z])/g, g => g[1].toUpperCase());
};

// Helper function to parse a value into appropriate type
const parseValue = (value: string): any => {
  if (value === "true") return true;
  if (value === "false") return false;
  if (/^\d+$/.test(value)) return parseInt(value, 10);
  if (/^\d*\.\d+$/.test(value)) return parseFloat(value);
  if (value.includes(",")) return value.split(",").map(v => v.trim());
  return value;
};

// Argument parser that separates entrypoints from options
function parseArgs(): {
    entrypoints: string[];
    config: Partial<BuildConfig>;
    copyPatterns: string[];
    debug: boolean;
} {
  const config: Record<string, any> = {};
  const entrypoints: string[] = [];
  const copyPatterns: string[] = [];
  let debug = false;
  const args = process.argv.slice(2);

  let parsingOptions = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!parsingOptions && !arg.startsWith("-")) {
      entrypoints.push(arg);
      continue;
    }

    parsingOptions = true;

    if (arg === "--debug") {
        debug = true;
        continue;
    }

    if (!arg.startsWith("--")) {
        if (i > 0 && args[i - 1].startsWith("--") && !args[i - 1].includes("=")) {
             continue;
        }
        console.warn(`Ignoring unexpected argument: ${arg}`);
        continue;
    }

    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    let key: string;
    let value: string | undefined;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2);
    } else {
      key = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        value = args[++i];
      } else {
        config[toCamelCase(key)] = true;
        continue;
      }
    }

     if (key === 'copy') {
         if (value !== undefined) {
             copyPatterns.push(...value.split(',').map(p => p.trim()).filter(Boolean));
         } else {
             console.warn("Ignoring --copy option without a value.");
         }
         continue;
     }

    if (value === undefined) {
        config[toCamelCase(key)] = true;
        continue;
    }

    key = toCamelCase(key);

    if (key.includes(".")) {
      const parts = key.split(".");
      let current = config;
      for (let j = 0; j < parts.length - 1; j++) {
          current[parts[j]] = current[parts[j]] || {};
          current = current[parts[j]];
      }
      current[parts[parts.length - 1]] = parseValue(value);
    } else {
      config[key] = parseValue(value);
    }
  }

  // Set default loaders if not overridden
  if (!config.loader) {
    config.loader = {};
  }
  const defaultLoaders: Record<string, Loader> = {
    ".css": "css", ".svg": "file", ".png": "file", ".jpg": "file",
    ".jpeg": "file", ".gif": "file", ".webp": "file", ".woff": "file",
    ".woff2": "file", ".ttf": "file", ".eot": "file",
  };
  for (const ext in defaultLoaders) {
      if (!(config.loader as Record<string, Loader>)[ext]) {
           (config.loader as Record<string, Loader>)[ext] = defaultLoaders[ext];
      }
  }

  if (!config.publicPath) {
      config.publicPath = '/';
  }

  return { entrypoints, config: config as Partial<BuildConfig>, copyPatterns, debug };
}

// Helper function to format file sizes
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
};

// Main build function
(async () => {
    const helpRequested = process.argv.includes("--help") || process.argv.includes("-h");
    const { entrypoints: cliEntrypoints, config: cliConfig, copyPatterns: cliCopyPatterns, debug } = parseArgs();

    if (helpRequested || cliEntrypoints.length === 0) {
       console.log(`
    🏗️  Bun+SolidJS Build Script

    Usage: bun run build:app <entrypoint.html> [options]
           bun run build (same as build:app)

    Bundles the specified HTML file(s) and their dependencies using Bun.
    By default, bundles all JavaScript into a single file (e.g., index.js) and all CSS
    into a single file (e.g., index.css) within the output directory.

    Requires at least one HTML entrypoint file argument.

    Common Options:
      --outdir <path>          Output directory (default: "dist")
      --minify                 Enable minification (default: true unless --debug)
      --no-minify              Disable minification
      --source-map <type>      Sourcemap type: none|linked|inline|external (default: none unless --debug)
      --target <target>        Build target: browser|bun|node (default: browser)
      --splitting              Enable code splitting (default: false)
      --define.<key>=<value>   Define global constants (e.g. --define.VERSION=1.0.0)
      --loader.<ext>=<type>    Override loader for file types (default: css for .css, file for assets)
      --naming <pattern>       Naming pattern for output files (default: "[name].[ext]")
      --public-path <path>     Public path for referenced assets (default: "/")
      --copy <patterns>        Comma-separated glob patterns for files/dirs to copy to outdir (e.g., --copy "src/static-data/*")
      --debug                  Build in debug mode (no minify, linked sourcemaps)
      --help, -h               Show this help message

    Defaults (Production Mode):
      * Splitting: Disabled (outputs single JS/CSS files)
      * Minification: Enabled
      * Sourcemaps: Disabled
      * Public Path: "/"
      * Target: browser
      * Naming: "[name].[ext]" (e.g., index.js, index.css)
      * Static Assets: Files in './public' are copied to outdir by default.

    Example:
      # Build app for production (default) - single JS/CSS files
      bun run build src/index.html

      # Build app only for development/debugging
      bun run build:app src/index.html --debug

      # Build app with splitting enabled and hashed names
      bun run build:app src/app.html --splitting --naming="[dir]/[name]-[hash].[ext]"

      # Build app and copy additional assets besides './public'
      bun run build:app src/index.html --copy "src/static-data/*"
    `);
       process.exit(helpRequested ? 0 : 1);
    }

    const mode = debug ? "Development" : "Production";
    console.log(`\n🚀 Starting Bun build process (${mode})...\n`);

    const outdir = typeof cliConfig.outdir === 'string' ? cliConfig.outdir : path.join(process.cwd(), "dist");

    // Clean previous build if it exists
    if (existsSync(outdir)) {
      console.log(`🗑️ Cleaning previous build at ${outdir}`);
      await rm(outdir, { recursive: true, force: true });
    }
    // Always create the output directory
    console.log(`📦 Creating output directory ${outdir}.`);
    await mkdir(outdir, { recursive: true });


    const start = performance.now();

    console.log(`📄 Processing ${cliEntrypoints.length} HTML entrypoint${cliEntrypoints.length === 1 ? "" : "s"}:`);
    cliEntrypoints.forEach(ep => console.log(`   - ${path.relative(process.cwd(), ep)}`));
    console.log("");

    // Determine final minify state based on debug flag and explicit --minify/--no-minify
    const finalMinifyState = cliConfig.minify === undefined ? !debug : cliConfig.minify;

    // Base build configuration defaults
    const baseConfig: BuildConfig = {
        plugins: [SolidPlugin()],
        entrypoints: cliEntrypoints,
        outdir,
        target: "browser",
        splitting: false,
        define: {
            // Use JSON.stringify for strings, plain strings for booleans/identifiers
            "process.env.NODE_ENV": finalMinifyState ? JSON.stringify("production") : JSON.stringify("development"),
            "import.meta.env.DEV": finalMinifyState ? "false" : "true",
        },
        loader: {
            // Defaults are set in parseArgs
        },
        naming: "[name].[ext]",
        publicPath: '/', // Default public path
        minify: finalMinifyState, // Set based on derived state
        sourcemap: debug ? "linked" : "none", // Use linked source maps in debug mode
    };

    // Default copy pattern (copy everything in public/*)
    const defaultCopyPatterns = ["public/*"];
    const finalCopyPatterns = [...defaultCopyPatterns, ...cliCopyPatterns];

    // Merge CLI config with base config
    const finalConfig: BuildConfig = {
      ...baseConfig,
      ...cliConfig,
       // Merge define objects, ensuring CLI can override base defines if needed
       // Make sure the final define values are correct based on the derived finalMinifyState
      define: {
         ...baseConfig.define, // Base definitions first
         ...(cliConfig.define as Record<string, string> | undefined), // CLI overrides
         // Explicitly set standard env vars based on final state, overriding any previous setting
         "process.env.NODE_ENV": finalMinifyState ? JSON.stringify("production") : JSON.stringify("development"),
         "import.meta.env.DEV": finalMinifyState ? "false" : "true", // DEV is opposite of production/minify
      },
      loader: {
          ...baseConfig.loader, // Base loaders
          ...(cliConfig.loader as Record<string, Loader> | undefined), // CLI overrides
      },
      // Apply final derived/merged config options
      splitting: cliConfig.splitting ?? baseConfig.splitting, // Allow CLI override
      sourcemap: cliConfig.sourcemap ?? baseConfig.sourcemap, // Allow CLI override
      publicPath: cliConfig.publicPath ?? baseConfig.publicPath, // Allow CLI override
      naming: cliConfig.naming ?? baseConfig.naming, // Allow CLI override
      minify: finalMinifyState, // Ensure the final calculated minify state is used
    };

    // --- Define warnings section removed as finalConfig define block ensures consistency ---

    console.log("\n🔧 Final Build Configuration:");
    console.log(`   - Mode: ${finalConfig.minify === false ? "Development" : "Production"}`);
    console.log(`   - Entrypoints: ${finalConfig.entrypoints?.join(', ')}`);
    console.log(`   - Outdir: ${path.relative(process.cwd(), finalConfig.outdir!)}`);
    console.log(`   - Minify: ${finalConfig.minify}`);
    console.log(`   - Splitting: ${finalConfig.splitting}`);
    console.log(`   - Sourcemap: ${finalConfig.sourcemap}`);
    console.log(`   - Public Path: ${finalConfig.publicPath}`);
    console.log(`   - Naming: ${finalConfig.naming}`);
    console.log("   - Defines:");
    Object.entries(finalConfig.define ?? {}).forEach(([key, value]) => {
        // Values "true" and "false" will now show correctly without extra quotes
        console.log(`     - ${key}: ${value}`);
    });
    console.log("   - Loaders:");
    Object.entries(finalConfig.loader ?? {}).forEach(([ext, loader]) => {
        console.log(`     - ${ext}: ${loader}`);
    });
    if (finalCopyPatterns.length > 0) {
        console.log("   - Files/Dirs to Copy:");
        finalCopyPatterns.forEach(p => console.log(`     - ${p}`));
    }
    console.log("");

    // Build
    const result = await build(finalConfig);

    if (!result.success) {
        console.error("\n❌ Build failed:");
        result.logs.forEach(log => {
             if (typeof log === 'string') {
                 console.error(`   - ${log}`);
             } else if (log && typeof log === 'object' && 'message' in log) {
                 let msg = `   - [${log.level}] ${log.message}`;
                 if ('position' in log && log.position) { msg += ` (at ${log.position.file}:${log.position.line}:${log.position.column})`; }
                 console.error(msg);
                 if ('notes' in log && Array.isArray(log.notes)) { log.notes.forEach((note: any) => console.error(`     Note: ${note.text}`)); }
                 if ('error' in log && log.error instanceof Error) { console.error(`     Error details: ${log.error.stack || log.error.message}`); }
            } else { console.error(`   - ${JSON.stringify(log)}`); }
        });
        process.exit(1);
    }

    console.log("\n📊 Build Output:");
    const outputTable = result.outputs.map((output: BuildArtifact) => ({
      "File": path.relative(process.cwd(), output.path),
      "Type": output.kind,
      "Size": formatFileSize(output.size),
    }));

    if (outputTable.length > 0) {
        console.table(outputTable);
    } else {
        console.log("   No build output files generated.");
    }

    // --- File Copying Logic ---
    if (finalCopyPatterns.length > 0) {
        console.log("\n📂 Copying additional files...");
        let copiedCount = 0; let copyErrors = 0;
        for (const pattern of finalCopyPatterns) {
            let isNegated = pattern.startsWith('!');
            const globPattern = isNegated ? pattern.substring(1) : pattern;
            if (isNegated) {
                console.warn(`   - Skipping negated copy pattern: ${pattern}`);
                continue;
            }
            try {
                 const glob = new Glob(globPattern);
                 for await (const file of glob.scan({ cwd: process.cwd(), dot: true, absolute: false })) {
                     const sourcePath = path.join(process.cwd(), file);
                     let relativeDestPath = file;
                      try {
                          const patternBase = globPattern.split('*')[0];
                          // Improved logic for relative path calculation
                          if (patternBase && file.startsWith(patternBase) && patternBase.length > 0 && patternBase !== './' && patternBase !== '.') {
                                // Calculate relative path more reliably
                                const baseSegments = patternBase.split('/').filter(Boolean);
                                const fileSegments = file.split('/').filter(Boolean);
                                if (fileSegments.slice(0, baseSegments.length).join('/') === baseSegments.join('/')) {
                                    relativeDestPath = fileSegments.slice(baseSegments.length).join('/');
                                    if (!relativeDestPath || relativeDestPath === '.') {
                                        relativeDestPath = path.basename(file);
                                    }
                                } else {
                                    // Fallback if structure doesn't match prefix exactly
                                    relativeDestPath = path.basename(file);
                                }
                          } else {
                              // Default to basename if no clear base path in pattern or pattern is simple like '*'
                              relativeDestPath = path.basename(file);
                          }
                      } catch (e) {
                          relativeDestPath = path.basename(file);
                          console.warn(`Could not determine relative path for ${file} from pattern ${globPattern}. Using basename.`);
                      }

                     const destPath = path.join(outdir, relativeDestPath);
                     const destDir = dirname(destPath);
                    try {
                        // Use fs.stat for more detailed info and error handling
                        const stats = await Bun.file(sourcePath).exists() ? await Bun.file(sourcePath).stat() : null;
                        if (!stats || stats.isDirectory()) { continue; } // Skip directories

                        await mkdir(destDir, { recursive: true });
                        await cp(sourcePath, destPath, { force: true });
                        console.log(`   - Copied: ${file} -> ${path.relative(process.cwd(), destPath)}`);
                        copiedCount++;
                    } catch (copyError: any) {
                        // Only log significant copy errors
                        if (copyError.code !== 'ENOENT' && copyError.code !== 'EPERM' && copyError.code !== 'EISDIR') {
                             console.error(`   - Error copying ${file}: ${copyError.message}`); copyErrors++;
                        } else if (copyError.code !== 'ENOENT') { // Log if it's not just a non-existent file
                             console.warn(`   - Skipped copying ${file}: ${copyError.message}`);
                        }
                    }
                }
            } catch (globError: any) {
                console.error(`   - Error processing glob pattern "${globPattern}": ${globError.message}`); copyErrors++;
            }
        }
        console.log(`   Copied ${copiedCount} files with ${copyErrors} errors.`);
        if (copyErrors > 0) { console.warn("   Some files failed to copy."); }
    }
    // --- End File Copying Logic ---

    const end = performance.now();
    const buildTime = (end - start).toFixed(2);

    console.log(`\n✅ Bun build process completed in ${buildTime}ms`);
    console.log(`   Output directory: ${path.relative(process.cwd(), outdir)}`);

})().catch(err => {
    console.error("\n❌ Build script encountered an unexpected error:", err);
    process.exit(1);
});