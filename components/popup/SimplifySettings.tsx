import {
    Copy,
    FileText,
    Info,
    Lightbulb,
    MessageCircleQuestion,
    Minimize2,
    Trash2,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {useEffect, useState} from "react"

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
import {buildAiInput, generateGeminiResponse, type AiMode} from "@/lib/ai"
import {
    clearSimplifyResult,
    loadGeminiApiKey,
    loadSimplifyResult,
    saveSimplifyResult,
} from "@/lib/settings-storage"

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
    const [isGenerating, setIsGenerating] = useState(false)

    useEffect(() => {
        let isCancelled = false

        void loadSimplifyResult()
            .then((storedResult) => {
                if (!isCancelled) {
                    setResult(storedResult)
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    console.warn("[Readify] Could not load the saved result.", error)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [])

    const handleEntirePage = async () => {
        setIsGenerating(true)

        try {
            const apiKey = await loadGeminiApiKey()

            if (!apiKey.trim()) {
                setResult("Add your Gemini API key in Presets before generating a result.")
                return
            }

            const pageText = await getPageText()
            const prompt = buildAiInput(selectedMode, question, pageText)
            const generatedResult = await generateGeminiResponse(apiKey, prompt)
            setResult(generatedResult)
            void saveSimplifyResult(generatedResult).catch((error) => {
                console.warn("[Readify] Could not save the generated result.", error)
            })
        } catch (error) {
            console.warn("[Readify] Could not generate a Gemini response.", error)
            setResult(
                error instanceof Error
                    ? `Could not generate a response: ${error.message}`
                    : "Could not generate a response. Please try again.",
            )
        } finally {
            setIsGenerating(false)
        }
    }

    const handleClearResult = () => {
        setResult(null)
        void clearSimplifyResult().catch((error) => {
            console.warn("[Readify] Could not clear the saved result.", error)
        })
    }

    return (
        <Card className="py-0">
            <CardContent className="space-y-2 p-3">
                <div className="flex items-center justify-between">
                    <Label>Simplify text</Label>
                    <SimplifyInfo/>
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
                        disabled={isGenerating}
                        onClick={() => void handleEntirePage()}
                    >
                        <FileText/>
                        {isGenerating ? "Generating..." : "Entire Page"}
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
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                disabled={!result || isGenerating}
                                onClick={handleClearResult}
                            >
                                <Trash2/>
                                Clear
                            </Button>
                            <Button type="button" variant="outline" size="xs">
                                <Copy/>
                                Copy
                            </Button>
                        </div>
                    </div>

                    <div
                        className="text-muted-foreground min-h-8 max-h-54 overflow-y-auto wrap-break-word px-3 py-2 text-xs/relaxed [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_h1]:mt-5 [&_h1]:mb-2 [&_h1]:font-semibold [&_hr]:my-4 [&_li]:ml-4 [&_ol]:list-decimal [&_pre]:overflow-x-auto [&_pre]:p-2"
                        aria-labelledby="simplify-result-label"
                        aria-live="polite"
                    >
                        {result ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                    a: ({node, ...props}) => (
                                        <a {...props} target="_blank" rel="noreferrer"/>
                                    ),
                                }}
                            >
                                {result}
                            </ReactMarkdown>
                        ) : (
                            <span>Your result will appear here.</span>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
