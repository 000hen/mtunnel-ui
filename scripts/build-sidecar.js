import { execSync } from "child_process";
import { mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const binDir = path.join(__dirname, "..", "src-tauri", "binaries");
const projectDir = path.join(__dirname, "..", "module", "mtunnel");

function run(cmd, envVars = {}) {
    console.log("[RUN]", cmd);
    execSync(cmd, {
        stdio: "inherit",
        env: { ...process.env, ...envVars },
        cwd: "module/mtunnel",
    });
}

function build(goos, goarch, outfile) {
    mkdirSync(binDir, { recursive: true });

    const output = `${binDir}/${outfile}`;

    const env = {
        GOOS: goos,
        GOARCH: goarch,
        CGO_ENABLED: "0",
    };

    const cmd = `go build -ldflags "-s -w" -o ${output} ${projectDir}/cmd/tunnel/`;

    run(cmd, env);
    console.log("Built:", output);
}

console.log("=== Building Sidecar (Tauri v2 format) ===");

// Get the target triple from rustup
const rustupOutput = execSync('rustup show', { encoding: 'utf-8' });
const targetMatch = rustupOutput.match(/Default host: (.+)/);

if (!targetMatch) {
    throw new Error('Could not determine target triple from rustup');
}

const targetTriple = targetMatch[1].trim();
console.log('Building for target:', targetTriple);

// Parse target triple to get GOOS and GOARCH
let goos, goarch;

if (targetTriple.includes('linux')) {
    goos = 'linux';
} else if (targetTriple.includes('windows')) {
    goos = 'windows';
} else if (targetTriple.includes('darwin') || targetTriple.includes('apple')) {
    goos = 'darwin';
} else {
    throw new Error(`Unsupported target: ${targetTriple}`);
}

if (targetTriple.includes('x86_64')) {
    goarch = 'amd64';
} else if (targetTriple.includes('aarch64') || targetTriple.includes('arm64')) {
    goarch = 'arm64';
} else {
    throw new Error(`Unsupported architecture in target: ${targetTriple}`);
}

const outfile = `tunnel-${targetTriple}${goos === 'windows' ? '.exe' : ''}`;
build(goos, goarch, outfile);

console.log("=== All sidecar builds completed ===");
