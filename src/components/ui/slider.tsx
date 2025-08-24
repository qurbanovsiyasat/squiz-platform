import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

// Styled, centered range slider for consistent look across browsers
const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    return (
      <input
        type="range"
        className={cn(
          // Base width and our custom skin class
          "w-full ui-slider",
          className
        )}
        ref={ref}
        min={min}
        max={max}
        step={step}
        value={value[0]}
        onChange={(e) => onValueChange?.([parseFloat(e.target.value)])}
        {...props}
      />
    )
  }
)
Slider.displayName = "Slider"

export { Slider }