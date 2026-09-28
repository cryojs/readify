import {Card, CardContent} from "@/components/ui/card"
import {Field, FieldDescription} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {TabsContent} from "@/components/ui/tabs"
import {useEffect, useState} from "react"

import {
    AI_PROVIDER_OPTIONS,
    getAiProviderDefinition,
    isAiProvider,
    type AiProvider,
} from "@/lib/ai"
import {
    loadAiProvider,
    loadGeminiApiKey,
    loadGroqApiKey,
    loadGrokApiKey,
    saveAiApiKey,
    saveAiProvider,
    type AppTheme,
} from "@/lib/settings-storage"

type PresetsSettingsProps = {
    theme: AppTheme
    onThemeChange: (theme: AppTheme) => void
    hidePopupHeader: boolean
    onHidePopupHeaderChange: (hide: boolean) => void
}

export function PresetsSettings({
    theme,
    onThemeChange,
    hidePopupHeader,
    onHidePopupHeaderChange,
}: PresetsSettingsProps) {
    const [selectedProvider, setSelectedProvider] = useState<AiProvider>("gemini")
    const [apiKeys, setApiKeys] = useState<Record<AiProvider, string>>({
        gemini: "",
        groq: "",
        grok: "",
    })

    useEffect(() => {
        let isCancelled = false

        void Promise.all([
            loadAiProvider(),
            loadGeminiApiKey(),
            loadGroqApiKey(),
            loadGrokApiKey(),
        ])
            .then(([storedProvider, geminiApiKey, groqApiKey, grokApiKey]) => {
                if (!isCancelled) {
                    setSelectedProvider(storedProvider)
                    setApiKeys({
                        gemini: geminiApiKey,
                        groq: groqApiKey,
                        grok: grokApiKey,
                    })
                }
            })
            .catch((error) => {
                if (!isCancelled) {
                    console.warn("[Readify] Could not load the AI provider settings.", error)
                }
            })

        return () => {
            isCancelled = true
        }
    }, [])

    const providerDefinition = getAiProviderDefinition(selectedProvider)
    const selectedApiKey = apiKeys[selectedProvider]

    return (
        <TabsContent value="presets" className="space-y-4">
            <Card>
                <CardContent className="space-y-3">
                    <div>
                        <Label htmlFor="ai-provider" className="text-xs">
                            AI provider
                        </Label>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Choose which service powers Readify's AI features.
                        </p>
                    </div>
                    <Select
                        items={AI_PROVIDER_OPTIONS}
                        value={selectedProvider}
                        onValueChange={(value) => {
                            if (!isAiProvider(value)) {
                                return
                            }

                            setSelectedProvider(value)
                            void saveAiProvider(value).catch((error) => {
                                console.warn("[Readify] Could not save the AI provider.", error)
                            })
                        }}
                    >
                        <SelectTrigger id="ai-provider" className="w-full">
                            <SelectValue>
                                {(value) => {
                                    const provider = AI_PROVIDER_OPTIONS.find(
                                        (option) => option.value === value,
                                    )
                                    return provider?.label ?? "Choose a provider"
                                }}
                            </SelectValue>
                        </SelectTrigger>
                        <SelectContent alignItemWithTrigger={false}>
                            {AI_PROVIDER_OPTIONS.map(({value, label}) => (
                                <SelectItem key={value} value={value}>
                                    {label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Field>
                        <Label htmlFor={`${selectedProvider}-api-key`} className="text-xs">
                            {providerDefinition.apiKeyLabel}
                        </Label>
                        <FieldDescription>
                            {providerDefinition.apiKeyDescription}{" "}
                            <a
                                href={providerDefinition.apiKeyUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                Open provider console
                            </a>
                        </FieldDescription>
                        <Input
                            id={`${selectedProvider}-api-key`}
                            type="password"
                            autoComplete="off"
                            placeholder={providerDefinition.apiKeyPlaceholder}
                            value={selectedApiKey}
                            onChange={(event) => {
                                const value = event.target.value
                                setApiKeys((currentKeys) => ({
                                    ...currentKeys,
                                    [selectedProvider]: value,
                                }))
                                void saveAiApiKey(selectedProvider, value).catch((error) => {
                                    console.warn("[Readify] Could not save the AI API key.", error)
                                })
                            }}
                        />
                    </Field>
                </CardContent>
            </Card>
            <Card>
                <CardContent className="space-y-3">
                    <div>
                        <Label className="text-xs">Appearance</Label>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Choose the light or dark theme for Readify.
                        </p>
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2">
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium">
                                {theme === "dark" ? "Dark mode" : "Light mode"}
                            </p>
                            <p className="text-muted-foreground text-[11px]">
                                {theme === "dark" ? "Darker interface" : "Light interface"}
                            </p>
                        </div>
                        <Switch
                            aria-label="Toggle dark mode"
                            checked={theme === "dark"}
                            onCheckedChange={(checked) => {
                                onThemeChange(checked ? "dark" : "light")
                            }}
                        />
                    </div>
                    <div className="flex items-center justify-between rounded-md border bg-muted/30 p-2">
                        <div className="space-y-0.5">
                            <p className="text-xs font-medium">Hide top banner</p>
                            <p className="text-muted-foreground text-[11px]">
                                Hide the logo and description at the top of the popup.
                            </p>
                        </div>
                        <Switch
                            aria-label="Hide top banner"
                            checked={hidePopupHeader}
                            onCheckedChange={onHidePopupHeaderChange}
                        />
                    </div>
                </CardContent>
            </Card>
        </TabsContent>
    )
}
