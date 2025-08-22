import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"
import { cn } from "@/lib/utils"

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitive.Root
    className={cn(
      "peer inline-flex h-7 w-13 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 hover:shadow-md",
      "data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-500 data-[state=checked]:to-blue-500 data-[state=checked]:shadow-lg",
      "data-[state=unchecked]:bg-gradient-to-r data-[state=unchecked]:from-gray-200 data-[state=unchecked]:to-gray-300 dark:data-[state=unchecked]:from-gray-600 dark:data-[state=unchecked]:to-gray-700",
      "active:scale-95",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitive.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-xl ring-0 transition-all duration-300 ease-in-out",
        "data-[state=checked]:translate-x-6 data-[state=unchecked]:translate-x-0",
        "data-[state=checked]:shadow-purple-200 dark:data-[state=checked]:shadow-purple-800",
        "data-[state=checked]:ring-2 data-[state=checked]:ring-white/20"
      )}
    />
  </SwitchPrimitive.Root>
))
Switch.displayName = SwitchPrimitive.Root.displayName

export { Switch }
