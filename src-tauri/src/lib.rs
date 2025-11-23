use serde::{Deserialize, Serialize};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_shell::process::{CommandChild, CommandEvent};
use tauri_plugin_shell::ShellExt;

#[derive(Serialize, Deserialize, Clone)]
struct StdinCommand {
    action: String,
    session_id: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct StdoutEvent {
    action: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    session_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    sessions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    started_info: Option<StartedInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    port: Option<u16>,
    #[serde(skip_serializing_if = "Option::is_none")]
    addr: Option<String>,
}

struct TunnelProcess {
    child: CommandChild,
    #[allow(dead_code)]
    process_type: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct StartedInfo {
    process_id: String,
    process_type: String,
}

#[derive(Clone)]
struct AppState {
    process: Arc<Mutex<Option<TunnelProcess>>>,
}

fn handle_stdio(event: CommandEvent, app_handle: &AppHandle) {
    if let CommandEvent::Stdout(ref line_bytes) = event {
        let line = String::from_utf8_lossy(&line_bytes);
        if let Ok(event) = serde_json::from_str::<StdoutEvent>(&line) {
            let _ = app_handle.emit("tunnel-stdout", event);
        }
    }

    if let CommandEvent::Stderr(ref line_bytes) = event {
        let line = String::from_utf8_lossy(&line_bytes);
        println!("Tunnel stderr: {}", line.replace("\n", ""));
    }

    if let CommandEvent::Terminated(ref terminate) = event {
        println!(
            "Tunnel process terminated with exit code: {:?}",
            terminate.code
        );
        app_handle.emit("tunnel-terminated", {}).unwrap();
    }
}

#[tauri::command]
fn create_tunnel_server(
    port: u16,
    network: String,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let sidecar = app_handle.shell().sidecar("tunnel").unwrap();
    let child = sidecar
        .arg("--port")
        .arg(port.to_string())
        .arg("--network")
        .arg(network);

    let (mut rx, child) = child
        .spawn()
        .map_err(|e| format!("Failed to spawn server process: {}", e))?;

    let process_id = child.pid();
    app_handle
        .emit(
            "tunnel-started",
            StdoutEvent {
                action: "BACKEND_STARTED".to_string(),
                started_info: Some(StartedInfo {
                    process_id: process_id.to_string(),
                    process_type: "host".to_string(),
                }),
                session_id: None,
                sessions: None,
                token: None,
                port: None,
                addr: None,
                error: None,
            },
        )
        .unwrap();

    let tunnel_process = TunnelProcess {
        child,
        process_type: "server".to_string(),
    };

    if let Ok(mut processes) = state.process.lock() {
        processes.replace(tunnel_process);
    }

    println!("Spawned tunnel server process with ID: {}", process_id);

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            handle_stdio(event, &app_handle);
        }
    });

    Ok(process_id)
}

#[tauri::command]
fn create_tunnel_client(
    token: String,
    port: Option<u16>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<u32, String> {
    let sidecar = app_handle.shell().sidecar("tunnel").unwrap();
    let child = sidecar
        .arg("--token")
        .arg(&token)
        .arg("--port")
        .arg(port.unwrap_or(0).to_string());

    let (mut rx, child) = child
        .spawn()
        .map_err(|e| format!("Failed to spawn server process: {}", e))?;

    let process_id = child.pid();
    app_handle
        .emit(
            "tunnel-started",
            StdoutEvent {
                action: "BACKEND_STARTED".to_string(),
                started_info: Some(StartedInfo {
                    process_id: process_id.to_string(),
                    process_type: "client".to_string(),
                }),
                session_id: None,
                sessions: None,
                token: None,
                port: None,
                addr: None,
                error: None,
            },
        )
        .unwrap();

    let tunnel_process = TunnelProcess {
        child,
        process_type: "client".to_string(),
    };

    if let Ok(mut processes) = state.process.lock() {
        processes.replace(tunnel_process);
    }

    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            handle_stdio(event, &app_handle);
        }
    });

    Ok(process_id)
}

fn send_process(command: &str, state: &State<'_, AppState>) -> Result<(), String> {
    if let Ok(mut process) = state.process.lock() {
        if let Some(process) = process.as_mut() {
            process
                .child
                .write(command.as_bytes())
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;
            process
                .child
                .write(b"\n")
                .map_err(|e| format!("Failed to write to stdin: {}", e))?;

            return Ok(());
        }
    }

    Err("Process not found".to_string())
}

#[tauri::command]
fn server_disconnect(session: String, state: State<'_, AppState>) -> Result<(), String> {
    let command = StdinCommand {
        action: "DISCONNECT".to_string(),
        session_id: session,
    };

    let command_json = serde_json::to_string(&command)
        .map_err(|e| format!("Failed to serialize command: {}", e))?;

    if let Ok(_) = send_process(&command_json, &state) {
        return Ok(());
    }

    Err("Process not found".to_string())
}

#[tauri::command]
fn server_list(state: State<'_, AppState>) -> Result<(), String> {
    let command = StdinCommand {
        action: "LIST".to_string(),
        session_id: String::new(),
    };

    let command_json = serde_json::to_string(&command)
        .map_err(|e| format!("Failed to serialize command: {}", e))?;

    if let Ok(_) = send_process(&command_json, &state) {
        return Ok(());
    }

    Err("Process not found".to_string())
}

#[tauri::command]
fn stop_process(state: State<'_, AppState>) -> Result<(), String> {
    if let Ok(mut process) = state.process.lock() {
        if let Some(tunnel_process) = process.take() {
            tunnel_process
                .child
                .kill()
                .map_err(|e| format!("Failed to kill process: {}", e))?;
            return Ok(());
        }
    }

    Err("Process not found".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app_state = AppState {
        process: Arc::new(Mutex::new(None)),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_opener::init())
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            create_tunnel_server,
            create_tunnel_client,
            server_disconnect,
            server_list,
            stop_process
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
