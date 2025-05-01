import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-[1px] w-full grow overflow-hidden rounded-none bg-white/20">
      <SliderPrimitive.Range className="absolute h-full bg-indigo-500" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="relative flex items-center justify-center">
      <span className="absolute block h-4 w-[2px] rounded-full bg-indigo-500" />
      <span className="block h-3 w-3 rounded-full border border-white/10 bg-indigo-500/30 shadow-sm" />
    </SliderPrimitive.Thumb>
  </SliderPrimitive.Root>
))
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
