"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Calendar, X } from "lucide-react"
import { format, parse } from "date-fns"

interface MonthFilterProps {
  availableMonths: string[] // Format: "YYYY-MM"
}

export function MonthFilter({ availableMonths }: MonthFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedMonth = searchParams.get("month")

  const handleSelectMonth = (month: string | null) => {
    const params = new URLSearchParams(searchParams.toString())
    if (month) {
      params.set("month", month)
    } else {
      params.delete("month")
    }
    router.push(`?${params.toString()}`)
  }

  const formatMonthLabel = (monthStr: string) => {
    const date = parse(monthStr, "yyyy-MM", new Date())
    return format(date, "MMMM yyyy")
  }

  const selectedLabel = selectedMonth
    ? formatMonthLabel(selectedMonth)
    : "All months"

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Calendar className="h-4 w-4" />
            <span className="hidden sm:inline">{selectedLabel}</span>
            <span className="sm:hidden">
              {selectedMonth ? format(parse(selectedMonth, "yyyy-MM", new Date()), "MMM yy") : "All"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-64 overflow-y-auto">
          <DropdownMenuItem
            onClick={() => handleSelectMonth(null)}
            className={!selectedMonth ? "bg-muted" : ""}
          >
            All months
          </DropdownMenuItem>
          {availableMonths.map((month) => (
            <DropdownMenuItem
              key={month}
              onClick={() => handleSelectMonth(month)}
              className={selectedMonth === month ? "bg-muted" : ""}
            >
              {formatMonthLabel(month)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {selectedMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleSelectMonth(null)}
          className="h-8 w-8 p-0"
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
