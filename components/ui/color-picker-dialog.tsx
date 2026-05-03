"use client"

import { useState } from "react"
import { HexColorPicker, HexColorInput } from "react-colorful"

interface ColorInputWithPickerProps {
  value: string
  onChange: (color: string) => void
  disabled?: boolean
}

export function ColorInputWithPicker({ value, onChange, disabled = false }: ColorInputWithPickerProps) {
  const [open, setOpen] = useState(false)
  const color = value || "#9D8189"

  return (
    <div className="space-y-2">
      {/* Trigger row */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 rounded-2xl border bg-background px-4 py-3 transition-colors hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {/* Swatch */}
        <span
          className="w-8 h-8 rounded-xl flex-shrink-0 shadow-sm"
          style={{ backgroundColor: color }}
        />
        {/* Hex value */}
        <span className="text-sm font-mono uppercase text-foreground flex-1 text-left tracking-wide">
          {color}
        </span>
        {/* Color wheel icon */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/color-wheel.png" alt="" className="w-6 h-6 opacity-70" />
      </button>

      {/* Inline expanded picker */}
      {open && (
        <div className="rounded-2xl border bg-background/95 backdrop-blur-sm p-4 space-y-3 shadow-sm">
          {/* react-colorful picker */}
          <div className="color-picker-app">
            <HexColorPicker
              color={color}
              onChange={onChange}
              style={{ width: "100%", height: "160px" }}
            />
          </div>

          {/* Hex input + Listo */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1.5 rounded-xl border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
              <span className="text-muted-foreground text-sm">#</span>
              <HexColorInput
                color={color}
                onChange={onChange}
                prefixed={false}
                className="flex-1 bg-transparent text-sm uppercase font-mono focus:outline-none text-foreground"
              />
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold active:scale-95 transition-all"
            >
              Listo
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .color-picker-app .react-colorful {
          border-radius: 16px;
          overflow: hidden;
          gap: 10px;
        }
        .color-picker-app .react-colorful__saturation {
          border-radius: 12px;
          flex: 1;
        }
        .color-picker-app .react-colorful__hue {
          height: 14px;
          border-radius: 7px;
        }
        .color-picker-app .react-colorful__saturation-pointer {
          width: 22px;
          height: 22px;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        }
        .color-picker-app .react-colorful__hue-pointer {
          width: 18px;
          height: 18px;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
      `}</style>
    </div>
  )
}
