import * as React from "react"
import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card"
            className={cn(
                "bg-white/70 dark:bg-card/70 backdrop-blur-2xl text-card-foreground flex flex-col gap-6 rounded-[2.5rem] border border-white/50 dark:border-white/10 p-8 shadow-[0_32px_64px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden transition-all duration-500 hover:shadow-primary/5 hover:border-primary/20",
                className
            )}
            {...props}
        />
    )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-header"
            className={cn(
                "flex flex-col gap-2 pt-2",
                className
            )}
            {...props}
        />
    )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-title"
            className={cn("text-2xl font-black tracking-tight leading-tight", className)}
            {...props}
        />
    )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-description"
            className={cn("text-muted-foreground text-sm font-medium", className)}
            {...props}
        />
    )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-content"
            className={cn("pt-4", className)}
            {...props}
        />
    )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="card-footer"
            className={cn("flex items-center pt-2", className)}
            {...props}
        />
    )
}

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
}
