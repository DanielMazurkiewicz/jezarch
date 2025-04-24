#!/usr/bin/env bun
import { build, type BuildConfig, type BuildOutput, type Loader } from "bun";
import path from "path";
import { rm, mkdir, cp } from "fs/promises";
import { existsSync } from "fs";

// --- Configuration ---
const DEFAULT_INPUT = "./src/index.ts";
const DEFAULT_OUTPUT_DIR = "./dist";
const TEMP_BUILD_DIR = "./.tmp-build"; // Temporary dir for non-single build

// --- Argument Parsing ---
interface BuildArgs {
  debug: boolean;
  single: boolean;
  outputDir: string;
  inputFile: string;
}

function parseArgs(): BuildArgs {
  const args = process.argv.slice(2);
  const parsed: BuildArgs = {
    debug: false,
    single: false,
    outputDir: DEFAULT_OUTPUT_DIR,
    inputFile: DEFAULT_INPUT,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--debug') {
      parsed.debug = true;
    } else if (arg === '--single') {
      parsed.single = true;
    } else if (arg === '--output' && i + 1 < args.length) {
      parsed.outputDir = args[++i];
    } else if (arg === '--input' && i + 1 < args.length) {
      parsed.inputFile = args[++i];
    } else if (arg === '--help' || arg === '-h') {
        printHelp();
        process.exit(0);
    }
  }

  // Resolve paths relative to CWD
  parsed.outputDir = path.resolve(process.cwd(), parsed.outputDir);
  parsed.inputFile = path.resolve(process.cwd(), parsed.inputFile);

  return parsed;
}

function printHelp() {
    console.log(`
    Usage: bun run build.ts [options]

    Options:
      --debug           Build without minification and include sourcemaps. Filenames will still be hashed.
      --single          Output a single self-contained HTML file (no filename hashing applicable).
      --output <dir>    Specify the output directory (default: "${DEFAULT_OUTPUT_DIR}")
      --input <file>    Specify the root TypeScript input file (default: "${DEFAULT_INPUT}")
      --help, -h        Show this help message.
    `);
}

// --- Build Logic ---

async function cleanDir(dir: string) {
  if (existsSync(dir)) {
    console.log(`🧹 Cleaning directory: ${path.relative(process.cwd(), dir)}`);
    await rm(dir, { recursive: true, force: true });
  }
  await mkdir(dir, { recursive: true });
}

