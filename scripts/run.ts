/**
 * JezArch cross-platform command runner.
 *
 * Single entry point for everyday tasks (update/install/start/build/test/seed/clean)
 * that works identically on Windows and Linux. It never relies on shell
 * operators (e.g. `&`, `&&`, inline `VAR=value`), so it behaves the same under
 * bash, cmd.exe, and PowerShell.
 *
 * Usage:  bun scripts/run.ts <command> [args...]
 * or via the root package.json scripts, e.g.  bun run start:dev
 *
 * Command surface (root package.json):
 *   help, update, install,
 *   start (= start:prod), start:dev, start:prod,
 *   build (= build:prod), build:dev, build:prod,
 *   seed (= seed:en), seed:en, seed:pl,
 *   test (= test:types + test:code), test:code, test:types,
 *   clean, cleanup (= clean)
 */

import { resolve, join } from 'node:path';
import { existsSync, rmSync } from 'node:fs';

const ROOT = resolve(import.meta.dir, '..');
const BACKEND = join(ROOT, 'backend');
const FRONTEND = join(ROOT, 'frontend');
const BACKEND_TESTS = join(ROOT, 'backend-tests');

const BUN = process.env.BUN ?? 'bun';

const col = {
    head: '\x1b[1;36m',
    ok: '\x1b[1;32m',
    warn: '\x1b[1;33m',
    err: '\x1b[1;31m',
    dim: '\x1b[2m',
    reset: '\x1b[0m',
};

let success = true;

function logHead(msg: string) {
    console.log(`\n${col.head}=== ${msg} ===${col.reset}`);
}

function logWarn(msg: string) {
    console.log(`${col.warn}WARN${col.reset} ${msg}`);
}

function logOk(msg: string) {
    console.log(`${col.ok}OK${col.reset} ${msg}`);
}

function logErr(msg: string) {
    console.log(`${col.err}ERROR${col.reset} ${msg}`);
    success = false;
}

/** Run a command in a given cwd, forwarding stdio to the caller. */
async function run(cmd: string, args: string[], cwd: string, opts: { ignoreFailure?: boolean } = {}): Promise<number> {
    logHead(`${cmd} ${args.join(' ')}`);
    console.log(`${col.dim}  cwd: ${cwd}${col.reset}`);
    const proc = Bun.spawn([cmd, ...args], {
        cwd,
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
        env: process.env,
        windowsHide: false,
    });
    const code = await proc.exited;
    if (code !== 0 && !opts.ignoreFailure) {
        logErr(`Command failed with exit code ${code}: ${cmd} ${args.join(' ')}`);
    }
    return code;
}

async function runQuiet(cmd: string, args: string[], cwd: string): Promise<string> {
    const proc = Bun.spawn([cmd, ...args], {
        cwd,
        stdout: 'pipe',
        stderr: 'pipe',
        env: process.env,
    });
    const out = await new Response(proc.stdout).text();
    const err = await new Response(proc.stderr).text();
    const code = await proc.exited;
    return `${out}${err}`.trim();
}

// ---------------------------------------------------------------------------
// install / update
// ---------------------------------------------------------------------------

async function installAll() {
    for (const dir of [ROOT, BACKEND, FRONTEND]) {
        // --ignore-scripts: bun executes the project's "install" lifecycle script
        // during a plain `bun install` — without this flag it would re-enter this
        // runner and recurse forever. Dependency install scripts are unaffected
        // (bun does not run untrusted dependency scripts by default).
        const code = await run(BUN, ['install', '--ignore-scripts'], dir);
        if (code !== 0) process.exit(1);
    }
    logOk('All dependencies installed.');
}

async function cmdInstall() {
    logHead('Installing latest + missing dependencies (root, backend, frontend)');
    await installAll();
}

async function pullLatest(): Promise<boolean> {
    const remotes = await runQuiet('git', ['remote'], ROOT);
    if (!remotes) return false;
    const code = await run('git', ['pull', '--ff-only'], ROOT, { ignoreFailure: true });
    return code === 0;
}

async function cmdUpdate() {
    logHead('Updating the solution');

    const wasPulled = await pullLatest();
    logWarn(wasPulled ? 'Successfully pulled the latest code.' : 'No git remote configured; skipping pull.');

    await installAll();

    logHead('Bumping dependencies (bun update)');
    for (const dir of [BACKEND, FRONTEND]) {
        const code = await run(BUN, ['update'], dir);
        if (code !== 0) process.exit(1);
    }
    logOk('Update finished.');
}

