"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import { haptic } from "@/lib/haptics"

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, onValueChange, onPointerDown, ...props }, ref) => {
  const lastValue = React.useRef<number[]>([])

  const handleValueChange = (value: number[]) => {
    // Trigger haptic when value changes by whole numbers
    if (lastValue.current.length > 0) {
      const changed = value.some((v, i) => Math.floor(v) !== Math.floor(lastValue.current[i] ?? 0))
      if (changed) {
        haptic("selection")
      }
    }
    lastValue.current = value
    onValueChange?.(value)
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLSpanElement>) => {
    haptic("light")
    onPointerDown?.(e as React.PointerEvent<HTMLDivElement>)
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      onValueChange={handleValueChange}
      onPointerDown={handlePointerDown}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background shadow-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
