"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChecklistData {
  hasBills: boolean
  hasExtraMember: boolean
  hasCreditCard: boolean
  hasImportedBill: boolean
}

const STORAGE_KEY = "tortuguita_checklist_dismissed"

interface StepProps {
  done: boolean
  label: string
  description?: string
  href?: string
  onClick?: () => void
  optional?: boolean
}

function Step({ done, label, description, href, onClick, optional }: StepProps) {
  const router = useRouter()
  const handleClick = () => {
    if (done) return
    if (href) router.push(href)
    if (onClick) onClick()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={done}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left transition-colors",
        !done && "active:bg-muted/40",
        done && "cursor-default"
      )}
    >
      <div className={cn(
        "size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all",
        done ? "bg-emerald-500 border-emerald-500" : "border-muted-foreground/30"
      )}>
        {done && <Check className="size-3 text-white stroke-[3]" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium leading-snug",
          done ? "text-muted-foreground line-through" : "text-foreground"
        )}>
          {label}
        </p>
        {description && !done && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      {!done && (href || onClick) && (
        <ChevronRight className="size-4 text-muted-foreground flex-shrink-0 mt-0.5" />
      )}
    </button>
  )
}

export function OnboardingChecklist({ data }: { data: ChecklistData }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    return localStorage.getItem(STORAGE_KEY) === "1"
  })

  if (dismissed) return null

  const { hasBills, hasExtraMember, hasCreditCard, hasImportedBill } = data

  const coreTotal = 2 // account + first bill
  const coreDone = 1 + (hasBills ? 1 : 0)
  const allOptionalDone = hasExtraMember && hasCreditCard && hasImportedBill
  const allDone = coreDone === coreTotal && allOptionalDone

  const handleDismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1")
    setDismissed(true)
  }

  return (
    <div className="glass rounded-3xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h2 className="text-sm font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
            Primeros pasos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {allDone ? "¡Todo listo! 🎉" : `${coreDone} de ${coreTotal} pasos principales`}
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="size-7 flex items-center justify-center rounded-full hover:bg-muted/50 text-muted-foreground transition-colors active:scale-90"
          aria-label="Cerrar"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-1 h-1 bg-muted/40 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${(coreDone / coreTotal) * 100}%` }}
        />
      </div>

      {/* Core steps */}
      <div className="divide-y divide-border/40 mt-1">
        <Step
          done
          label="Creaste tu cuenta"
        />
        <Step
          done={hasBills}
          label="Registrá tu primer gasto"
          description="Cargá un gasto manualmente para empezar."
          href="/bills/new"
        />
      </div>

      {/* Optional section */}
      <div className="mt-2 border-t border-border/40">
        <p className="px-4 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          También podés
        </p>
        <div className="divide-y divide-border/40">
          <Step
            done={hasExtraMember}
            label="Sumá a alguien a tu espacio"
            description="Compartí los gastos del hogar con tu pareja o familia."
            href="/settings"
            optional
          />
          <Step
            done={hasCreditCard}
            label="Configurá una tarjeta de crédito"
            description="Opcional. Si la tenés, acordate de cargar las fechas de cierre y vencimiento."
            href="/cards"
            optional
          />
          <Step
            done={hasImportedBill}
            label="Importá un resumen o CSV"
            description="Con una tarjeta configurada podés traer todos los movimientos de una."
            href="/resumen"
            optional
          />
        </div>
      </div>

      {allDone && (
        <div className="px-4 py-3 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            Ya conocés todo lo que ofrece tortuguita.{" "}
            <button onClick={handleDismiss} className="text-primary font-medium underline">
              Cerrar
            </button>
          </p>
        </div>
      )}
    </div>
  )
}
