"use client"

import { useState, useCallback, useMemo } from "react"
import { HexColorPicker, HexColorInput } from "react-colorful"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import Image from "next/image"
import { Check } from "lucide-react"

// Calculate contrasting text color (black or white) based on background
function getContrastColor(hexColor: string): string {
  const hex = hexColor.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

interface ColorInputWithPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

export function ColorInputWithPicker({
  value,
  onChange,
  disabled = false,
}: ColorInputWithPickerProps) {
  const [open, setOpen] = useState(false)
  const currentColor = value || '#3b82f6'

  const contrastColor = useMemo(() => getContrastColor(currentColor), [currentColor])

  const handleSave = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <div className="flex h-11 w-full rounded-[10px] border border-border/50 overflow-hidden">
      {/* Color preview with hex code */}
      <div
        className="flex-1 flex items-center justify-center font-mono text-sm font-medium uppercase"
        style={{ backgroundColor: currentColor, color: contrastColor }}
      >
        {currentColor}
      </div>

      {/* Color picker button */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="w-12 flex items-center justify-center bg-ios-gray-1 border-l border-border/50 transition-colors hover:bg-ios-gray-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Image
              src="/icons/color-wheel.png"
              alt="Color picker"
              width={24}
              height={24}
              className="object-contain"
            />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[280px] p-4 space-y-3"
          align="end"
          sideOffset={8}
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="font-semibold text-base">Custom Color</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-full bg-amber-400" />
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="w-3 h-3 rounded-full bg-blue-500" />
            </div>
          </div>

          {/* Color Picker */}
          <div className="color-picker-compact">
            <HexColorPicker
              color={currentColor}
              onChange={onChange}
              style={{ width: "100%", height: "140px" }}
            />
          </div>

          {/* Bottom row: Hex input + save button */}
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">#</span>
              <HexColorInput
                color={currentColor}
                onChange={onChange}
                prefixed={false}
                className="flex h-9 w-full rounded-lg border border-border/50 bg-ios-gray-1 pl-7 pr-3 py-2 text-sm uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              style={{ backgroundColor: currentColor }}
            >
              <Check className="h-4 w-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
            </button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Custom styles for react-colorful */}
      <style jsx global>{`
        .color-picker-compact .react-colorful {
          border-radius: 10px;
          overflow: hidden;
        }
        .color-picker-compact .react-colorful__saturation {
          border-radius: 10px;
        }
        .color-picker-compact .react-colorful__hue {
          height: 12px;
          border-radius: 6px;
          margin-top: 10px;
        }
        .color-picker-compact .react-colorful__saturation-pointer {
          width: 20px;
          height: 20px;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        .color-picker-compact .react-colorful__hue-pointer {
          width: 16px;
          height: 16px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
