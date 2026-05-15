"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SearchInputProps {
  placeholder?: string
  paramName?: string
  debounceMs?: number
  className?: string
}

export function SearchInput({
  placeholder = "Buscar...",
  paramName = "search",
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialValue = searchParams.get(paramName) || ""
  const [value, setValue] = useState(initialValue)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Sync with URL when it changes externally (e.g., browser back/forward)
  useEffect(() => {
    const urlValue = searchParams.get(paramName) || ""
    if (urlValue !== value) {
      setValue(urlValue)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, paramName])

  function updateURL(newValue: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (newValue.trim()) {
      params.set(paramName, newValue.trim())
    } else {
      params.delete(paramName)
    }
    router.push(`?${params.toString()}`, { scroll: false })
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value
    setValue(newValue)

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the URL update
    timeoutRef.current = setTimeout(() => {
      updateURL(newValue)
    }, debounceMs)
  }

  function handleClear() {
    setValue("")
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    updateURL("")
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      handleClear()
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={cn(
          "w-full h-10 pl-9 pr-9 rounded-xl",
          "bg-white/60 backdrop-blur-sm",
          "border border-white/80",
          "text-sm text-foreground placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30",
          "transition-all"
        )}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 size-6 flex items-center justify-center rounded-full hover:bg-muted/50 active:scale-95 transition-all"
        >
          <X className="size-3.5 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
