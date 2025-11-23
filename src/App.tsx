import { toast } from "sonner";
import "./App.css";
import EmptyState from "./components/empty_screen";
import {
    Events,
    StdioActions,
    useListener,
    useStartAs,
    useToken,
} from "./ProcessProvider";
import ClientMain from "./components/client_main";
import ServerMain from "./components/server_main";

function App() {
    const status = useStartAs();
    const [_, setToken] = useToken();

    useListener(Events.TunnelStdout, (data) => {
        switch (data.action) {
            case StdioActions.TOKEN:
                console.log("Received token from backend:", data.token);
                setToken(data.token);
                break;

            case StdioActions.DISCONNECT:
                console.log("Session disconnected:", data.session_id);
                toast.info(`Session disconnected: ${data.session_id}`);
                break;

            case StdioActions.CONNECTED:
                console.log("Session connected:", data.session_id);
                toast.success(`Session connected: ${data.session_id}`);
                break;
            
            case StdioActions.ERROR:
                console.error("Error from backend:", data.error);
                toast.error(`Error: ${data.error}`);
                break;
        }
    });

    useListener(Events.TunnelTerminated, () => {
        console.log("Tunnel process has terminated.");
        toast.info("Tunnel process has terminated.");
        setToken(null);
    });

    useListener(Events.TunnelStarted, () => {
        console.log("Tunnel process has started.");
        toast.success("Tunnel process has started.");
    });

    return (
        <main className="bg-background text-foreground">
            {status === null && <EmptyState />}
            {status === "client" && <ClientMain />}
            {status === "host" && <ServerMain />}
        </main>
    );
}

export default App;
