import {
    AlertCircle,
    Check,
    ChevronRight,
    Info,
    LoaderCircle,
    RotateCcw,
} from "lucide-react"

import {Button} from "@/components/ui/button"
import {type Status} from "@/hooks/useSiteSettings"
import {cn} from "@/lib/utils"

type PopupFooterProps = {
    status: Status | null
    isApplying: boolean
    controlsDisabled: boolean
    isSupported: boolean
    onReset: () => void
}

export function PopupFooter(
    {
        status,
        isApplying,
        controlsDisabled,
        isSupported,
        onReset,
    }: PopupFooterProps) {
    const StatusIcon =
        status?.tone === "success"
            ? Check
            : status?.tone === "error"
                ? AlertCircle
                : Info

    return (
        <div
            className="sticky bottom-0 -mx-4 space-y-2 bg-accent border-t p-2">
            <div className="h-4">
                {status && (
                    <div
                        className={cn(
                            "flex items-center gap-2 px-1 text-[11px] leading-tight",
                            status.tone === "success" && "text-emerald-700",
                            status.tone === "error" && "text-destructive",
                            status.tone === "info" && "text-muted-foreground",
                        )}
                        role={status.tone === "error" ? "alert" : "status"}
                    >
                        <StatusIcon className="size-3.5 shrink-0"/>
                        <span className="min-w-0">{status.message}</span>
                    </div>
                )}
            </div>

            <div className="flex gap-1">
                <Button
                    type="button"
                    variant="destructive"
                    size="lg"
                    className="px-3"
                    disabled={controlsDisabled}
                    onClick={onReset}
                >
                    <RotateCcw/>
                    Reset
                </Button>
                <Button
                    type="submit"
                    size="lg"
                    className="flex-1"
                    disabled={controlsDisabled || !isSupported}
                >
                    {isApplying ? (
                        <LoaderCircle className="animate-spin"/>
                    ) : (
                        <Check/>
                    )}
                    {isApplying ? "Applying…" : "Apply settings"}
                    {!isApplying && <ChevronRight className="ml-auto"/>}
                </Button>
            </div>
        </div>
    )
}
