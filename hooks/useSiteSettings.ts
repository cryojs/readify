import {useEffect, useState} from "react"

import {
    APPLY_SITE_SETTINGS_MESSAGE,
    FONT_SIZE_FIELDS,
    GET_PAGE_TEXT_MESSAGE,
    LETTER_SPACING_STEP,
    LINE_HEIGHT_STEP,
    MAX_LETTER_SPACING,
    MAX_LINE_HEIGHT,
    MAX_TEXT_SCALE,
    MIN_LETTER_SPACING,
    MIN_LINE_HEIGHT,
    MIN_TEXT_SCALE,
    TEXT_SCALE_STEP,
    clampFontSize,
    clampNumber,
    createDefaultSiteSettings,
    getSupportedHostname,
    isPageTextResponse,
    normalizeSiteSettings,
    type FontFamilyKey,
    type FontSizeCategory,
    type SiteSettings,
} from "@/lib/font-size"
import {
    getStorageErrorMessage,
    loadEffectiveSiteSettings,
    removeSiteSettings,
    saveGlobalPresetId,
    saveGlobalSiteSettings,
    saveSiteSettings,
} from "@/lib/settings-storage"

type StatusTone = "success" | "error" | "info"

export type Status = {
    tone: StatusTone
    message: string
}

type TextSizeUpdater = (
    textSize: SiteSettings["textSize"],
) => SiteSettings["textSize"]

type TypographyUpdater = (
    typography: SiteSettings["typography"],
) => SiteSettings["typography"]

type SettingsTarget = "site" | "global"

