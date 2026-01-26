"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar, ChevronUp, ChevronDown } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

const MONTHS_ES = [
  "Ene", "Feb", "Mar", "Abr",
  "May", "Jun", "Jul", "Ago",
  "Sep", "Oct", "Nov", "Dic"
]

interface MonthFilterProps {
  availableMonths: string[] // Format: "YYYY-MM"
}

export function MonthFilter({ availableMonths }: MonthFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get("month")
  const [open, setOpen] = useState(false)

  // Calculate year range
  const years = availableMonths.map(m => parseInt(m.split("-")[0]))
  const currentYear = new Date().getFullYear()
  const minYear = years.length > 0 ? Math.min(...years, currentYear - 1) : currentYear - 1
  const maxYear = years.length > 0 ? Math.max(...years, currentYear) : currentYear

  const [viewYear, setViewYear] = useState(() => {
    if (selectedMonth) {
      return parseInt(selectedMonth.split("-")[0])
    }
    return currentYear
  })

  // Auto-default to current month on mount if no month is selected
  useEffect(() => {
    if (!selectedMonth) {
      const currentMonth = format(new Date(), "yyyy-MM")
      const params = new URLSearchParams(searchParams.toString())
      params.set("month", currentMonth)
      router.replace(`?${params.toString()}`)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update viewYear when selected month changes
  useEffect(() => {
    if (selectedMonth) {
      setViewYear(parseInt(selectedMonth.split("-")[0]))
    }
  }, [selectedMonth])

  const handleSelectMonth = (year: number, monthIndex: number) => {
    const month = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
    const params = new URLSearchParams(searchParams.toString())
    params.set("month", month)
    router.push(`?${params.toString()}`)
    setOpen(false)
  }

  const formatSelectedLabel = () => {
    if (!selectedMonth) return "Mes"
    const [year, month] = selectedMonth.split("-")
    const monthIndex = parseInt(month) - 1
    return `${MONTHS_ES[monthIndex]} ${year}`
  }

  // Check if month is selected
  const isSelected = (year: number, monthIndex: number) => {
    if (!selectedMonth) return false
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
    return selectedMonth === monthStr
  }

  // Check if a month has data
  const hasData = (year: number, monthIndex: number) => {
    const monthStr = `${year}-${String(monthIndex + 1).padStart(2, "0")}`
    return availableMonths.includes(monthStr)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          <span>{formatSelectedLabel()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="end">
        {/* Year selector */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-medium text-lg">{viewYear}</span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewYear(y => Math.min(y + 1, maxYear))}
              disabled={viewYear >= maxYear}
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewYear(y => Math.max(y - 1, minYear))}
              disabled={viewYear <= minYear}
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Month grid 4x3 */}
        <div className="p-4">
          <div className="grid grid-cols-4 gap-y-4 gap-x-2">
            {MONTHS_ES.map((month, index) => {
              const selected = isSelected(viewYear, index)
              const withData = hasData(viewYear, index)

              return (
                <button
                  key={month}
                  className={cn(
                    "flex items-center justify-center h-10 rounded-full text-sm transition-colors",
                    selected
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-muted",
                    !selected && !withData && "text-muted-foreground"
                  )}
                  onClick={() => handleSelectMonth(viewYear, index)}
                >
                  {month}
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t text-center">
          <span className="text-xs text-muted-foreground">
            {availableMonths.length > 0
              ? `${availableMonths.length} meses con gastos`
              : "Sin gastos aún"
            }
          </span>
        </div>
      </PopoverContent>
    </Popover>
  )
}