// ---------------------------------------------------------------------------
// build
// ---------------------------------------------------------------------------

async function buildFrontend(target: 'dev' | 'prod') {
    const args = ['build.ts', 'src/index.html'];
    if (target === 'dev') {
        args.push('--no-minify', '--source-map', 'linked');
    } else {
        args.push('--minify');
    }
    const code = await run(BUN, args, FRONTEND);
    if (code !== 0) process.exit(1);
}

async function buildBackend() {
    logHead('Building backend bundle');
    logWarn('Bun 1.3.x CLI `bun build --outfile <dir>/<file>` resolves paths inconsistently; using the Bun.build API instead.');
    const result = await Bun.build({
        entrypoints: [join(BACKEND, 'index.ts')],
        outdir: join(BACKEND, 'dist'),
        format: 'esm',
        target: 'bun',
        sourcemap: 'linked',
        naming: 'server.js',
    });
    if (!result.success) {
        for (const log of result.logs) console.error(log.message);
        logErr('Backend bundle failed (see errors above).');
        process.exit(1);
    }
    logOk(`Backend bundled into ${col.dim}backend/dist/server.js${col.reset}.`);
}

function cleanDist() {
    for (const dir of [join(FRONTEND, 'dist'), join(BACKEND, 'dist')]) {
        rmSync(dir, { recursive: true, force: true });
        console.log(`${col.dim}  removed ${dir}${col.reset}`);
    }
}

async function cmdBuildDev() {
    logHead('build:dev — clean build (frontend unminified + sourcemaps, backend bundle)');
    cleanDist();
    await buildFrontend('dev');
    await buildBackend();
    logOk('Dev build complete.');
}

async function cmdBuildProd() {
    logHead('build:prod — clean build (frontend minified, backend bundle)');
    cleanDist();
    await buildFrontend('prod');
    await buildBackend();
    logOk('Production build complete.');
}

// ---------------------------------------------------------------------------
// start
// ---------------------------------------------------------------------------

async function runBackend(args: string[], sourceFile: string, note: string) {
    const script = join(BACKEND, sourceFile);
    if (!existsSync(script)) {
        console.log(`${col.warn}Missing ${script}. Did you run "bun run build" first?${col.reset}`);
        process.exit(1);
    }
    logHead(`Starting backend (${note})`);
    console.log(`${col.dim}  args: ${args.join(' ') || '(none)'}${col.reset}`);
    const code = await run(BUN, ['run', sourceFile, ...args], BACKEND);
    if (code !== 0) {
        logErr(`Backend stopped with exit code ${code}.`);
        process.exit(code);
    }
}

async function cmdStartDev(args: string[]) {
    logHead('start:dev — build the frontend once (dev), then start the backend from source');
    await buildFrontend('dev');
    await runBackend(args, 'src/main.ts', 'dev server');
}

async function cmdStartProd(args: string[]) {
    if (!existsSync(join(BACKEND, 'dist', 'server.js'))) {
        logWarn('backend/dist/server.js not found — building first (prod).');
        await buildFrontend('prod');
        await buildBackend();
    }
    await runBackend(args, 'dist/server.js', 'production bundle');
}

// ---------------------------------------------------------------------------
// test
// ---------------------------------------------------------------------------

async function cmdTestTypes() {
    for (const dir of [FRONTEND, BACKEND]) {
        logHead(`Typechecking ${dir === FRONTEND ? 'frontend' : 'backend'}`);
        const code = await run(BUN, ['x', 'tsc', '--noEmit'], dir);
        if (code !== 0) process.exit(code);
    }
    logOk('Typecheck passed.');
}

/** Collect test files (*.test.*, *.spec.*) under <cwd>/<sub>, excluding nothing (src dirs only). */
function findTestFiles(cwd: string, sub: string): string[] {
    const glob = new Bun.Glob(join(sub, '**', '*'));
    return [...glob.scanSync({ cwd })]
        .filter((f) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(f))
        .sort()
        .map((f) => join(cwd, f));
}

async function cmdTestCode() {
    logHead('Running frontend tests');
    const feTests = findTestFiles(FRONTEND, 'src');
    if (feTests.length) {
        const code = await run(BUN, ['test', ...feTests], FRONTEND);
        if (code !== 0) process.exit(code);
    } else {
        logWarn('No test files found under frontend/src — skipping.');
    }

    logHead('Running backend tests');
    const beTests = findTestFiles(BACKEND_TESTS, 'tests');
    if (!beTests.length) {
        logErr('No test files found under backend-tests/tests/.');
        process.exit(1);
    }
    const code = await run(BUN, ['test', ...beTests], BACKEND);
    if (code !== 0) process.exit(code);

    logOk('All tests passed.');
}