export function useSiteSettings() {
    const [activeTabId, setActiveTabId] = useState<number | null>(null)
    const [hostname, setHostname] = useState<string | null>(null)
    const [faviconUrl, setFaviconUrl] = useState<string | null>(null)
    const [settings, setSettings] = useState<SiteSettings>(createDefaultSiteSettings())
    const [isLoading, setIsLoading] = useState(true)
    const [isApplying, setIsApplying] = useState(false)
    const [isSupported, setIsSupported] = useState(false)
    const [status, setStatus] = useState<Status | null>(null)
    const [settingsTarget, setSettingsTarget] = useState<SettingsTarget>("site")

    useEffect(() => {
        let isCancelled = false

        const loadActiveSite = async () => {
            try {
                const [activeTab] = await browser.tabs.query({
                    active: true,
                    currentWindow: true,
                })
                const activeHostname = getSupportedHostname(activeTab?.url)
                const tabId = typeof activeTab?.id === "number" ? activeTab.id : null

                if (isCancelled) {
                    return
                }

                setActiveTabId(tabId)
                setHostname(activeHostname)
                setFaviconUrl(
                    activeHostname && activeTab?.favIconUrl
                        ? activeTab.favIconUrl
                        : null,
                )
                setIsSupported(Boolean(activeHostname && tabId !== null))

                if (!activeHostname || tabId === null) {
                    setStatus({
                        tone: "error",
                        message: "Open a regular website to customize its text.",
                    })
                    return
                }

                const activeSettings = await loadEffectiveSiteSettings(activeHostname)

                if (!isCancelled) {
                    setSettings(activeSettings)
                    setSettingsTarget("site")
                    setStatus({
                        tone: "info",
                        message: "Ready to customize this site.",
                    })
                }
            } catch (error) {
                if (!isCancelled) {
                    console.error("[Readify] Could not load site settings.", error)
                    setStatus({
                        tone: "error",
                        message: getStorageErrorMessage(error, "read"),
                    })
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadActiveSite()

        return () => {
            isCancelled = true
        }
    }, [])

    const updateTextSize = (update: TextSizeUpdater) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            textSize: update(currentSettings.textSize),
        }))
    }

    const updateTypography = (update: TypographyUpdater) => {
        setSettings((currentSettings) => ({
            ...currentSettings,
            typography: update(currentSettings.typography),
        }))
    }

    const updateTextScale = (value: number) => {
        updateTextSize((textSize) => ({
            ...textSize,
            scale: clampNumber(
                value,
                MIN_TEXT_SCALE,
                MAX_TEXT_SCALE,
                TEXT_SCALE_STEP,
                textSize.scale,
            ),
        }))
    }

    const toggleExactOverride = (key: FontSizeCategory, enabled: boolean) => {
        updateTextSize((textSize) => {
            const overrides = {...textSize.overrides}

            if (enabled) {
                const field = FONT_SIZE_FIELDS.find((candidate) => candidate.key === key)
                overrides[key] = overrides[key] ?? field?.defaultValue ?? 16
            } else {
                delete overrides[key]
            }

            return {...textSize, overrides}
        })
    }

    const updateExactSize = (key: FontSizeCategory, value: number) => {
        updateTextSize((textSize) => ({
            ...textSize,
            overrides: {
                ...textSize.overrides,
                [key]: clampFontSize(value, textSize.overrides[key] ?? 16),
            },
        }))
    }

    const updateFontFamily = (fontFamily: FontFamilyKey) => {
        updateTypography((typography) => ({
            ...typography,
            fontFamily,
        }))
    }

    const toggleLetterSpacing = (enabled: boolean) => {
        updateTypography((typography) => ({
            ...typography,
            letterSpacing: enabled ? typography.letterSpacing ?? 0 : null,
        }))
    }

    const updateLetterSpacing = (value: number) => {
        updateTypography((typography) => ({
            ...typography,
            letterSpacing: clampNumber(
                value,
                MIN_LETTER_SPACING,
                MAX_LETTER_SPACING,
                LETTER_SPACING_STEP,
                typography.letterSpacing ?? 0,
            ),
        }))
    }

    const toggleLineHeight = (enabled: boolean) => {
        updateTypography((typography) => ({
            ...typography,
            lineHeight: enabled ? typography.lineHeight ?? 1.5 : null,
        }))
    }

    const updateLineHeight = (value: number) => {
        updateTypography((typography) => ({
            ...typography,
            lineHeight: clampNumber(
                value,
                MIN_LINE_HEIGHT,
                MAX_LINE_HEIGHT,
                LINE_HEIGHT_STEP,
                typography.lineHeight ?? 1.5,
            ),
        }))
    }

    const persistSettings = async (
        target: SettingsTarget,
        nextSettings: SiteSettings,
    ) => {
        if (target === "site" && (!hostname || activeTabId === null)) {
            setStatus({
                tone: "error",
                message: "Open a regular website before customizing its text.",
            })
            return
        }

        const normalizedSettings = normalizeSiteSettings(nextSettings)
        setSettings(normalizedSettings)
        setSettingsTarget(target)
        setIsApplying(true)
        setStatus(null)

        try {
            if (target === "global") {
                await saveGlobalSiteSettings(normalizedSettings)
                await saveGlobalPresetId(null).catch((error) => {
                    console.warn("[Readify] Could not clear the active global preset.", error)
                })
                setStatus({
                    tone: "success",
                    message: "Global settings saved.",
                })
                return
            }

            const savedSettings = await saveSiteSettings(hostname!, normalizedSettings)

            try {
                await browser.tabs.sendMessage(activeTabId!, {
                    type: APPLY_SITE_SETTINGS_MESSAGE,
                    settings: savedSettings,
                })

                setStatus({
                    tone: "success",
                    message: `Applied to ${hostname}`,
                })
            } catch (error) {
                console.warn("[Readify] Could not message the active page.", error)
                setStatus({
                    tone: "error",
                    message: "Saved for this site. Reload the page to apply the changes.",
                })
            }
        } catch (error) {
            console.error("[Readify] Could not save settings.", error)
            const operation = error instanceof Error && "operation" in error
                ? (error as { operation?: "read" | "write" }).operation ?? "write"
                : "write"
            setStatus({
                tone: "error",
                message: getStorageErrorMessage(error, operation),
            })
        } finally {
            setIsApplying(false)
        }
    }

    const reloadActiveSettings = async () => {
        if (!hostname) {
            return
        }

        try {
            const activeSettings = await loadEffectiveSiteSettings(hostname)
            setSettings(activeSettings)
            setSettingsTarget("site")
        } catch (error) {
            setStatus({
                tone: "error",
                message: getStorageErrorMessage(error, "read"),
            })
            throw error
        }
    }

    const clearSiteOverride = async () => {
        if (!hostname || activeTabId === null) {
            setStatus({
                tone: "error",
                message: "Open a regular website before clearing its override.",
            })
            return
        }

        setIsApplying(true)
        setStatus(null)

        try {
            await removeSiteSettings(hostname)
            const activeSettings = await loadEffectiveSiteSettings(hostname)
            setSettings(activeSettings)
            setSettingsTarget("site")

            try {
                await browser.tabs.sendMessage(activeTabId, {
                    type: APPLY_SITE_SETTINGS_MESSAGE,
                    settings: activeSettings,
                })
            } catch (error) {
                console.warn("[Readify] Could not message the active page.", error)
            }

            setStatus({
                tone: "success",
                message: "This site is using its global/default settings again.",
            })
        } catch (error) {
            console.error("[Readify] Could not clear the site override.", error)
            const operation = error instanceof Error && "operation" in error
                ? (error as { operation?: "read" | "write" }).operation ?? "write"
                : "write"
            setStatus({
                tone: "error",
                message: getStorageErrorMessage(error, operation),
            })
        } finally {
            setIsApplying(false)
        }
    }

    const resetSettings = async () => {
        if (settingsTarget === "site") {
            await clearSiteOverride()
            return
        }

        setSettings(createDefaultSiteSettings())
        setStatus({
            tone: "info",
            message: "Defaults restored. Save global settings to keep them.",
        })
    }

    const applySettings = async () => {
        await persistSettings(settingsTarget, settings)
    }

    const getPageText = async () => {
        if (!hostname || activeTabId === null) {
            throw new Error("Open a regular website before reading the page.")
        }

        const response = await browser.tabs.sendMessage(activeTabId, {
            type: GET_PAGE_TEXT_MESSAGE,
        })

        if (!isPageTextResponse(response)) {
            throw new Error("The active page did not return readable text.")
        }

        return response.text
    }

    return {
        state: {
            hostname,
            faviconUrl,
            settings,
            settingsTarget,
            isLoading,
            isApplying,
            isSupported,
            status,
        },
        actions: {
            textSize: {
                updateTextScale,
                toggleExactOverride,
                updateExactSize,
            },
            typography: {
                updateFontFamily,
                toggleLetterSpacing,
                updateLetterSpacing,
                toggleLineHeight,
                updateLineHeight,
            },
            getPageText,
            reloadActiveSettings,
            clearSiteOverride,
            applySettingsToSite: (nextSettings: SiteSettings) =>
                persistSettings("site", nextSettings),
            applySettingsToGlobal: (nextSettings: SiteSettings) =>
                persistSettings("global", nextSettings),
            resetSettings,
            applySettings,
        },
    }
}
