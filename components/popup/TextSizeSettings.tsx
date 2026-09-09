"use client"

import {
    MAX_TEXT_SCALE,
    MIN_TEXT_SCALE,
    TEXT_SCALE_STEP,
    type FontSizeCategory,
    type SiteSettings,
} from "@/lib/font-size"
import {Card, CardContent} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {TabsContent} from "@/components/ui/tabs"
import {DeferredNumberInput} from "@/components/popup/DeferredNumberInput"
import {ExactOverridesSettings} from "@/components/popup/ExactOverridesSettings"

type TextSizeSettingsProps = {
    textSize: SiteSettings["textSize"]
    disabled: boolean
    onScaleChange: (value: number) => void
    onOverrideToggle: (key: FontSizeCategory, enabled: boolean) => void
    onExactSizeChange: (key: FontSizeCategory, value: number) => void
}

export function TextSizeSettings(
    {
        textSize,
        disabled,
        onScaleChange,
        onOverrideToggle,
        onExactSizeChange,
    }: TextSizeSettingsProps) {
    return (
        <TabsContent value="text-size" className="space-y-4">
            <Card>
                <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <Label htmlFor="global-text-scale" className="text-xs">
                                Global text scale
                            </Label>
                            <p className="text-muted-foreground text-[11px] leading-relaxed">
                                Preserves the relative sizes.
                            </p>
                        </div>
                        <div className="relative w-[4.75rem] shrink-0">
                            <DeferredNumberInput
                                id="global-text-scale"
                                value={textSize.scale}
                                minimum={MIN_TEXT_SCALE}
                                maximum={MAX_TEXT_SCALE}
                                step={TEXT_SCALE_STEP}
                                aria-describedby="global-text-scale-description"
                                disabled={disabled}
                                onCommit={onScaleChange}
                                className="h-9 px-2 pr-6 text-right tabular-nums [&::-webkit-inner-spin-button]:appearance-none"
                            />
                            <span
                                className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px]">
                                %
                            </span>
                        </div>
                    </div>
                    <div className="text-muted-foreground bg-muted rounded-md px-3 py-2">
                        <span style={{fontSize: `${16 * (textSize.scale / 100)}px`}}>
                            Reading comfortably starts here.
                        </span>
                    </div>
                </CardContent>
            </Card>

            <ExactOverridesSettings
                textSize={textSize}
                disabled={disabled}
                onOverrideToggle={onOverrideToggle}
                onExactSizeChange={onExactSizeChange}
            />
        </TabsContent>
    )
}