async function cmdTest() {
    await cmdTestTypes();
    await cmdTestCode();
}

// ---------------------------------------------------------------------------
// seed
// ---------------------------------------------------------------------------

async function cmdSeed(variant: 'en' | 'pl', args: string[]) {
    const files: Record<'en' | 'pl', string> = {
        en: 'seed-data-en.ts',
        pl: 'seed-data-pl.ts',
    };
    const file = files[variant];
    const rest = args;
    logHead(`Seeding demo data (${file})${rest.length ? ` args: ${rest.join(' ')}` : ''}`);
    const code = await run(BUN, ['run', join('scripts', file), ...rest], ROOT);
    if (code !== 0) process.exit(code);
    logOk('Seed finished.');
}

// ---------------------------------------------------------------------------
// clean
// ---------------------------------------------------------------------------

async function cmdClean() {
    cleanDist();
    logOk('Cleaned build outputs.');
}

// ---------------------------------------------------------------------------
// help
// ---------------------------------------------------------------------------

const HELP = `
${col.head}JezArch command runner${col.reset}
Cross-platform (Windows / Linux). Run as: ${col.head}bun run <command>${col.reset}

Available commands:
   ${col.head}help${col.reset}           Show this help
   ${col.head}update${col.reset}         Pull the latest code from GitHub (git pull) + install + bump dependencies
   ${col.head}install${col.reset}       Install latest and missing dependencies (root, backend, frontend)

   ${col.head}start${col.reset}          Alias for start:prod
   ${col.head}start:dev${col.reset}     Start in dev mode: build the frontend once (unminified, sourcemaps),
                             then run the backend from source (serves API + frontend)
   ${col.head}start:prod${col.reset}    Start in prod mode: run the production bundle (builds first if missing)

   ${col.head}build${col.reset}          Alias for build:prod
   ${col.head}build:dev${col.reset}     Clean build for dev: frontend (unminified, sourcemaps) + backend bundle
   ${col.head}build:prod${col.reset}    Clean build for prod: frontend (minified) + backend bundle

   ${col.head}seed${col.reset}          Alias for seed:en
   ${col.head}seed:en${col.reset}       Seed comprehensive English demo data
   ${col.head}seed:pl${col.reset}       Seed Polish demo data

   ${col.head}test${col.reset}          Run test:types, then test:code
   ${col.head}test:code${col.reset}     Run frontend + backend tests (bun test)
   ${col.head}test:types${col.reset}    Run tsc --noEmit for the frontend and the backend

   ${col.head}clean${col.reset}         Remove build outputs (frontend/dist, backend/dist)
   ${col.head}cleanup${col.reset}       Alias for clean

Examples:
   ${col.dim}bun run start:dev -- --http-port 9000${col.reset}
   ${col.dim}bun run seed http://localhost:8080 <admin-password>${col.reset}

Environment:
   SEED_ADMIN_PASSWORD   Admin password used by the seed scripts (cross-platform).
   JEZARCH_INITIAL_ADMIN_PASSWORD
                         Password for the bootstrap 'admin' account on first start.
                         If unset, a strong random password is printed once to the console.
`;

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

async function main() {
    const [command, ...rest] = process.argv.slice(2);

    switch (command) {
        case 'help':
        case '-h':
        case '--help':
        case undefined:
            console.log(HELP);
            break;
        case 'update':
            await cmdUpdate();
            break;
        case 'install':
            await cmdInstall();
            break;
        case 'start':
        case 'start:prod':
            await cmdStartProd(rest);
            break;
        case 'start:dev':
            await cmdStartDev(rest);
            break;
        case 'build':
        case 'build:prod':
            await cmdBuildProd();
            break;
        case 'build:dev':
            await cmdBuildDev();
            break;
        case 'seed':
        case 'seed:en':
            await cmdSeed('en', rest);
            break;
        case 'seed:pl':
            await cmdSeed('pl', rest);
            break;
        case 'test':
            await cmdTest();
            break;
        case 'test:code':
            await cmdTestCode();
            break;
        case 'test:types':
            await cmdTestTypes();
            break;
        case 'clean':
        case 'cleanup':
            await cmdClean();
            break;
        default:
            console.error(`${col.err}Unknown command: "${command}"${col.reset}`);
            console.log(HELP);
            process.exit(1);
    }

    if (!success) process.exit(1);
}

main();
