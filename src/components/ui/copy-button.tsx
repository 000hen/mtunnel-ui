import { useEffect, useState } from "react";
import { Button } from "./button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export default function CopyButton({
    text,
    className,
}: {
    text: string;
    className?: string;
}) {
    const [isCopied, setIsCopied] = useState(false);

    useEffect(() => {
        if (!isCopied) return;

        const timeout = setTimeout(() => {
            setIsCopied(false);
        }, 2000);

        return () => clearTimeout(timeout);
    }, [isCopied]);

    function copyToClipboard() {
        setIsCopied(true);
        navigator.clipboard.writeText(text || "");
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    className={cn("cursor-pointer", className)}
                    onClick={copyToClipboard}
                >
                    {!isCopied && <Copy />}
                    {isCopied && <Check />}
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{isCopied ? "Copied!" : "Copy to clipboard"}</p>
            </TooltipContent>
        </Tooltip>
    );
}
