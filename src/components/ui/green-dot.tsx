import { cn } from "@/lib/utils";

export default function GreenDot({ className }: { className?: string }) {
    return (
        <div
            className={cn("bg-green-600 rounded-full w-2 h-2", className)}
        ></div>
    );
}