// Basic HTML template function
function createHtmlTemplate(jsEntryRelativePath?: string, cssEntryRelativePath?: string, embeddedJs?: string, embeddedCss?: string): string {
    // Ensure paths start with './' for relative linking in HTML
    const formatRelativePath = (p?: string) => (p ? `./${p.replace(/\\/g, '/')}` : '');

    const jsLink = jsEntryRelativePath ? `<script type="module" src="${formatRelativePath(jsEntryRelativePath)}" defer></script>` : '';
    const cssLink = cssEntryRelativePath ? `<link rel="stylesheet" href="${formatRelativePath(cssEntryRelativePath)}">` : '';
    const embeddedJsTag = embeddedJs ? `<script type="module">\n${embeddedJs}\n</script>` : '';
    const embeddedCssTag = embeddedCss ? `<style>\n${embeddedCss}\n</style>` : '';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>JezArch Vanilla</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏛️</text></svg>">
    ${cssLink}
    ${embeddedCssTag}
</head>
<body>
    <div id="app-container"></div>
    ${jsLink}
    ${embeddedJsTag}
</body>
</html>`;
}

async function main() {
  const args = parseArgs();
  const { debug, single, outputDir, inputFile } = args;

  console.log("🚀 Starting build...");
  console.log(`   Mode: ${single ? 'Single File' : 'Separate Files with Hashing'}`);
  console.log(`   Debug: ${debug}`);
  console.log(`   Input: ${path.relative(process.cwd(), inputFile)}`);
  console.log(`   Output Dir: ${path.relative(process.cwd(), outputDir)}`);

  const baseBuildConfig: Partial<BuildConfig> = {
    entrypoints: [inputFile],
    minify: !debug,
    sourcemap: debug ? 'external' : 'none',
    target: 'browser',
    define: {
        'process.env.NODE_ENV': JSON.stringify(debug ? 'development' : 'production'),
        '__DEBUG__': JSON.stringify(debug),
    },
    loader: {
        '.css': 'css', // Let bun handle CSS bundling/loading
    }
  };

  await cleanDir(outputDir);

  if (single) {
    console.log("   Mode: Single self-contained HTML file.");
    // Build everything into memory first
    const result = await build({
      ...baseBuildConfig,
      entrypoints: [inputFile],
      outdir: undefined, // Build to memory
      external: [], // Don't externalize anything
      splitting: false, // No code splitting for single file
      naming: '[name].[ext]', // Naming doesn't matter much for memory build
    });

    if (!result.success) {
      console.error("❌ Build failed (memory stage):");
      console.error(result.logs.join('\n'));
      process.exit(1);
    }

    console.log("   Bundling JS/CSS for embedding...");
    let embeddedJs = "";
    let embeddedCss = "";

    for (const artifact of result.outputs) {
        // Identify entry point JS based on kind and extension
        if (artifact.kind === 'entry-point' && artifact.path.endsWith('.js')) {
            embeddedJs += await artifact.text();
        } else if (artifact.path.endsWith('.css')) { // Assume any CSS output should be embedded
            embeddedCss += await artifact.text();
        } else if (artifact.kind !== 'entry-point' && artifact.path.endsWith('.js')) {
             // Include chunks if splitting happened unexpectedly (though disabled)
             console.warn("   Including non-entry JS chunk:", artifact.path);
             embeddedJs += await artifact.text();
        }
        // Ignore sourcemaps etc.
    }

     // Minify CSS separately if not in debug mode
     if (!debug && embeddedCss) {
        const cssBuild = await build({
            entrypoints: ['inline.css'], // dummy entrypoint
            stdin: {
                contents: embeddedCss,
                loader: 'css',
                sourcefile: 'inline.css'
            },
            minify: true,
        });
        if(cssBuild.success && cssBuild.outputs.length > 0) {
            embeddedCss = await cssBuild.outputs[0].text();
        } else {
            console.warn("⚠️ CSS minification failed, embedding unminified CSS.");
        }
    }


    const htmlContent = createHtmlTemplate(undefined, undefined, embeddedJs, embeddedCss);
    const htmlPath = path.join(outputDir, 'index.html');
    await Bun.write(htmlPath, htmlContent);
    console.log(`   Generated single file: ${path.relative(process.cwd(), htmlPath)}`);

  } else {
    // Separate files mode
    console.log(`   Mode: Separate files with filename hashing.`);
    await cleanDir(TEMP_BUILD_DIR);

    const result = await build({
      ...baseBuildConfig,
      entrypoints: [inputFile],
      outdir: TEMP_BUILD_DIR,
      // Always apply hashing
      naming: '[dir]/[name]-[hash].[ext]', // output structure example: .tmp-build/src/index-a1b2c3d4.js
      splitting: true,
      external: [],
    });

    if (!result.success) {
      console.error("❌ Build failed (separate files stage):");
      console.error(result.logs.join('\n'));
      process.exit(1);
    }

    // Find the main JS and CSS output files from the build artifacts
    let jsEntryArtifact: BuildOutput | undefined;
    let cssEntryArtifact: BuildOutput | undefined;

    for (const artifact of result.outputs) {
        if (artifact.kind === 'entry-point') {
            if (artifact.path.endsWith('.js') && !jsEntryArtifact) jsEntryArtifact = artifact;
            else if (artifact.path.endsWith('.css') && !cssEntryArtifact) cssEntryArtifact = artifact;
        }
    }
    // Fallbacks
    if (!jsEntryArtifact) jsEntryArtifact = result.outputs.find(a => a.path.endsWith('.js'));
    if (!cssEntryArtifact) cssEntryArtifact = result.outputs.find(a => a.path.endsWith('.css'));

    if (!jsEntryArtifact) {
        console.error("❌ Could not determine the main JS output file.");
        process.exit(1);
    }

    // --- Calculate final relative paths for HTML ---
    // path.relative(TEMP_BUILD_DIR, artifact.path) gives the path *within* the temp dir (e.g., src/index-a1b2c3d4.js)
    // This relative path is what we need for the HTML src/href, as it will be correct *after* copying to outputDir.
    const jsEntryRelativePath = path.relative(TEMP_BUILD_DIR, jsEntryArtifact.path);
    const cssEntryRelativePath = cssEntryArtifact ? path.relative(TEMP_BUILD_DIR, cssEntryArtifact.path) : undefined;

    // --- Generate HTML pointing to the *final* relative paths ---
    const htmlContent = createHtmlTemplate(
        jsEntryRelativePath,
        cssEntryRelativePath
    );
    const htmlPath = path.join(outputDir, 'index.html');

    // --- Copy files AFTER generating HTML content ---
    console.log(`   Copying build artifacts to ${path.relative(process.cwd(), outputDir)}...`);
    await cp(TEMP_BUILD_DIR, outputDir, { recursive: true });
    await rm(TEMP_BUILD_DIR, { recursive: true, force: true }); // Clean up temp dir

    // --- Write the HTML file ---
    await Bun.write(htmlPath, htmlContent);

    console.log(`   Generated HTML: ${path.relative(process.cwd(), htmlPath)}`);
    console.log(`   JS entry (relative to HTML): ${jsEntryRelativePath}`);
    if (cssEntryRelativePath) {
        console.log(`   CSS entry (relative to HTML): ${cssEntryRelativePath}`);
    }
  }

  console.log("✅ Build completed successfully.");
}

main().catch(err => {
  console.error("❌ Build script error:", err);
  process.exit(1);
});