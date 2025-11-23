import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ProcessProvider } from "./ProcessProvider";
import { Toaster } from "sonner";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <ProcessProvider>
        <React.StrictMode>
            <Toaster />
            <App />
        </React.StrictMode>
    </ProcessProvider>
);
