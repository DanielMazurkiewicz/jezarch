#!/usr/bin/env bun
import { build, type BuildConfig, type BuildArtifact, type Loader } from "bun"; // Corrected imports
import plugin from "bun-plugin-tailwind";
import { existsSync } from "fs";
import { rm, cp, mkdir } from "fs/promises"; // Added cp, mkdir
import path, { dirname } from "path"; // Added dirname
import { Glob } from "bun"; // Added Glob

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
    copyPatterns: string[]; // Added copyPatterns
} {
  const config: Record<string, any> = {};
  const entrypoints: string[] = [];
  const copyPatterns: string[] = []; // Initialize copyPatterns
  const args = process.argv.slice(2); // Script path is argv[1]

  let parsingOptions = false;
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Files before the first '--' are treated as entrypoints
    if (!parsingOptions && !arg.startsWith("-")) {
      entrypoints.push(arg);
      continue;
    }

    // Once we hit an option, everything after is an option or its value
    parsingOptions = true;
    if (!arg.startsWith("--")) {
        // Skip values that are consumed by a preceding option key
        // This basic check assumes options like --key value; doesn't handle --key=value perfectly here
        // but handles the separation of entrypoints from options.
        // If the previous arg was an option key, this is likely its value.
        if (i > 0 && args[i - 1].startsWith("--") && !args[i - 1].includes("=")) {
             continue; // Already handled by the key logic below
        }
        // If it's not starting with '--' and wasn't consumed, it might be an error or misplaced arg
        // For simplicity, we'll just ignore it here.
        console.warn(`Ignoring unexpected argument: ${arg}`);
        continue;
    }


    // Handle --no-* flags
    if (arg.startsWith("--no-")) {
      const key = toCamelCase(arg.slice(5));
      config[key] = false;
      continue;
    }

    // Handle --key=value or --key value
    let key: string;
    let value: string | undefined;

    if (arg.includes("=")) {
      [key, value] = arg.slice(2).split("=", 2);
    } else {
      key = arg.slice(2);
      // Check if next arg exists and doesn't start with '--'
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        value = args[++i]; // Consume the next argument as the value
      } else {
        // It's a boolean flag if no value follows or the next arg is another option
        config[toCamelCase(key)] = true;
        continue; // Skip further processing for boolean flags
      }
    }

     // Check for the special --copy argument
     if (key === 'copy') {
         if (value !== undefined) {
             // Assuming comma-separated list of patterns
             copyPatterns.push(...value.split(',').map(p => p.trim()).filter(Boolean));
         } else {
             console.warn("Ignoring --copy option without a value.");
         }
         continue; // Don't add copy patterns to the build config
     }

     // This condition is unlikely now with the improved logic, but keep as safeguard
    if (value === undefined) {
        config[toCamelCase(key)] = true;
        continue;
    }

    // Convert kebab-case key to camelCase
    key = toCamelCase(key);

    // Handle nested properties (e.g. --minify.whitespace)
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

   // Add default loader configuration for assets if not overridden by CLI
   // Use 'file' for SVG to copy, 'dataurl' to embed others
  if (!config.loader) {
    config.loader = {};
  }
  // Explicitly type defaultLoaders and cast values to Loader
  const defaultLoaders: Record<string, Loader> = {
    // ".svg": "file" as Loader, // Default to copying SVG files
    ".svg": "file",

    ".png": "dataurl" as Loader,
    ".jpg": "dataurl" as Loader,
    ".jpeg": "dataurl" as Loader,
    ".gif": "dataurl" as Loader,
    ".webp": "dataurl" as Loader,
    ".woff": "dataurl" as Loader,
    ".woff2": "dataurl" as Loader,
    ".ttf": "dataurl" as Loader,
    ".eot": "dataurl" as Loader,
  };
  for (const ext in defaultLoaders) {
      // Only apply default if not already set in the parsed config
      if (!(config.loader as Record<string, Loader>)[ext]) {
           // Assign the correctly typed Loader value
           (config.loader as Record<string, Loader>)[ext] = defaultLoaders[ext];
      }
  }


  return { entrypoints, config: config as Partial<BuildConfig>, copyPatterns };
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
  // Use toLocaleString for better number formatting (e.g., thousands separators)
  return `${size.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${units[unitIndex]}`;
};

