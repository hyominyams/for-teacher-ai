import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function NavbarFrame({ children, className }: { children: ReactNode; className?: string }) {
    return (
        <div className={cn("mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8", className)}>
            {children}
        </div>
    )
}
