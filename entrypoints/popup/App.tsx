import {
    Tabs,
    TabsList,
    TabsTrigger,
    TabsContent,
} from "@/components/ui/tabs"
import {PopupHeader} from "@/components/popup/PopupHeader"
import {SiteStatusCard} from "@/components/popup/SiteStatusCard"
import {SimplifySettings} from "@/components/popup/SimplifySettings"
import {TextSizeSettings} from "@/components/popup/TextSizeSettings"
import {TypographySettings} from "@/components/popup/TypographySettings"
import {PopupFooter} from "@/components/popup/PopupFooter"
import {useSiteSettings} from "@/hooks/useSiteSettings"

function App() {
    const {state, actions} = useSiteSettings()
    const controlsDisabled = state.isLoading || state.isApplying

    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <PopupHeader/>

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
                        <TabsContent value="presets" />
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
