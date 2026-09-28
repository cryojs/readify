import {Card, CardContent} from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {Field, FieldDescription} from "@/components/ui/field"
import {Input} from "@/components/ui/input"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Button} from "@/components/ui/button"
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
    Check,
    Globe2,
    Play,
    Plus,
    Save,
    Trash2,
} from "lucide-react"

import {
    AI_PROVIDER_OPTIONS,
    getAiProviderDefinition,
    isAiProvider,
    type AiProvider,
} from "@/lib/ai"
import {type SiteSettings} from "@/lib/font-size"
import {
    createSettingsPreset,
    GLOBAL_PRESET_ID_STORAGE_KEY,
    loadGlobalSettingsExclusions,
    loadGlobalPresetId,
    loadGlobalSiteSettings,
    hasGlobalSiteSettings,
    loadSettingsPresets,
    loadAiProvider,
    loadGeminiApiKey,
    loadGroqApiKey,
    loadGrokApiKey,
    normalizeHostnameInput,
    saveAiApiKey,
    saveAiProvider,
    saveGlobalSettingsExclusions,
    saveGlobalPresetId,
    saveSettingsPresets,
    type SettingsPreset,
    type AppTheme,
} from "@/lib/settings-storage"

type PresetsSettingsProps = {
    theme: AppTheme
    onThemeChange: (theme: AppTheme) => void
    currentSettings: SiteSettings
    hostname: string | null
    onReloadActiveSettings: () => Promise<void>
    onClearSiteOverride: () => Promise<void>
    onApplySettingsToSite: (settings: SiteSettings) => Promise<void>
    onApplySettingsToGlobal: (settings: SiteSettings) => Promise<void>
    hidePopupHeader: boolean
    onHidePopupHeaderChange: (hide: boolean) => void
}

