# mtunnel-ui

Desktop companion for the [`mtunnel`](module/mtunnel) libp2p tunnel. The app wraps the Go sidecar binary in a Tauri shell and exposes a minimal React interface for creating host tunnels, sharing connection tokens, or attaching as a client.

## Highlights

- One-click host and client flows with token-based pairing
- Live session list with disconnect controls and toast notifications
- Cross-platform sidecar bundling (Windows, macOS, Linux) driven by `scripts/build-sidecar.js`
- Tauri 2 + React 19 + Tailwind 4 frontend with shared state via `ProcessProvider`
- JSON stdio bridge between the UI and the Go process for telemetry and control

## Project Layout

- `src/` - React application rendered inside Tauri (see `App.tsx`, `components/`)
- `src-tauri/` - Rust shim that launches the UI, forwards events, and manages sidecars
- `module/mtunnel/` - Git submodule tracking [github.com/000hen/mtunnel-libp2p](https://github.com/000hen/mtunnel-libp2p), the Go sidecar source (its own README covers CLI usage)
- `scripts/build-sidecar.js` - Cross-compiles the sidecar into `src-tauri/binaries`

## Cloning

This repository depends on the `module/mtunnel` submodule. After cloning, initialise it before running any commands:

```powershell
git submodule update --init --recursive
```

Alternatively, include `--recurse-submodules` with your initial `git clone`.

## Prerequisites

- Node.js 18+ and Yarn (or another npm-compatible package manager)
- Rust toolchain with `cargo`, required by Tauri 2
- Go 1.24+ for building the sidecar (the script sets `GOOS`/`GOARCH` for common targets)
- On Windows: Visual Studio Build Tools or the MSVC build chain for Rust and Go cross-compilation

## Getting Started

```powershell
# Install JavaScript dependencies
yarn install

# Build or refresh the Go sidecar binaries (runs automatically from the scripts below)
yarn build:sidecar

# Launch the desktop app with auto-reload
yarn tauri dev

# Pure web preview without the sidecar (limited functionality)
yarn dev
```

When the Tauri shell starts it spawns the `tunnel` sidecar. The UI listens for the following Tauri events:

- `tunnel-started` - announces whether the process is running as a host or client
- `tunnel-stdout` - JSON payloads describing tokens, connections, disconnects, and errors
- `tunnel-terminated` - signals that the Go sidecar exited so local state is reset

## Building Releases

```powershell
# Produce a production web build (dist/)
yarn build

# Bundle native installers/binaries for the current platform
yarn tauri build
```

`yarn tauri build` invokes `scripts/build-sidecar.js` first so that `src-tauri/binaries/tunnel*` is up to date. Tauri then bundles the UI plus the sidecar for distribution.

## Working on the Sidecar

The UI expects the sidecar binary to speak JSON over stdout/stderr as implemented in `module/mtunnel/cmd/tunnel`. During development you can run the sidecar directly:

```powershell
cd module/mtunnel
# Host mode (shares a local TCP port)
go run ./cmd/tunnel --port 8080

# Client mode (connects using a token, listens on an ephemeral port)
go run ./cmd/tunnel --token <TOKEN> --port 0
```

Any change to the Go module should be followed by `yarn build:sidecar` so the Tauri app ships the fresh binary.

## Troubleshooting

- Sidecar fails to build: verify Go is installed and the requested `GOOS/GOARCH` pairs are supported on your machine.
- Tauri cannot open the sidecar: make sure the binaries in `src-tauri/binaries/` are executable and named exactly as expected (`tunnel-*`).
- UI does nothing on token entry: confirm the Go process is printing JSON lines; see `src-tauri/src/lib.rs` for the expected envelope.

## License

The project is distributed under the MIT License. See `LICENSE` for the canonical text.
