"use client"

import * as React from "react"
import {ChevronsUpDown} from "lucide-react"

import {
    FONT_SIZE_FIELDS,
    FONT_SIZE_STEP,
    MAX_FONT_SIZE,
    MIN_FONT_SIZE,
    type FontSizeCategory,
    type SiteSettings,
} from "@/lib/font-size"
import {Button} from "@/components/ui/button"
import {Card, CardContent} from "@/components/ui/card"
import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from "@/components/ui/collapsible"
import {DeferredNumberInput} from "@/components/popup/DeferredNumberInput"

type ExactOverridesSettingsProps = {
    textSize: SiteSettings["textSize"]
    disabled: boolean
    onOverrideToggle: (key: FontSizeCategory, enabled: boolean) => void
    onExactSizeChange: (key: FontSizeCategory, value: number) => void
}

function hasExactOverride(
    textSize: SiteSettings["textSize"],
    key: FontSizeCategory,
): boolean {
    return Object.prototype.hasOwnProperty.call(textSize.overrides, key)
}

export function ExactOverridesSettings(
    {
        textSize,
        disabled,
        onOverrideToggle,
        onExactSizeChange,
    }: ExactOverridesSettingsProps) {
    const [isOverridesOpen, setIsOverridesOpen] = React.useState(false)

    return (
        <Collapsible
            open={isOverridesOpen}
            onOpenChange={setIsOverridesOpen}
            className="flex flex-col gap-2"
        >
            <div className="flex items-center justify-between gap-4 px-1">
                <div>
                    <h2 className="text-sm font-semibold">Exact overrides</h2>
                    <p className="text-muted-foreground text-[11px]">
                        Optionally, replace the sizes for individual text groups.
                    </p>
                </div>
                <CollapsibleTrigger
                    render={
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                        >
                            <ChevronsUpDown/>
                            <span className="sr-only">Toggle exact overrides</span>
                        </Button>
                    }
                />
            </div>

            <CollapsibleContent>
                <Card className="overflow-hidden mt-2 p-0">
                    <CardContent className="divide-border divide-y p-0">
                        {FONT_SIZE_FIELDS.map((field) => {
                            const enabled = hasExactOverride(textSize, field.key)
                            const inputId = `exact-size-${field.key}`
                            const switchId = `${inputId}-switch`
                            const exactValue =
                                textSize.overrides[field.key] ?? field.defaultValue
                            const scaledValue = Math.round(
                                field.defaultValue * (textSize.scale / 100),
                            )

                            return (
                                <div key={field.key} className="p-3">
                                    <div className="flex items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <Label htmlFor={switchId} className="text-xs">
                                                {field.label}
                                            </Label>
                                            <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                                                {field.description}
                                            </p>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            {enabled ? (
                                                <div className="relative w-17">
                                                    <DeferredNumberInput
                                                        id={inputId}
                                                        value={exactValue}
                                                        minimum={MIN_FONT_SIZE}
                                                        maximum={MAX_FONT_SIZE}
                                                        step={FONT_SIZE_STEP}
                                                        aria-label={`${field.label} exact size in pixels`}
                                                        disabled={disabled}
                                                        onCommit={(committedValue) =>
                                                            onExactSizeChange(field.key, committedValue)
                                                        }
                                                        className="h-8 px-2 pr-6 text-right tabular-nums [appearance:textfield]"
                                                    />
                                                    <span
                                                        className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px]">
                                                        px
                                                    </span>
                                                </div>
                                            ) : (
                                                <span
                                                    className="text-muted-foreground w-17 text-right text-[11px] tabular-nums">
                                                    {scaledValue}px
                                                </span>
                                            )}
                                            <Switch
                                                id={switchId}
                                                checked={enabled}
                                                disabled={disabled}
                                                aria-label={`Enable exact ${field.label} size`}
                                                onCheckedChange={(checked) =>
                                                    onOverrideToggle(field.key, checked)
                                                }
                                            />
                                        </div>
                                    </div>
                                    {enabled && (
                                        <div
                                            className="bg-muted text-muted-foreground mt-3 overflow-hidden rounded-md px-2 py-1">
                                            <span
                                                className="block truncate"
                                                style={{fontSize: `${exactValue}px`}}
                                            >
                                                {field.preview}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </CardContent>
                </Card>
            </CollapsibleContent>
        </Collapsible>
    )
}
