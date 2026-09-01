import logoUrl from "@/assets/logo.png"

export function PopupHeader() {
    return (
        <header className="bg-card-foreground p-2">
            <div className="flex items-center gap-3 text-background">
                <img
                    src={logoUrl}
                    alt="Readify logo"
                    className="size-9 shrink-0 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold tracking-tight">Readify</p>
                    <p className="text-background/90 text-[11px]">
                        Make every site easier to read, tailored to you
                    </p>
                </div>
            </div>
        </header>
    )
}