export function PresetsSettings({
    theme,
    onThemeChange,
    currentSettings,
    hostname,
    onReloadActiveSettings,
    onClearSiteOverride,
    onApplySettingsToSite,
    onApplySettingsToGlobal,
    hidePopupHeader,
    onHidePopupHeaderChange,
}: PresetsSettingsProps) {
    const [selectedProvider, setSelectedProvider] = useState<AiProvider>("gemini")
    const [apiKeys, setApiKeys] = useState<Record<AiProvider, string>>({
        gemini: "",
        groq: "",
        grok: "",
    })
    const [presets, setPresets] = useState<SettingsPreset[]>([])
    const [globalPresetId, setGlobalPresetId] = useState<string | null>(null)
    const [excludedHostnames, setExcludedHostnames] = useState<string[]>([])
    const [presetName, setPresetName] = useState("")
    const [presetError, setPresetError] = useState<string | null>(null)
    const [isExclusionsOpen, setIsExclusionsOpen] = useState(false)
    const [newExcludedHostname, setNewExcludedHostname] = useState("")
    const [exclusionError, setExclusionError] = useState<string | null>(null)

    useEffect(() => {
        let isCancelled = false

        void Promise.all([
            loadAiProvider(),
            loadGeminiApiKey(),
            loadGroqApiKey(),
            loadGrokApiKey(),
            loadGlobalSiteSettings(),
            hasGlobalSiteSettings(),
            loadSettingsPresets(),
            loadGlobalPresetId(),
            loadGlobalSettingsExclusions(),
        ])
            .then(([
                storedProvider,
                geminiApiKey,
                groqApiKey,
                grokApiKey,
                storedGlobalSettings,
                hasStoredGlobalSettings,
                storedPresets,
                storedGlobalPresetId,
                storedExclusions,
            ]) => {
                if (!isCancelled) {
                    setSelectedProvider(storedProvider)
                    setApiKeys({
                        gemini: geminiApiKey,
                        groq: groqApiKey,
                        grok: grokApiKey,
                    })
                    setPresets(storedPresets)
                    const matchingPreset = hasStoredGlobalSettings
                        ? storedPresets.find(
                            (preset) => JSON.stringify(preset.settings) === JSON.stringify(storedGlobalSettings),
                        )
                        : undefined
                    setGlobalPresetId(
                        storedPresets.some((preset) => preset.id === storedGlobalPresetId)
                            ? storedGlobalPresetId
                            : matchingPreset?.id ?? null,
                    )
                    setExcludedHostnames(storedExclusions)
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

    useEffect(() => {
        const handleStorageChange = (
            changes: Record<string, {newValue?: unknown}>,
            areaName: string,
        ) => {
            if (areaName !== "local" || !changes[GLOBAL_PRESET_ID_STORAGE_KEY]) {
                return
            }

            const nextPresetId = changes[GLOBAL_PRESET_ID_STORAGE_KEY].newValue
            setGlobalPresetId(
                typeof nextPresetId === "string" && nextPresetId.trim()
                    ? nextPresetId.trim()
                    : null,
            )
        }

        browser.storage.onChanged.addListener(handleStorageChange)

        return () => {
            browser.storage.onChanged.removeListener(handleStorageChange)
        }
    }, [])

    const handleSavePreset = async () => {
        const name = presetName.trim()

        if (!name) {
            setPresetError("Give this preset a name first.")
            return
        }

        try {
            const savedPresets = await saveSettingsPresets([
                ...presets,
                createSettingsPreset(name, currentSettings),
            ])
            setPresets(savedPresets)
            setPresetName("")
            setPresetError(null)
        } catch (error) {
            console.warn("[Readify] Could not save the preset.", error)
            setPresetError("Could not save this preset. Please try again.")
        }
    }

    const handleUpdatePreset = async (preset: SettingsPreset) => {
        try {
            const savedPresets = await saveSettingsPresets(
                presets.map((candidate) =>
                    candidate.id === preset.id
                        ? {...candidate, settings: currentSettings}
                        : candidate,
                ),
            )
            setPresets(savedPresets)

            if (preset.id === globalPresetId) {
                await onApplySettingsToGlobal(currentSettings)
                await saveGlobalPresetId(preset.id)
                setGlobalPresetId(preset.id)
            }

            setPresetError(null)
        } catch (error) {
            console.warn("[Readify] Could not update the preset.", error)
            setPresetError("Could not update this preset. Please try again.")
        }
    }

    const handleDeletePreset = async (preset: SettingsPreset) => {
        try {
            const savedPresets = await saveSettingsPresets(
                presets.filter((candidate) => candidate.id !== preset.id),
            )
            setPresets(savedPresets)

            if (preset.id === globalPresetId) {
                await saveGlobalPresetId(null)
                setGlobalPresetId(null)
            }
        } catch (error) {
            console.warn("[Readify] Could not delete the preset.", error)
            setPresetError("Could not delete this preset. Please try again.")
        }
    }

    const handleApplyPresetToGlobal = async (preset: SettingsPreset) => {
        try {
            await onApplySettingsToGlobal(preset.settings)
            await saveGlobalPresetId(preset.id)
            setGlobalPresetId(preset.id)
            setPresetError(null)
        } catch (error) {
            console.warn("[Readify] Could not make the preset global.", error)
            setPresetError("Could not make this preset global. Please try again.")
        }
    }

    const persistExclusions = async (nextHostnames: string[]) => {
        const wasCurrentSiteExcluded = hostname !== null && excludedHostnames.includes(hostname)
        const savedExclusions = await saveGlobalSettingsExclusions(nextHostnames)
        setExcludedHostnames(savedExclusions)
        const isCurrentSiteExcludedAfterSave =
            hostname !== null && savedExclusions.includes(hostname)

        if (hostname && wasCurrentSiteExcluded !== isCurrentSiteExcludedAfterSave) {
            await onReloadActiveSettings()
        }
    }

    const handleToggleCurrentExclusion = async () => {
        if (!hostname) {
            return
        }

        const nextHostnames = excludedHostnames.includes(hostname)
            ? excludedHostnames.filter((candidate) => candidate !== hostname)
            : [...excludedHostnames, hostname]

        try {
            await persistExclusions(nextHostnames)
            setExclusionError(null)
        } catch (error) {
            console.warn("[Readify] Could not update global settings exclusions.", error)
            setExclusionError("Could not update the excluded websites.")
        }
    }

    const handleAddExclusion = async () => {
        const normalizedHostname = normalizeHostnameInput(newExcludedHostname)

        if (!normalizedHostname) {
            setExclusionError("Enter a valid website or hostname.")
            return
        }

        if (excludedHostnames.includes(normalizedHostname)) {
            setExclusionError("That website is already excluded.")
            return
        }

        try {
            await persistExclusions([...excludedHostnames, normalizedHostname])
            setNewExcludedHostname("")
            setExclusionError(null)
        } catch (error) {
            console.warn("[Readify] Could not add the excluded website.", error)
            setExclusionError("Could not add that website.")
        }
    }

    const handleRemoveExclusion = async (excludedHostname: string) => {
        try {
            await persistExclusions(
                excludedHostnames.filter((candidate) => candidate !== excludedHostname),
            )
            setExclusionError(null)
        } catch (error) {
            console.warn("[Readify] Could not remove the excluded website.", error)
            setExclusionError("Could not remove that website.")
        }
    }

    const providerDefinition = getAiProviderDefinition(selectedProvider)
    const selectedApiKey = apiKeys[selectedProvider]
    const isCurrentSiteExcluded = hostname !== null && excludedHostnames.includes(hostname)

    return (
        <TabsContent value="presets" className="space-y-4">
            <Card>
                <CardContent className="space-y-3">
                    <div>
                        <Label className="text-xs">Saved presets</Label>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Save a combination of reading and typography settings, then apply it with one click. The green checked Global button marks the active global preset.
                        </p>
                    </div>
                    <div className="flex gap-1.5">
                        <Input
                            aria-label="Preset name"
                            className="min-w-0 flex-1"
                            placeholder="Preset name"
                            value={presetName}
                            onChange={(event) => setPresetName(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    event.preventDefault()
                                    void handleSavePreset()
                                }
                            }}
                        />
                        <Button
                            type="button"
                            size="sm"
                            disabled={!presetName.trim()}
                            onClick={() => void handleSavePreset()}
                        >
                            <Save/>
                            Save
                        </Button>
                    </div>
                    {presetError && (
                        <p className="text-destructive text-[11px]" role="alert">
                            {presetError}
                        </p>
                    )}
                    {presets.length === 0 ? (
                        <p className="text-muted-foreground rounded-md border border-dashed p-2 text-[11px]">
                            No presets saved yet.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {presets.map((preset) => (
                                <div
                                    key={preset.id}
                                    className="rounded-md border bg-muted/30 p-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="min-w-0 truncate pt-0.5 text-xs font-medium">
                                            {preset.name}
                                        </p>
                                        <div className="flex shrink-0 flex-wrap justify-end gap-1">
                                            <Button
                                                type="button"
                                                size="xs"
                                                disabled={!hostname}
                                                onClick={() => void onApplySettingsToSite(preset.settings)}
                                                title="Apply this preset to the current website"
                                            >
                                                <Play/>
                                                Site
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="xs"
                                                className={globalPresetId === preset.id
                                                    ? "border-emerald-600 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-400/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/60"
                                                    : undefined}
                                                onClick={() => void handleApplyPresetToGlobal(preset)}
                                                title="Use this preset as the global defaults"
                                                aria-pressed={globalPresetId === preset.id}
                                            >
                                                {globalPresetId === preset.id ? <Check/> : <Globe2/>}
                                                Global
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                onClick={() => void handleUpdatePreset(preset)}
                                                title="Update this preset with the current settings"
                                                aria-label={`Update ${preset.name}`}
                                            >
                                                <Save/>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon-xs"
                                                onClick={() => void handleDeletePreset(preset)}
                                                title="Delete this preset"
                                                aria-label={`Delete ${preset.name}`}
                                            >
                                                <Trash2/>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardContent className="space-y-3">
                    <div>
                        <Label className="text-xs">Global exclusions</Label>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                            Keep global settings off selected websites. Website-specific overrides still take priority.
                        </p>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="w-full min-w-0 overflow-hidden px-1"
                            disabled={!hostname}
                            onClick={() => void handleToggleCurrentExclusion()}
                            title={isCurrentSiteExcluded ? "Allow global settings on this site" : "Exclude this site from global settings"}
                        >
                            {isCurrentSiteExcluded ? <Globe2/> : <Plus/>}
                            <span className="truncate">
                                {isCurrentSiteExcluded ? "Allow here" : "Exclude site"}
                            </span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="w-full min-w-0 overflow-hidden px-1"
                            onClick={() => {
                                setExclusionError(null)
                                setIsExclusionsOpen(true)
                            }}
                            title="Manage excluded websites"
                        >
                            <Globe2/>
                            <span className="truncate">List ({excludedHostnames.length})</span>
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="xs"
                            className="w-full min-w-0 overflow-hidden px-1"
                            disabled={!hostname}
                            onClick={() => void onClearSiteOverride()}
                            title="Remove the current website's saved override"
                        >
                            <span className="truncate">
                                {isCurrentSiteExcluded ? "Use defaults" : "Use global"}
                            </span>
                        </Button>
                    </div>
                    {hostname && (
                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                            Global settings are {isCurrentSiteExcluded ? "disabled" : "enabled"} for {hostname}.
                        </p>
                    )}
                    {isCurrentSiteExcluded && (
                        <p className="text-muted-foreground text-[10px] leading-relaxed">
                            A website-specific override still takes priority until you choose Use global.
                        </p>
                    )}
                    {exclusionError && (
                        <p className="text-destructive text-[11px]" role="alert">
                            {exclusionError}
                        </p>
                    )}
                </CardContent>
            </Card>

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
            <Dialog
                open={isExclusionsOpen}
                onOpenChange={(open) => {
                    setIsExclusionsOpen(open)
                    if (!open) {
                        setNewExcludedHostname("")
                        setExclusionError(null)
                    }
                }}
            >
                <DialogContent
                    className={theme === "dark" ? "dark" : undefined}
                >
                    <DialogHeader>
                        <DialogTitle>Excluded websites</DialogTitle>
                        <DialogDescription>
                            Excluded websites use Readify defaults; a saved site override can still apply.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="flex gap-1.5">
                            <Input
                                aria-label="Website to exclude"
                                className="min-w-0 flex-1"
                                placeholder="example.com"
                                value={newExcludedHostname}
                                onChange={(event) => setNewExcludedHostname(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        event.preventDefault()
                                        void handleAddExclusion()
                                    }
                                }}
                            />
                            <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleAddExclusion()}
                            >
                                <Plus/>
                                Add
                            </Button>
                        </div>
                        {exclusionError && (
                            <p className="text-destructive text-[11px]" role="alert">
                                {exclusionError}
                            </p>
                        )}
                        {excludedHostnames.length === 0 ? (
                            <p className="text-muted-foreground text-[11px]">
                                No websites are excluded.
                            </p>
                        ) : (
                            <div className="max-h-48 space-y-1 overflow-y-auto">
                                {excludedHostnames.map((excludedHostname) => (
                                    <div
                                        key={excludedHostname}
                                        className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-2 py-1"
                                    >
                                        <span className="min-w-0 truncate text-xs">
                                            {excludedHostname}
                                        </span>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon-xs"
                                            onClick={() => void handleRemoveExclusion(excludedHostname)}
                                            title={`Remove ${excludedHostname}`}
                                            aria-label={`Remove ${excludedHostname}`}
                                        >
                                            <Trash2/>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </TabsContent>
    )
}
