import {Label} from "@/components/ui/label"
import {Switch} from "@/components/ui/switch"
import {DeferredNumberInput} from "@/components/popup/DeferredNumberInput"

export type SpacingSettingProps = {
    id: string
    label: string
    description: string
    value: number | null
    defaultValue: number
    minimum: number
    maximum: number
    step: number
    unit: string
    disabled: boolean
    onToggle: (enabled: boolean) => void
    onChange: (value: number) => void
}

export function SpacingSetting(
    {
        id,
        label,
        description,
        value,
        defaultValue,
        minimum,
        maximum,
        step,
        unit,
        disabled,
        onToggle,
        onChange,
    }: SpacingSettingProps) {
    const enabled = value !== null
    const switchId = `${id}-switch`

    return (
        <div className="p-3.5">
            <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1">
                    <Label htmlFor={switchId} className="text-xs">
                        {label}
                    </Label>
                    <p className="text-muted-foreground mt-1 text-[11px] leading-tight">
                        {description}
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    {enabled ? (
                        <div className="relative w-[4.75rem]">
                            <DeferredNumberInput
                                id={id}
                                value={value}
                                minimum={minimum}
                                maximum={maximum}
                                step={step}
                                aria-label={`${label} value`}
                                disabled={disabled}
                                onCommit={onChange}
                                className="h-8 px-2 pr-7 text-right tabular-nums [appearance:textfield]"
                            />
                            <span
                                className="text-muted-foreground pointer-events-none absolute inset-y-0 right-2 flex items-center text-[10px]">
                                {unit}
                            </span>
                        </div>
                    ) : (
                        <span className="text-muted-foreground w-19 text-right text-[11px]">
                            Site default
                        </span>
                    )}
                    <Switch
                        id={switchId}
                        checked={enabled}
                        disabled={disabled}
                        aria-label={`Enable ${label}`}
                        onCheckedChange={onToggle}
                    />
                </div>
            </div>
        </div>
    )
}
