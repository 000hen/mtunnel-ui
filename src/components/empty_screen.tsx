import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, Link2, Share, X } from "lucide-react";
import {
    DrawerClose,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from "@/components/ui/drawer";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Dialog } from "@radix-ui/react-dialog";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useToken } from "@/ProcessProvider";
import PortInput from "./ui/port-input";
import { isPortValid } from "@/utils";

function CreationForm({
    isOpen,
    setIsOpen,
}: {
    isOpen: boolean;
    setIsOpen: (open: boolean) => void;
}) {
    const [port, setPort] = useState<number | null>(null);
    const [networkType, setNetworkType] = useState<"tcp" | "udp">("tcp");
    const [isLoading, setIsLoading] = useState(false);

    const canCreate =
        port !== null &&
        isPortValid(port) &&
        networkType !== null &&
        !isLoading;

    async function onCreateTunnel() {
        setIsLoading(true);
        if (!port || !networkType) {
            return;
        }

        // Invoke Tauri command to create tunnel
        await invoke<string>("create_tunnel_server", {
            port,
            network: networkType,
        }).then((state) => {
            console.log("Tunnel process created with pid:", state);
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Create tunnel</DrawerTitle>
                    <DrawerDescription>
                        Please provide your local port and network type for port
                        forwarding
                    </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-4 px-4 flex flex-row gap-2">
                    <PortInput setPort={setPort} />
                    <Select
                        onValueChange={(value) =>
                            setNetworkType(value as "tcp" | "udp")
                        }
                        defaultValue="tcp"
                    >
                        <SelectTrigger className="w-fit">
                            <SelectValue placeholder="TCP" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="tcp">TCP</SelectItem>
                            <SelectItem value="udp">UDP</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <DrawerFooter>
                    <Button
                        className="cursor-pointer"
                        disabled={!canCreate}
                        onClick={onCreateTunnel}
                    >
                        <Check />
                        Create Tunnel
                    </Button>
                    <DrawerClose>
                        <Button
                            variant="outline"
                            className="cursor-pointer w-full"
                        >
                            <X />
                            Cancel
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Dialog>
    );
}

export default function EmptyState() {
    const [isOpen, setIsOpen] = useState(false);
    const [token, setToken] = useToken();
    const [port, setPort] = useState<number | undefined>(undefined);

    const canConnect =
        token && token.trim().length > 0 && (!port || isPortValid(port));

    async function create_tunnel_client() {
        if (!canConnect) {
            return;
        }

        await invoke<string>("create_tunnel_client", {
            token: token!.trim(),
            port: port,
        }).then((state) => {
            console.log("Connected to tunnel with pid:", state);
        });
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen p-4">
            <CreationForm isOpen={isOpen} setIsOpen={setIsOpen} />

            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Enter a token to connect</CardTitle>
                    <CardDescription>
                        If you just received a token, enter it here to connect
                        to the server.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-row gap-2">
                    <Input
                        className="flex-1"
                        placeholder="Enter token..."
                        onChange={(e) => setToken(e.target.value)}
                    />
                    <PortInput
                        className="w-fit"
                        placeholder="Port"
                        setPort={setPort}
                    />
                </CardContent>
                <CardFooter>
                    <Button
                        onClick={() => canConnect && create_tunnel_client()}
                        disabled={!canConnect}
                        type="submit"
                        className="w-full"
                    >
                        <Link2 />
                        Connect
                    </Button>
                </CardFooter>
            </Card>

            <div className="my-4 flex items-center justify-center gap-4">
                <Separator />
                <span className="text-sm text-muted-foreground">or</span>
                <Separator />
            </div>

            <Button
                variant="outline"
                className="w-full"
                onClick={() => setIsOpen(true)}
            >
                <Share />
                Just create a tunnel
            </Button>
        </div>
    );
}
