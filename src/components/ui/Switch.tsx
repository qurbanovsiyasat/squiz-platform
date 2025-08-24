import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

/*
  Custom Switch styled per Uiverse.io (TimTrayler) design provided by user
  Colors:
    --secondary-container: #3a4b39 (track when checked)
    --primary: #84da89 (thumb when checked)
    base track: #313033
    base thumb: #aeaaae
*/

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      // container (track)
      "relative inline-flex cursor-pointer items-center select-none",
      // exact sizes from provided CSS (em-based via Tailwind arbitrary values)
      "w-[3.7em] h-[1.8em] rounded-[30px]",
      // base background and transition
      "bg-[#313033] transition-colors duration-200",
      // focus ring
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
      // disabled state
      "disabled:cursor-not-allowed disabled:opacity-50",
      // checked background color
      "data-[state=checked]:bg-[#3a4b39]",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        // exact sizes and position from CSS
        "pointer-events-none absolute left-[0.2em] bottom-[0.2em] h-[1.4em] w-[1.4em] rounded-[20px]",
        // base color
        "bg-[#aeaaae]",
        // smooth movement
        "transition-transform duration-400 will-change-transform",
        // when checked, apply translate and color
        "data-[state=checked]:translate-x-[1.9em] data-[state=checked]:bg-[#84da89]"
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }