import * as React from "react"
import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

const Switch = React.forwardRef<HTMLElement, SwitchPrimitive.Root.Props>(
  ({ className, ...props }, ref) => (
    <SwitchPrimitive.Root
      ref={ref}
      data-slot="switch"
      className={cn(
        "bg-input data-checked:bg-primary focus-visible:ring-ring/30 inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border border-transparent p-0.5 outline-none transition-colors focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="bg-background pointer-events-none block size-4 rounded-full shadow-sm transition-transform data-checked:translate-x-4" />
    </SwitchPrimitive.Root>
  ),
)
Switch.displayName = "Switch"

export { Switch }
