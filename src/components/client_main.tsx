import { Events, useListener } from "@/ProcessProvider";
import { useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { Spinner } from "./ui/spinner";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import { invoke } from "@tauri-apps/api/core";
import CopyButton from "./ui/copy-button";

export default function ClientMain() {
    const [isConnected, setIsConnected] = useState(false);
    const [id, setId] = useState<string | null>(null);
    const [port, setPort] = useState<number | null>(null);

    useListener(Events.TunnelStdout, (data) => {
        if (data.action === "CONNECTED") {
            setIsConnected(true);
            setId(data.session_id);
            setPort(data.port || null);
        }
    });

    async function terminate() {
        await invoke("stop_process").then(() => {
            console.log("Tunnel process terminated by user.");
        });
    }

    return (
        <div className="p-4 mb-20">
            <h1 className="text-2xl font-black mb-4">Tunnel client</h1>

            <Card>
                <CardHeader>
                    {!isConnected && (
                        <CardTitle>
                            <Spinner /> Connecting to peer...
                        </CardTitle>
                    )}
                    {isConnected && <CardTitle>Connected!</CardTitle>}
                    <CardDescription>
                        <p className="break-all">Peer ID: {id}</p>
                        <p>Listening on: {port}</p>
                    </CardDescription>
                </CardHeader>
                {isConnected && (
                    <CardContent>
                        <p>You can access data from:</p>
                        <div className="bg-muted rounded text-center p-3 mt-2 font-mono text-3xl flex flex-row justify-center items-center gap-2 select-all">
                            localhost:{port}
                            <CopyButton text={`localhost:${port}`} />
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Please notice: the port is only accessible on your
                            local machine.
                        </p>
                    </CardContent>
                )}
            </Card>

            <div className="fixed bottom-0 right-0 left-0 p-4 bg-background border-t rounded-t-lg flex flex-row justify-end gap-2">
                <Button
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={terminate}
                >
                    <X />
                    Terminate
                </Button>
            </div>
        </div>
    );
}
