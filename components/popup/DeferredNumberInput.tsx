import * as React from "react"

import {clampNumber} from "@/lib/font-size"
import {Input} from "@/components/ui/input"

type DeferredNumberInputProps = {
    id: string
    value: number
    minimum: number
    maximum: number
    step: number
    disabled: boolean
    "aria-label"?: string
    "aria-describedby"?: string
    className?: string
    onCommit: (value: number) => void
}

export function DeferredNumberInput(
    {
        id,
        value,
        minimum,
        maximum,
        step,
        disabled,
        "aria-label": ariaLabel,
        "aria-describedby": ariaDescribedBy,
        className,
        onCommit,
    }: DeferredNumberInputProps) {
    const [draftValue, setDraftValue] = React.useState(String(value))

    React.useEffect(() => {
        setDraftValue(String(value))
    }, [value])

    const commitValue = () => {
        const committedValue = clampNumber(
            draftValue,
            minimum,
            maximum,
            step,
            value,
        )

        setDraftValue(String(committedValue))

        if (committedValue !== value) {
            onCommit(committedValue)
        }
    }

    return (
        <Input
            id={id}
            type="number"
            min={minimum}
            max={maximum}
            step={step}
            value={draftValue}
            aria-label={ariaLabel}
            aria-describedby={ariaDescribedBy}
            disabled={disabled}
            onChange={(event) => setDraftValue(event.target.value)}
            onBlur={commitValue}
            className={className}
        />
    )
}
