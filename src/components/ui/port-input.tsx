import { cn } from "@/lib/utils";
import { Input } from "./input";

export default function PortInput({
    placeholder,
    setPort,
    className,
}: {
    placeholder?: string;
    setPort: (port: number) => void;
    className?: string;
}) {
    return (
        <Input
            type="number"
            placeholder={placeholder || "Port (e.g., 8080)"}
            className={cn(
                "[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                className
            )}
            min="1"
            max="65535"
            onChange={(e) => setPort(Number(e.target.value))}
        />
    );
}
