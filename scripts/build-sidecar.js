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

// Linux x64
build("linux", "amd64", "tunnel-x86_64-unknown-linux-gnu");

// Windows x64
build("windows", "amd64", "tunnel-x86_64-pc-windows-msvc.exe");

// macOS Intel
build("darwin", "amd64", "tunnel-x86_64-apple-darwin");

// macOS Apple Silicon
build("darwin", "arm64", "tunnel-aarch64-apple-darwin");

console.log("=== All sidecar builds completed ===");
