import * as React from "react"
import { cn } from "@/lib/utils"

interface SliderProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value?: number[]
  onValueChange?: (value: number[]) => void
  min?: number
  max?: number
  step?: number
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, value = [0], onValueChange, min = 0, max = 100, step = 1, ...props }, ref) => {
    return (
      <input
        type="range"
        className={cn(
          "w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer",
          "slider:bg-slate-500 slider:rounded-lg",
          "focus:outline-none focus:ring-2 focus:ring-slate-400",
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
