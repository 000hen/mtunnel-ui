import { listen } from "@tauri-apps/api/event";
import {
    createContext,
    Dispatch,
    PropsWithChildren,
    SetStateAction,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { UseInProcessProviderError } from "./errors/ProcessProvider";

export enum Events {
    TunnelStdout = "tunnel-stdout",
    TunnelTerminated = "tunnel-terminated",
    TunnelStarted = "tunnel-started",
}

export enum StdioActions {
    TOKEN = "TOKEN",
    DISCONNECT = "DISCONNECT",
    CONNECTED = "CONNECTED",
    LIST = "LIST",
    BACKEND_STARTED = "BACKEND_STARTED",
    ERROR = "ERROR",
}

export interface BackendStartedInfo {
    process_id: string;
    process_type: "client" | "host";
}

export interface SessionInfo {
    session_id: string;
    addr: string;
}

export type StdioDataPayload =
    | { action: StdioActions.TOKEN; token: string }
    | { action: StdioActions.DISCONNECT; session_id: string }
    | {
          action: StdioActions.CONNECTED;
          session_id: string;
          port?: number;
          addr?: string;
      }
    | { action: StdioActions.LIST; sessions: string[] }
    | { action: StdioActions.ERROR; error: string }
    | {
          action: StdioActions.BACKEND_STARTED;
          started_info: BackendStartedInfo;
      };

export type StdioListener<T extends Events> = (
    data: EventPayloadMap[T]
) => void;
type Listeners = {
    [key in Events]: StdioListener<key>[];
};

export type ListenerType = <T extends Events>(
    event: T,
    listener: StdioListener<T>
) => void;
export interface ProcessContextType {
    startAs: "client" | "host" | null;
    tokenSetter: [string | null, Dispatch<SetStateAction<string | null>>];
    sessions: SessionInfo[];
    addListener: ListenerType;
    removeListener: ListenerType;
}

export interface EventPayloadMap {
    [Events.TunnelStdout]: StdioDataPayload;
    [Events.TunnelStarted]: Extract<
        StdioDataPayload,
        { action: StdioActions.BACKEND_STARTED }
    >;
    [Events.TunnelTerminated]: {};
}

const ProcessContext = createContext<ProcessContextType | null>(null);

export function ProcessProvider({ children }: PropsWithChildren) {
    const tokenSetter = useState<string | null>(null);
    const [sessions, setSessions] = useState<SessionInfo[]>([]);
    const [startAs, setStartAs] = useState<"client" | "host" | null>(null);
    const listenersRef = useRef<Listeners>({
        [Events.TunnelStdout]: [],
        [Events.TunnelTerminated]: [],
        [Events.TunnelStarted]: [],
    });

    useEffect(() => {
        const unlisteners: (() => void)[] = [];

        async function setupListeners() {
            const unlistenStdout = await listen(
                Events.TunnelStdout,
                (event) => {
                    console.log("Tunnel STDOUT:", event.payload);
                    const payload = event.payload as StdioDataPayload;

                    for (const fn of listenersRef.current[
                        Events.TunnelStdout
                    ]) {
                        fn(event.payload as StdioDataPayload);
                    }

                    switch (payload.action) {
                        case StdioActions.CONNECTED:
                            setSessions((prev) => [
                                ...prev,
                                {
                                    session_id: payload.session_id,
                                    addr: payload.addr || "",
                                },
                            ]);
                            break;

                        case StdioActions.DISCONNECT:
                            setSessions((prev) =>
                                prev.filter(
                                    (s) => s.session_id !== payload.session_id
                                )
                            );
                            break;
                    }
                }
            );
            unlisteners.push(unlistenStdout);

            const unlistenTerminated = await listen(
                Events.TunnelTerminated,
                (event) => {
                    console.log("Tunnel Terminated:", event.payload);

                    setStartAs(null);
                    setSessions([]);

                    for (const fn of listenersRef.current[
                        Events.TunnelTerminated
                    ]) {
                        fn({});
                    }
                }
            );
            unlisteners.push(unlistenTerminated);

            const unlistenStarted = await listen(
                Events.TunnelStarted,
                (event) => {
                    console.log("Tunnel Started:", event.payload);
                    const payload = event.payload as StdioDataPayload | null;
                    if (
                        !payload ||
                        payload.action !== StdioActions.BACKEND_STARTED
                    ) {
                        console.error(
                            "Invalid payload for TunnelStarted event:",
                            event.payload
                        );
                        return;
                    }

                    setStartAs(
                        payload.started_info.process_type as "client" | "host"
                    );
                    for (const fn of listenersRef.current[
                        Events.TunnelStarted
                    ]) {
                        fn(payload);
                    }
                }
            );
            unlisteners.push(unlistenStarted);
        }

        setupListeners();

        return () => {
            unlisteners.forEach((unlisten) => unlisten());
        };
    }, []);

    function addListener<T extends Events>(
        event: T,
        listener: StdioListener<T>
    ) {
        listenersRef.current[event].push(listener as any);
    }

    function removeListener<T extends Events>(
        event: T,
        listener: StdioListener<T>
    ) {
        listenersRef.current[event] = listenersRef.current[event].filter(
            (l) => l !== listener
        ) as any;
    }

    return (
        <ProcessContext.Provider
            value={{
                addListener,
                removeListener,
                tokenSetter,
                sessions: sessions,
                startAs,
            }}
        >
            {children}
        </ProcessContext.Provider>
    );
}

function getContext(): ProcessContextType {
    const context = useContext(ProcessContext);
    if (!context) {
        throw new UseInProcessProviderError("useProcessContext");
    }

    return context;
}

export function useListener<T extends Events>(
    event: T,
    listener: StdioListener<T>
) {
    const context = getContext();

    useEffect(() => {
        context.addListener(event, listener);
        return () => context.removeListener(event, listener);
    }, []);
}

export function useToken(): [
    string | null,
    Dispatch<SetStateAction<string | null>>
] {
    return getContext().tokenSetter;
}

export function useSessions(): SessionInfo[] {
    return getContext().sessions;
}

export function useStartAs(): "client" | "host" | null {
    return getContext().startAs;
}