// Main build function wrapped in async IIFE
(async () => {
    const helpRequested = process.argv.includes("--help") || process.argv.includes("-h");
    const { entrypoints: cliEntrypoints, config: cliConfig, copyPatterns } = parseArgs();

    // Show help if requested OR if no entrypoints are provided (unless --help was implicitly set in config, which we removed)
    if (helpRequested || cliEntrypoints.length === 0) {
       console.log(`
    🏗️  Bun Build Script (Single File Output Mode)

    Usage: bun run build.ts <entrypoint.html> [options]

    Bundles the specified HTML file(s) along with their CSS, JavaScript,
    and referenced assets (images, fonts) into self-contained HTML files.
    SVGs are copied by default.

    Requires at least one HTML entrypoint file argument.

    Common Options:
      --outdir <path>          Output directory (default: "dist")
      --minify                 Enable minification (default: true)
      --no-minify              Disable minification
      --source-map <type>      Sourcemap type: none|linked|inline|external (default: none)
      --target <target>        Build target: browser|bun|node (default: browser)
      --define <obj>           Define global constants (e.g. --define.VERSION=1.0.0)
      --loader.<ext>=<type>    Override loader for file types (default: file for svg, dataurl for others)
                               Use 'dataurl' to embed SVGs. Use 'file' to copy other assets.
      --naming <pattern>       Naming pattern for output files (default: "[dir]/[name].[ext]")
      --public-path <path>     Public path for referenced assets (default: "./")
      --copy <patterns>        Comma-separated glob patterns for files/dirs to copy to outdir (e.g., --copy "src/public/*,src/assets/**/*.json")
      --help, -h               Show this help message

    Defaults for Single File Output:
      * Code Splitting: Disabled (--splitting=false)
      * Asset Loaders: 'file' for SVGs, 'dataurl' for common image/font types.
      * Tailwind CSS: Processed via plugin and inlined.
      * Sourcemaps: Disabled by default for single-file builds.
      * Public Path: "./" (relative asset paths)
      * Naming: "[dir]/[name].[ext]" (preserves names)

    Example:
      # Build src/index.html into dist/index.html with assets embedded (except SVG)
      bun run build.ts src/index.html

      # Build with specific output directory and disable minification
      bun run build.ts src/app.html --outdir=./build --no-minify

      # Build and embed SVGs instead of copying
      bun run build.ts src/page.html --loader..svg=dataurl

      # Build and copy PNGs instead of embedding
      bun run build.ts src/page.html --loader..png=file

      # Build and copy all files from public and specific JSON assets
      bun run build.ts src/index.html --copy "public/*,src/data/*.json"
    `);
       process.exit(helpRequested ? 0 : 1); // Exit with error if no entrypoint given unless asking for help
    }


    console.log("\n🚀 Starting build process for single-file output...\n");

    const outdir = typeof cliConfig.outdir === 'string' ? cliConfig.outdir : path.join(process.cwd(), "dist");

    // Clean directory only if it exists
    if (existsSync(outdir)) {
      console.log(`🗑️ Cleaning previous build at ${outdir}`);
      await rm(outdir, { recursive: true, force: true });
    } else {
      console.log(`📦 Output directory ${outdir} does not exist, will be created.`);
    }
    // Ensure outdir exists after cleaning/checking
    await mkdir(outdir, { recursive: true });


    const start = performance.now();

    console.log(`📄 Processing ${cliEntrypoints.length} HTML entrypoint${cliEntrypoints.length === 1 ? "" : "s"}:`);
    cliEntrypoints.forEach(ep => console.log(`   - ${path.relative(process.cwd(), ep)}`));
    console.log("");


    // Define base build configuration for single-file output
    // Explicitly type the baseConfig
    const baseConfig: BuildConfig = {
        entrypoints: cliEntrypoints, // Use entrypoints from CLI args
        outdir,
        plugins: [plugin], // Use the imported plugin object directly
        minify: true,          // Minify by default
        target: "browser",     // Target browser environment
        sourcemap: "none",   // Disable sourcemaps by default for single file
        splitting: false,      // CRITICAL: Disable code splitting
        define: {
            "process.env.NODE_ENV": JSON.stringify("production"),
        },
        // Default loaders: Use 'file' for SVG, 'dataurl' for others.
        // Cast string literals to Loader type
        loader: {
            ".svg": "file" as Loader,
            // ".png": "dataurl" as Loader,
            // ".jpg": "dataurl" as Loader,
            // ".jpeg": "dataurl" as Loader,
            // ".gif": "dataurl" as Loader,
            // ".webp": "dataurl" as Loader,
            // ".woff": "dataurl" as Loader,
            // ".woff2": "dataurl" as Loader,
            // ".ttf": "dataurl" as Loader,
            // ".eot": "dataurl" as Loader,
        },
        naming: "[dir]/[name].[ext]", // Ensure copied files retain names in outdir
        publicPath: './', // Set public path relative to HTML file for copied assets
    };

    // Merge CLI config with base config
    const finalConfig: BuildConfig = {
      ...baseConfig,
      ...cliConfig, // CLI options override base options
      // Ensure loaders are merged correctly, prioritizing CLI loaders
      loader: {
          ...baseConfig.loader, // Base loaders (file for svg, dataurl defaults)
          ...(cliConfig.loader as Record<string, Loader> | undefined), // CLI overrides (assert type)
      },
      // Explicitly ensure splitting is false unless overridden by a specific CLI flag
      splitting: cliConfig.splitting === true ? true : false, // Default to false
       // Override sourcemap default if specified by CLI
      sourcemap: cliConfig.sourcemap ?? baseConfig.sourcemap,
      // Override publicPath if specified by CLI
      publicPath: cliConfig.publicPath ?? baseConfig.publicPath,
      // Override naming if specified by CLI
      naming: cliConfig.naming ?? baseConfig.naming,
    };


    console.log("\n🔧 Final Build Configuration:");
    console.log(`   - Entrypoints: ${finalConfig.entrypoints?.join(', ')}`);
    console.log(`   - Outdir: ${path.relative(process.cwd(), finalConfig.outdir!)}`);
    console.log(`   - Minify: ${finalConfig.minify}`);
    console.log(`   - Splitting: ${finalConfig.splitting}`);
    console.log(`   - Sourcemap: ${finalConfig.sourcemap}`);
    console.log(`   - Public Path: ${finalConfig.publicPath}`);
    console.log(`   - Naming: ${finalConfig.naming}`);
    console.log("   - Loaders:");
    Object.entries(finalConfig.loader ?? {}).forEach(([ext, loader]) => {
        console.log(`     - ${ext}: ${loader}`);
    });
    if (copyPatterns.length > 0) {
        console.log("   - Files/Dirs to Copy:");
        copyPatterns.forEach(p => console.log(`     - ${p}`));
    }
    console.log("");


    // Build the specified HTML file(s)
    const result = await build(finalConfig);

    if (!result.success) {
        console.error("\n❌ Build failed:");
        // Log detailed Bun messages
        result.logs.forEach(log => {
            if (typeof log === 'string') {
                 console.error(`   - ${log}`);
             } else if (log && typeof log === 'object' && 'message' in log) {
                 // Attempt to provide more context if available
                 let msg = `   - ${log.message}`;
                 if ('position' in log && log.position) {
                     msg += ` (at ${log.position.file}:${log.position.line}:${log.position.column})`;
                 }
                 console.error(msg);
                 // Log additional details if present
                 if ('notes' in log && Array.isArray(log.notes)) {
                      log.notes.forEach((note: any) => console.error(`     Note: ${note.text}`));
                 }
                 if ('error' in log && log.error instanceof Error) {
                     console.error(`     Error details: ${log.error.stack || log.error.message}`);
                 }
            } else {
                 console.error(`   - ${JSON.stringify(log)}`); // Fallback for unknown log format
            }
        });
        process.exit(1);
    }

    console.log("\n📊 Build Output:");
    // Use BuildArtifact[] type for outputs
    const outputTable = result.outputs.map((output: BuildArtifact) => ({
      "File": path.relative(process.cwd(), output.path),
      "Type": output.kind,
      "Size": formatFileSize(output.size),
    }));

    // Only show table if there are outputs
    if (outputTable.length > 0) {
        console.table(outputTable);
    } else {
        console.log("   No build output files generated (check entrypoints and configuration).");
    }

    // --- File Copying Logic ---
    if (copyPatterns.length > 0) {
        console.log("\n📂 Copying additional files...");
        let copiedCount = 0;
        let copyErrors = 0;

        for (const pattern of copyPatterns) {
            try {
                 const glob = new Glob(pattern);
                 // Scan relative to CWD
                 for await (const file of glob.scan('.')) {
                     const sourcePath = path.join(process.cwd(), file);
                     // Calculate destination relative to the *pattern's base* or project root
                     // For simplicity, let's just place it relative to the project root inside outdir
                     const destPath = path.join(outdir, file);
                     const destDir = dirname(destPath);

                    try {
                        // Ensure destination directory exists
                        await mkdir(destDir, { recursive: true });
                        // Copy file/directory
                        await cp(sourcePath, destPath, { recursive: true, force: true }); // Use force to overwrite if necessary
                        console.log(`   - Copied: ${file} -> ${path.relative(process.cwd(), destPath)}`);
                        copiedCount++;
                    } catch (copyError: any) {
                        console.error(`   - Error copying ${file}: ${copyError.message}`);
                        copyErrors++;
                    }
                }
            } catch (globError: any) {
                console.error(`   - Error processing glob pattern "${pattern}": ${globError.message}`);
                copyErrors++;
            }
        }
        console.log(`   Copied ${copiedCount} items with ${copyErrors} errors.`);
        if (copyErrors > 0) {
            console.warn("   Some files failed to copy. Check logs above.");
        }
    }
    // --- End File Copying Logic ---

    const end = performance.now();
    const buildTime = (end - start).toFixed(2);

    console.log(`\n✅ Build completed in ${buildTime}ms`);
    console.log(`   Output directory: ${path.relative(process.cwd(), outdir)}`);

})().catch(err => {
    console.error("\n❌ Build script encountered an unexpected error:", err);
    process.exit(1);
});