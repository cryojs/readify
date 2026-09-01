import {Globe2} from "lucide-react"
import {Card, CardContent} from "@/components/ui/card"
import {cn} from "@/lib/utils"
import {Badge} from "@/components/ui/badge"

type SiteStatusCardProps = {
    hostname: string | null
    isSupported: boolean
}

export function SiteStatusCard({hostname, isSupported}: SiteStatusCardProps) {
    return (
        <Card className="bg-muted">
            <CardContent className="flex items-center gap-3 px-3 py-3">
                <Card
                    className="bg-background text-muted-foreground flex size-8 items-center justify-center">
                    <Globe2 className="size-4"/>
                </Card>
                <div className="min-w-0 flex-1">
                    <p className="text-muted-foreground text-[10px] font-semibold">
                        Current site
                    </p>
                    <p className="truncate text-xs font-medium">
                        {hostname ?? "No supported page"}
                    </p>
                </div>
                <Badge
                    className={cn(
                        isSupported
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                            : "bg-destructive/10 text-destructive",
                    )}
                >
                    {isSupported ? "Active" : "Unavailable"}
                </Badge>
            </CardContent>
        </Card>
    )
}
