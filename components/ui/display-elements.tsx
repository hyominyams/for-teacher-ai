import { cn } from "@/lib/utils"

interface DisplayCardProps {
    title: string
    description?: string
    imageUrl: string
    badge?: string
    className?: string
}

export function DisplayCard({ title, description, imageUrl, badge, className }: DisplayCardProps) {
    return (
        <div className={cn(
            "group relative overflow-hidden rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-300",
            className
        )}>
            {badge && (
                <div className="absolute top-3 right-3 z-10">
                    <span className="px-2 py-1 rounded-md bg-primary/90 backdrop-blur-sm text-[10px] font-black text-primary-foreground uppercase tracking-wider shadow-sm">
                        {badge}
                    </span>
                </div>
            )}
            <div className="aspect-video w-full overflow-hidden">
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
            </div>
            <div className="p-4 space-y-1 text-left">
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{description}</p>
                )}
            </div>
        </div>
    )
}

interface GridContainerProps {
    children: React.ReactNode
    cols?: 2 | 4
    className?: string
}

export function GridContainer({ children, cols = 2, className }: GridContainerProps) {
    return (
        <div className={cn(
            "grid gap-6",
            cols === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
            className
        )}>
            {children}
        </div>
    )
}
