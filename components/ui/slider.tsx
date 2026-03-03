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
        "relative flex w-full touch-none select-none items-center py-2",
        className
      )}
      onValueChange={handleValueChange}
      onPointerDown={handlePointerDown}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-1 w-full grow rounded-full bg-ios-gray-3">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-7 w-7 rounded-full border-0 bg-white shadow-[0_3px_8px_rgba(0,0,0,0.15),0_1px_1px_rgba(0,0,0,0.06)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
