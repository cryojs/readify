import {
    FONT_FAMILY_OPTIONS,
    LETTER_SPACING_STEP,
    LINE_HEIGHT_STEP,
    MAX_LETTER_SPACING,
    MAX_LINE_HEIGHT,
    MIN_LETTER_SPACING,
    MIN_LINE_HEIGHT,
    getFontFamilyCss,
    type FontFamilyKey,
    type SiteSettings,
} from "@/lib/font-size"
import {Card, CardContent} from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {Label} from "@/components/ui/label"
import {TabsContent} from "@/components/ui/tabs"
import {SpacingSetting} from "@/components/popup/SpacingSetting"

type TypographySettingsProps = {
    typography: SiteSettings["typography"]
    disabled: boolean
    onFontFamilyChange: (fontFamily: FontFamilyKey) => void
    onLetterSpacingToggle: (enabled: boolean) => void
    onLetterSpacingChange: (value: number) => void
    onLineHeightToggle: (enabled: boolean) => void
    onLineHeightChange: (value: number) => void
}

export function TypographySettings(
    {
        typography,
        disabled,
        onFontFamilyChange,
        onLetterSpacingToggle,
        onLetterSpacingChange,
        onLineHeightToggle,
        onLineHeightChange,
    }: TypographySettingsProps) {
    return (
        <TabsContent value="typography" className="space-y-4">
            <Card>
                <CardContent className="space-y-4 px-4 py-4">
                    <div>
                        <Label htmlFor="font-family" className="text-xs">
                            Font family
                        </Label>
                        <p className="text-muted-foreground mt-1 text-[11px] leading-relaxed">
                            Choose a reliable font available on most devices.
                        </p>
                        <Select
                            value={typography.fontFamily}
                            onValueChange={(value) =>
                                onFontFamilyChange(value as FontFamilyKey)
                            }
                        >
                            <SelectTrigger id="font-family" className="mt-2">
                                <SelectValue placeholder="Choose a font"/>
                            </SelectTrigger>
                            <SelectContent>
                                {FONT_FAMILY_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div
                        className="bg-muted/40 rounded-md px-3 py-3 text-center text-lg"
                        style={{
                            fontFamily:
                                getFontFamilyCss(typography.fontFamily) ?? undefined,
                        }}
                    >
                        Read comfortably, everywhere.
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="divide-border divide-y p-0">
                    <SpacingSetting
                        id="letter-spacing"
                        label="Character spacing"
                        description="Add or reduce space between letters."
                        value={typography.letterSpacing}
                        defaultValue={0}
                        minimum={MIN_LETTER_SPACING}
                        maximum={MAX_LETTER_SPACING}
                        step={LETTER_SPACING_STEP}
                        unit="px"
                        disabled={disabled}
                        onToggle={onLetterSpacingToggle}
                        onChange={onLetterSpacingChange}
                    />
                    <SpacingSetting
                        id="line-height"
                        label="Line spacing"
                        description="Give each line more room to breathe."
                        value={typography.lineHeight}
                        defaultValue={1.5}
                        minimum={MIN_LINE_HEIGHT}
                        maximum={MAX_LINE_HEIGHT}
                        step={LINE_HEIGHT_STEP}
                        unit="×"
                        disabled={disabled}
                        onToggle={onLineHeightToggle}
                        onChange={onLineHeightChange}
                    />
                </CardContent>
            </Card>
        </TabsContent>
    )
}
