import { useSessions, useToken } from "@/ProcessProvider";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "./ui/card";
import { X } from "lucide-react";
import { Button } from "./ui/button";
import CopyButton from "./ui/copy-button";
import { invoke } from "@tauri-apps/api/core";

export default function ServerMain() {
    const sessions = useSessions();
    const [token] = useToken();

    async function terminate() {
        await invoke("stop_process").then(() => {
            console.log("Tunnel process terminated by user.");
        });
    }

    async function disconnect(session_id: string) {
        await invoke("server_disconnect", { session: session_id }).then(() => {
            console.log(`Disconnected session: ${session_id}`);
        });
    }

    return (
        <div className="p-4 mb-20">
            <h1 className="text-2xl font-black mb-4">Tunnel host</h1>
            {!sessions.length && <TokenCard token={token} />}
            {sessions.map((session) => (
                <Card key={"scard:" + session.session_id} className="mb-4">
                    <CardHeader>
                        <CardTitle className="break-all leading-6">
                            {session.session_id}
                            {session.session_id.startsWith("Qm") && (
                                <span className="text-sm text-muted-foreground">
                                    IPFS Peer
                                </span>
                            )}
                        </CardTitle>
                        <CardDescription>
                            From:{" "}
                            <code className="px-2 py-1 rounded bg-muted">
                                {session.addr}
                            </code>
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            variant="destructive"
                            className="w-full cursor-pointer"
                            onClick={() => disconnect(session.session_id)}
                        >
                            <X />
                            Disconnect
                        </Button>
                    </CardContent>
                </Card>
            ))}

            <div className="fixed bottom-0 right-0 left-0 p-4 bg-background border-t rounded-t-lg flex flex-row justify-end gap-2">
                <Button
                    variant="destructive"
                    className="flex-1 cursor-pointer"
                    onClick={terminate}
                >
                    <X />
                    Terminate
                </Button>
                {sessions.length > 0 && <CopyButton text={token || ""} />}
            </div>
        </div>
    );
}

function TokenCard({ token }: { token: string | null }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Token</CardTitle>
                <CardDescription>
                    Please share this token with clients to connect
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="w-full bg-muted p-4 rounded">
                    <CopyButton text={token || ""} className="float-end" />
                    <code className="break-all select-all">{token}</code>
                </div>
            </CardContent>
        </Card>
    );
}
