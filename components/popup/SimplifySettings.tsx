import {
    Copy,
    FileText,
    Info,
    Lightbulb,
    MessageCircleQuestion,
    Minimize2,
} from "lucide-react"
import {useState} from "react"

import {Button} from "@/components/ui/button"
import {Card, CardContent, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {Kbd} from "@/components/ui/kbd"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {Tooltip, TooltipContent, TooltipTrigger} from "@/components/ui/tooltip"
import {Label} from "@/components/ui/label"
import {buildAiInput, type AiMode} from "@/lib/ai"

const MODES = [
    {value: "shorten", label: "Shorten", icon: Minimize2},
    {value: "explain", label: "Explain", icon: Lightbulb},
    {value: "ask", label: "Ask", icon: MessageCircleQuestion},
] as const

function SimplifyInfo() {
    return (
        <Tooltip>
            <TooltipTrigger
                delay={0}
                closeOnClick={false}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex size-5 shrink-0 cursor-default items-center justify-center rounded-sm outline-none transition-colors focus-visible:ring-2"
                render={
                    <span tabIndex={0} aria-label="How to use Readify">
                                    <Info className="size-3.5" aria-hidden="true"/>
                                </span>
                }
            />
            <TooltipContent
                side="bottom"
                align="end"
                className="w-60 flex-col items-stretch gap-3 whitespace-normal p-3 text-[11px] leading-relaxed **:data-[slot=kbd]:shrink-0"
            >
                <div className="space-y-1.5">
                    <p className="font-medium">How to use</p>
                    <p>
                        <span className="font-medium">Highlighted text:</span>{" "}
                        highlight text on a page, then choose your desired action.
                    </p>
                    <p>
                        <span className="font-medium">Entire page:</span>{" "}
                        use the browser menu to simplify the page.
                    </p>
                </div>

                <div className="space-y-1.5 border-t border-background/20 pt-3">
                    <p className="font-medium">Keyboard shortcuts</p>
                    <div className="flex items-center justify-between gap-3">
                        <span>Simplify selected text</span>
                        <Kbd>Alt + Shift + S</Kbd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                        <span>Ask follow-up</span>
                        <Kbd>Alt + Shift + A</Kbd>
                    </div>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}

type SimplifySettingsProps = {
    getPageText: () => Promise<string>
}

export function SimplifySettings({getPageText}: SimplifySettingsProps) {
    const [selectedMode, setSelectedMode] = useState<AiMode>("shorten")
    const [question, setQuestion] = useState("")
    const [result, setResult] = useState<string | null>(null)
    const [isReadingPage, setIsReadingPage] = useState(false)

    const handleEntirePage = async () => {
        setIsReadingPage(true)

        try {
            const pageText = await getPageText()
            setResult(buildAiInput(selectedMode, question, pageText))
        } catch (error) {
            console.warn("[Readify] Could not read the active page.", error)
            setResult("Could not read the active page. Reload the page and try again.")
        } finally {
            setIsReadingPage(false)
        }
    }

    return (
        <Card className="py-0">
            <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                    <Label>Simplify text</Label>
                    <SimplifyInfo />
                </div>

                <div className="flex items-center gap-2">
                    <Select
                        items={MODES}
                        value={selectedMode}
                        onValueChange={(value) => setSelectedMode(value as AiMode)}
                    >
                        <SelectTrigger id="simplify-mode" className="h-8 min-w-0 flex-1">
                            <SelectValue>
                                {(value) => {
                                    const mode = MODES.find((option) => option.value === value)
                                    if (!mode) return "Choose a mode"
                                    const Icon = mode.icon
                                    return <><Icon aria-hidden="true"/>{mode.label}</>
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                            {MODES.map(({value, label, icon: Icon}) => (
                                <SelectItem key={value} value={value}>
                                    <Icon aria-hidden="true"/>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        type="button"
                        variant="outline"
                        className="shrink-0"
                        disabled={isReadingPage}
                        onClick={() => void handleEntirePage()}
                    >
                        <FileText/>
                        {isReadingPage ? "Reading..." : "Entire Page"}
                    </Button>
                </div>

                {selectedMode === "ask" && (
                    <div>
                        <Input
                            id="ask-question"
                            placeholder="Your question goes here. Ask away!"
                            value={question}
                            onChange={(event) => setQuestion(event.target.value)}
                        />
                    </div>
                )}

                <div className="overflow-hidden rounded-md border bg-muted/30">
                    <div className="flex items-center justify-between gap-3 border-b bg-card pl-3 pr-1 py-1">
                        <h3 id="simplify-result-label" className="text-xs font-medium">Result</h3>
                        <Button type="button" variant="outline" size="xs">
                            <Copy/>
                            Copy
                        </Button>
                    </div>

                    <div
                        className="text-muted-foreground min-h-20 max-h-54 overflow-y-auto px-3 py-3 text-xs/relaxed"
                        aria-labelledby="simplify-result-label"
                        aria-live="polite"
                    >
                        <span className="whitespace-pre-wrap wrap-break-word">
                            {result ?? "Your result will appear here."}
                        </span>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
