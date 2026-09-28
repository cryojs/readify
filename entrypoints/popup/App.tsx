import {
    Tabs,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs"
import {PopupHeader} from "@/components/popup/PopupHeader"
import {SiteStatusCard} from "@/components/popup/SiteStatusCard"
import {TextSizeSettings} from "@/components/popup/TextSizeSettings"
import {TypographySettings} from "@/components/popup/TypographySettings"
import {PresetsSettings} from "@/components/popup/PresetsSettings"
import {PopupFooter} from "@/components/popup/PopupFooter"
import {useSiteSettings} from "@/hooks/useSiteSettings"
import {
    loadHidePopupHeader,
    loadAppTheme,
    saveHidePopupHeader,
    saveAppTheme,
    type AppTheme,
} from "@/lib/settings-storage"
import {useEffect, useState} from "react"

function App() {
    const {state, actions} = useSiteSettings()
    const [theme, setTheme] = useState<AppTheme>("light")
    const [hidePopupHeader, setHidePopupHeader] = useState(false)
    const controlsDisabled = state.isLoading || state.isApplying

    useEffect(() => {
        void Promise.all([loadAppTheme(), loadHidePopupHeader()])
            .then(([storedTheme, storedHidePopupHeader]) => {
                setTheme(storedTheme)
                setHidePopupHeader(storedHidePopupHeader)
            })
            .catch((error) => {
                console.warn("[Readify] Could not load the saved appearance settings.", error)
            })
    }, [])

    const handleThemeChange = (nextTheme: AppTheme) => {
        setTheme(nextTheme)
        void saveAppTheme(nextTheme).catch((error) => {
            console.warn("[Readify] Could not save the theme.", error)
        })
    }

    const handleHidePopupHeaderChange = (hide: boolean) => {
        setHidePopupHeader(hide)
        void saveHidePopupHeader(hide).catch((error) => {
            console.warn("[Readify] Could not save the popup header setting.", error)
        })
    }

    return (
        <div
            className={`${theme === "dark" ? "dark " : ""}flex min-h-screen flex-col bg-background text-foreground`}
            style={{colorScheme: theme}}
        >
            {!hidePopupHeader && <PopupHeader/>}

            <main className="flex flex-1 flex-col space-y-4 px-4 pt-4">
                <SiteStatusCard
                    hostname={state.hostname}
                    faviconUrl={state.faviconUrl}
                    isSupported={state.isSupported}
                />

                <form
                    className="flex flex-1 flex-col space-y-3"
                    onSubmit={(event) => {
                        event.preventDefault()
                        void actions.applySettings()
                    }}
                >
                    <Tabs defaultValue="text-size">
                        <TabsList
                            aria-label="Reading and preset settings"
                            className="mb-2 w-full"
                        >
                            <TabsTrigger value="text-size">Reading</TabsTrigger>
                            <TabsTrigger value="typography">Typography</TabsTrigger>
                            <TabsTrigger value="presets">Presets</TabsTrigger>
                        </TabsList>

                        <TextSizeSettings
                            textSize={state.settings.textSize}
                            disabled={controlsDisabled}
                            getPageText={actions.getPageText}
                            onScaleChange={actions.textSize.updateTextScale}
                            onOverrideToggle={actions.textSize.toggleExactOverride}
                            onExactSizeChange={actions.textSize.updateExactSize}
                        />
                        <TypographySettings
                            typography={state.settings.typography}
                            disabled={controlsDisabled}
                            onFontFamilyChange={actions.typography.updateFontFamily}
                            onLetterSpacingToggle={actions.typography.toggleLetterSpacing}
                            onLetterSpacingChange={actions.typography.updateLetterSpacing}
                            onLineHeightToggle={actions.typography.toggleLineHeight}
                            onLineHeightChange={actions.typography.updateLineHeight}
                        />
                        <PresetsSettings
                            theme={theme}
                            onThemeChange={handleThemeChange}
                            hidePopupHeader={hidePopupHeader}
                            onHidePopupHeaderChange={handleHidePopupHeaderChange}
                        />
                    </Tabs>

                    <PopupFooter
                        status={state.status}
                        isApplying={state.isApplying}
                        controlsDisabled={controlsDisabled}
                        isSupported={state.isSupported}
                        onReset={actions.resetSettings}
                    />
                </form>
            </main>
        </div>
    )
}

export default App
