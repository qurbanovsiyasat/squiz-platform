import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

/*
 Global Switch redesign to match the provided reference:
 - Compact pill track
 - Off: neutral grey track, thumb with inner ring ("o")
 - On: purple track, thumb shows a check icon
 - Icon-only, super-minimal, smooth transitions
*/

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    ref={ref}
    className={cn(
      "group relative inline-flex select-none items-center cursor-pointer",
      // Track size (compact like reference)
      "w-[42px] h-[24px] rounded-full",
      // Base (light) + dark
      "bg-[#E6E2EA] ring-1 ring-[#A9A6AD]",
      "dark:bg-[#2A2A2E] dark:ring-[#4A4A50]",
      // Checked state track
      "data-[state=checked]:bg-[#6E56CF] data-[state=checked]:ring-[#6E56CF]",
      // Motion
      "transition-colors duration-300",
      // Focus
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-60",
      className
    )}
    {...props}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        // Thumb size and positioning
        "absolute left-[2px] top-1/2 -translate-y-1/2 h-[20px] w-[20px] rounded-full",
        // Base thumb colors
        "bg-[#BFBAC6] ring-1 ring-[#8C8891] dark:bg-[#8D8A92] dark:ring-[#6C6A72]",
        // Move right on checked (42 - 24 = 18px)
        "data-[state=checked]:translate-x-[18px]",
        // Subtle elevate on checked
        "data-[state=checked]:bg-white data-[state=checked]:ring-white/60",
        // Motion
        "transition-all duration-300 will-change-transform",
        // Layout for inner indicators
        "flex items-center justify-center"
      )}
    >
      {/* OFF inner ring (small hollow dot) */}
      <span
        className={cn(
          "block h-[10px] w-[10px] rounded-full ring-2 ring-[#6C6A72] bg-transparent",
          "opacity-100 group-data-[state=checked]:opacity-0 transition-opacity duration-200"
        )}
      />
      {/* ON check icon */}
      <svg
        className={cn(
          "absolute h-[12px] w-[12px] text-[#6E56CF]",
          "opacity-0 group-data-[state=checked]:opacity-100 transition-opacity duration-200"
        )}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M20 6L9 17l-5-5" />
      </svg>
    </SwitchPrimitive.Thumb>
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }