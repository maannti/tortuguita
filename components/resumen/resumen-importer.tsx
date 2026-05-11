"use client"
import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronLeft, Upload, FileText, Check, X, AlertTriangle, ChevronDown, User, Home, Loader2, Plus } from "lucide-react"
import type { ResumenParseResult, ParsedTransaction } from "@/app/api/resumen/parse/route"
import { CardIcon, isNetworkId, BANKS, NetworkId } from "@/components/ui/card-network"

interface CCCard { id: string; name: string; color: string | null; icon: string | null; organizationId: string }
interface Member { id: string; name: string | null; email: string | null; organizationId: string }
interface Organization { id: string; name: string; isPersonal: boolean }
interface Category { id: string; name: string; color: string | null; icon: string | null; organizationId: string }

interface Props {
  ccCards: CCCard[]
  members: Member[]
  organizations: Organization[]
  currentUserId: string
  categories: Category[]
}

const MAUVE = "#9D8189"

const arsFormatter = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 0, maximumFractionDigits: 0 })
function formatARS(n: number) { return arsFormatter.format(Math.round(n)) }

type Step = "upload" | "parsing" | "review" | "importing" | "done"

const IMPORT_CACHE_KEY = "tortuguita_import_cache"

export function ResumenImporter({ ccCards, members, organizations, currentUserId, categories }: Props) {
  const { push, back } = useRouter()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>("upload")
  const [error, setError] = useState<string | null>(null)

  // Upload step state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // Category sheet: which transaction's picker is open
  const [categorySheetFor, setCategorySheetFor] = useState<string | null>(null)

  // Review step state
  const [parsed, setParsed] = useState<ResumenParseResult | null>(null)
  // Map: titular string → member userId
  const [titularMap, setTitularMap] = useState<Record<string, string>>({})
  // Map: titular string → cardId
  const [titularCardMap, setTitularCardMap] = useState<Record<string, string>>({})
  // Per-transaction overrides
  const [txOverrides, setTxOverrides] = useState<Record<string, {
    incluir?: boolean
    descripcion?: string
    categoria?: string | null
    usarUSD?: boolean
    userId?: string
  }>>({})

  // Exchange rate
  const [usdRate, setUsdRate] = useState<number | null>(null)
  const [usdRateUpdatedAt, setUsdRateUpdatedAt] = useState<string | null>(null)
  const [usdRateError, setUsdRateError] = useState(false)

  // Done step
  const [importResult, setImportResult] = useState<{ imported: number; duplicates?: number; errors?: string[] } | null>(null)

  // Restore cached state when returning from category creation
  useEffect(() => {
    if (searchParams.get("restore") !== "1") return
    try {
      const raw = sessionStorage.getItem(IMPORT_CACHE_KEY)
      if (!raw) return
      const cache = JSON.parse(raw)
      if (cache.parsed) { setParsed(cache.parsed); setStep("review") }
      if (cache.titularMap) setTitularMap(cache.titularMap)
      if (cache.titularCardMap) setTitularCardMap(cache.titularCardMap)
      if (cache.txOverrides) setTxOverrides(cache.txOverrides)
      if (cache.usdRate) setUsdRate(cache.usdRate)
      sessionStorage.removeItem(IMPORT_CACHE_KEY)
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show ALL cards the user has access to (not filtered by space).
  const orgCcCards = ccCards
  // Deduplicate members across all spaces — a user may appear once per org they belong to.
  const orgMembers = members.filter((m, i, arr) => arr.findIndex(x => x.id === m.id) === i)

  // ── Helpers ──────────────────────────────────────────────────────────────

  function getTx(tx: ParsedTransaction) {
    const ov = txOverrides[tx.id] ?? {}
    // Default usarUSD=true when there's no ARS amount (pure USD transaction)
    const defaultUsarUSD = tx.montoARS === null && tx.montoUSD !== null
    return {
      incluir: ov.incluir ?? tx.incluir,
      descripcion: ov.descripcion ?? tx.descripcion,
      categoria: "categoria" in ov ? ov.categoria : tx.categoriaSugerida,
      usarUSD: ov.usarUSD ?? defaultUsarUSD,
    }
  }

  function setTxOv(id: string, patch: Partial<typeof txOverrides[string]>) {
    setTxOverrides(prev => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  // Save current review state to sessionStorage and navigate to category creation
  function openNewCategory(orgId?: string) {
    try {
      sessionStorage.setItem(IMPORT_CACHE_KEY, JSON.stringify({
        parsed, titularMap, titularCardMap, txOverrides, usdRate,
      }))
    } catch { /* ignore quota errors */ }
    const org = orgId ? organizations.find(o => o.id === orgId) : (organizations.find(o => o.isPersonal) ?? organizations[0])
    const params = new URLSearchParams({ returnTo: "/resumen?restore=1" })
    if (org) { params.set("spaceId", org.id); params.set("spaceName", org.name) }
    push(`/categories/new?${params.toString()}`)
  }

  const txList = parsed?.transacciones ?? []
  const selectedTxs = txList.filter(tx => getTx(tx).incluir)

  function resolvedMonto(tx: ParsedTransaction) {
    const ov = getTx(tx)
    if (ov.usarUSD && tx.montoUSD !== null && usdRate !== null) return Math.round(tx.montoUSD * usdRate)
    return ov.usarUSD ? (tx.montoUSD ?? tx.montoARS ?? 0) : (tx.montoARS ?? tx.montoUSD ?? 0)
  }

  function totalImport() {
    return selectedTxs.reduce((sum, tx) => {
      const monto = resolvedMonto(tx)
      return sum + (tx.tipo === "devolucion" ? -monto : monto)
    }, 0)
  }

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleFileSelect = (file: File) => {
    const isCsv = file.name.endsWith(".csv") || file.type === "text/csv"
    const isPdf = file.type === "application/pdf"
    if (!isPdf && !isCsv) { setError("El archivo debe ser un PDF o CSV"); return }
    setSelectedFile(file)
    setError(null)
  }

  const handleParse = async () => {
    if (!selectedFile) return
    setError(null)
    setStep("parsing")

    try {
      const formData = new FormData()
      formData.append("pdf", selectedFile)

      const res = await fetch("/api/resumen/parse", { method: "POST", body: formData })
      if (!res.ok) {
        if (res.status === 504 || res.status === 524) {
          throw new Error("El análisis tardó demasiado. Intentá de nuevo — los archivos grandes a veces necesitan más tiempo.")
        }
        try {
          const d = await res.json()
          throw new Error(d.error || "Error al procesar el resumen")
        } catch {
          throw new Error("Error al procesar el archivo. Verificá que sea un resumen o listado de movimientos de tarjeta válido.")
        }
      }
      const data: ResumenParseResult = await res.json()

      // Auto-map titulares to members
      const autoMap: Record<string, string> = {}
      data.titulares.forEach((titular, i) => {
        // First titular → current user; rest → first other member (if any)
        if (i === 0) {
          autoMap[titular] = currentUserId
        } else {
          const other = orgMembers.find(m => m.id !== currentUserId)
          autoMap[titular] = other?.id ?? currentUserId
        }
      })
      setTitularMap(autoMap)

      // Auto-map titulares to first CC card
      const autoCardMap: Record<string, string> = {}
      data.titulares.forEach(t => { autoCardMap[t] = orgCcCards[0]?.id ?? "" })
      setTitularCardMap(autoCardMap)

      setParsed(data)
      setTxOverrides({})
      setStep("review")

      // Fetch live USD→ARS official rate (non-blocking)
      fetch("/api/exchange-rate")
        .then(r => r.json())
        .then(d => {
          if (d.rate) { setUsdRate(d.rate); setUsdRateUpdatedAt(d.updatedAt ?? null) }
          else setUsdRateError(true)
        })
        .catch(() => setUsdRateError(true))
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
      }
      setStep("upload")
    }
  }

  const handleImport = async () => {
    if (!parsed || selectedTxs.length === 0) return
    setError(null)
    setStep("importing")

    const errors: string[] = []
    const transacciones = []

    for (const tx of selectedTxs) {
      const ov = getTx(tx)

      const billTypeId = titularCardMap[tx.titular]
      if (!billTypeId) {
        errors.push(`Sin tarjeta asignada para titular "${tx.titular}"`)
        continue
      }

      const userId = txOverrides[tx.id]?.userId ?? titularMap[tx.titular] ?? currentUserId

      // Resolve categoryId + org from category name → UUID
      const matchedCat = categories.find(
        c => c.name.toLowerCase() === (ov.categoria ?? "").toLowerCase()
      )
      const categoryId = matchedCat?.id ?? null
      // Org: derived from category's org; fallback to personal space
      const personalOrg = organizations.find(o => o.isPersonal) ?? organizations[0]
      const txOrgId = matchedCat?.organizationId ?? personalOrg?.id ?? ""

      // Determine final ARS amount — convert USD at official rate if user chose that path
      let finalMontoARS = tx.montoARS
      if (ov.usarUSD && tx.montoUSD !== null && usdRate !== null) {
        finalMontoARS = Math.round(tx.montoUSD * usdRate)
      }

      transacciones.push({
        fecha: tx.fecha,
        descripcion: ov.descripcion,
        montoARS: finalMontoARS,
        montoUSD: tx.montoUSD,
        tipo: tx.tipo,
        cuotaActual: tx.cuotaActual ?? null,
        cuotaTotal: tx.cuotaTotal ?? null,
        usarUSD: false,
        billTypeId,
        categoryId,
        organizationId: txOrgId,
        userId,
        comprobante: tx.comprobante ?? null,
      })
    }

    if (errors.length > 0 && transacciones.length === 0) {
      setError(errors.join("; "))
      setStep("review")
      return
    }

    try {
      const res = await fetch("/api/resumen/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transacciones }),
      })
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Error al importar") }
      const result = await res.json()
      // Merge any pre-import errors into result
      if (errors.length > 0) {
        result.errors = [...(result.errors ?? []), ...errors]
      }
      setImportResult(result)
      setStep("done")
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error inesperado. Intentá de nuevo.")
      }
      setStep("review")
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col min-h-[calc(100dvh-7rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
        <button
          type="button"
          onClick={() => step === "review" ? setStep("upload") : back()}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />
          {step === "review" ? "Volver" : "Atrás"}
        </button>
        <h1 className="text-base font-semibold">Importar movimientos</h1>
        {step === "review" ? (
          <button
            type="button"
            onClick={handleImport}
            disabled={selectedTxs.length === 0}
            className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 active:scale-95 transition-all"
          >
            Importar {selectedTxs.length}
          </button>
        ) : (
          <div className="w-20" />
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-5 pb-28 space-y-5">
          {error && (
            <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3 flex gap-2">
              <AlertTriangle className="size-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* ── STEP: UPLOAD ── */}
          {(step === "upload" || step === "parsing") && (
            <>
              {/* File upload */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Archivo</p>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
                  className={`rounded-2xl border-2 border-dashed px-6 py-10 flex flex-col items-center gap-3 cursor-pointer transition-colors ${selectedFile ? "border-primary bg-primary/5" : "border-border hover:border-foreground/30"}`}
                >
                  {selectedFile ? (
                    <>
                      <FileText className="size-8 text-primary" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{(selectedFile.size / 1024).toFixed(0)} KB · Toca para cambiar</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="size-8 text-muted-foreground" />
                      <div className="text-center">
                        <p className="text-sm font-medium">Subir resumen o movimientos</p>
                        <p className="text-xs text-muted-foreground mt-0.5">PDF o CSV · Arrastrá o tocá para elegir</p>
                      </div>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf,.csv" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
                </div>
              </div>

              {/* Privacy notice */}
              <p className="text-[11px] text-muted-foreground/70 text-center leading-relaxed px-2">
                El archivo es procesado por IA (Anthropic) y no se almacena en la app.
                Anthropic puede retenerlo hasta 30 días por razones de seguridad.{" "}
                <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener" className="underline underline-offset-2">
                  Política de privacidad
                </a>
              </p>

              {/* CTA */}
              <button
                type="button"
                onClick={handleParse}
                disabled={!selectedFile || step === "parsing"}
                className="w-full rounded-full bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
              >
                {step === "parsing" ? (
                  <><Loader2 className="size-4 animate-spin" /> Analizando con IA...</>
                ) : (
                  "Analizar movimientos"
                )}
              </button>
              {!selectedFile && step !== "parsing" && (
                <p className="text-xs text-muted-foreground text-center">
                  Subí el archivo para continuar
                </p>
              )}

              {step === "parsing" && (
                <p className="text-xs text-center text-muted-foreground animate-pulse">
                  Claude está leyendo el archivo y extrayendo las transacciones...
                </p>
              )}
            </>
          )}

          {/* ── STEP: REVIEW ── */}
          {step === "review" && parsed && (
            <>
              {/* Summary header */}
              <div className="rounded-2xl bg-muted/40 p-4 space-y-2">
                {parsed.banco && (
                  <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-foreground/8 text-muted-foreground border border-border/50">
                    {parsed.banco}
                  </span>
                )}
                <p className="text-sm font-semibold">
                  {parsed.periodoDesde && parsed.periodoHasta
                    ? `Período: ${new Date(parsed.periodoDesde + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long" })} → ${new Date(parsed.periodoHasta + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}`
                    : "Resumen procesado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {txList.length} transacciones encontradas · {selectedTxs.length} seleccionadas · {formatARS(totalImport())}
                </p>
                {/* Exchange rate chip */}
                {usdRate !== null ? (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                      <span>USD oficial</span>
                      <span className="font-semibold">{formatARS(usdRate)}</span>
                    </span>
                    {usdRateUpdatedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(usdRateUpdatedAt).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                      </span>
                    )}
                  </div>
                ) : usdRateError ? (
                  <span className="text-[11px] text-amber-700 flex items-center gap-1">
                    <AlertTriangle className="size-3" />No se pudo obtener el tipo de cambio oficial
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground animate-pulse">Obteniendo tipo de cambio...</span>
                )}
              </div>

              {/* Titular mapping */}
              {parsed.titulares.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asignar titulares</p>
                  <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
                    {parsed.titulares.map(titular => (
                      <div key={titular} className="grid grid-cols-3 items-center gap-3 px-4 py-3">
                        {/* Titular name */}
                        <div className="min-w-0">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide truncate">{titular}</p>
                        </div>
                        {/* Member select */}
                        <div className="relative">
                          <select
                            value={titularMap[titular] ?? currentUserId}
                            onChange={e => setTitularMap(prev => ({ ...prev, [titular]: e.target.value }))}
                            className="w-full appearance-none bg-muted/50 border border-border rounded-xl px-3 py-1.5 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            {orgMembers.map(m => (
                              <option key={m.id} value={m.id}>{m.name || m.email}</option>
                            ))}
                          </select>
                          <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                        {/* Card select */}
                        <div className="relative">
                          <select
                            value={titularCardMap[titular] ?? ""}
                            onChange={e => setTitularCardMap(prev => ({ ...prev, [titular]: e.target.value }))}
                            className="w-full appearance-none bg-muted/50 border border-border rounded-xl px-3 py-1.5 pr-7 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30"
                          >
                            <option value="">— tarjeta —</option>
                            {orgCcCards.map(card => (
                              <option key={card.id} value={card.id}>{card.name}</option>
                            ))}
                          </select>
                          <ChevronDown className="h-3.5 w-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Select all / deselect */}
              <div className="flex items-center justify-between px-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Transacciones</p>
                <div className="flex gap-3">
                  <button type="button" onClick={() => txList.forEach(tx => setTxOv(tx.id, { incluir: true }))}
                    className="text-xs text-primary font-medium">Seleccionar todo</button>
                  <button type="button" onClick={() => txList.forEach(tx => setTxOv(tx.id, { incluir: false }))}
                    className="text-xs text-muted-foreground">Ninguno</button>
                </div>
              </div>

              {/* Transaction list — grouped by titular */}
              <div className="space-y-2">
                {(() => {
                  // Group transactions by titular preserving order
                  const titularOrder: string[] = []
                  const grouped: Record<string, ParsedTransaction[]> = {}
                  for (const tx of txList) {
                    if (!grouped[tx.titular]) {
                      titularOrder.push(tx.titular)
                      grouped[tx.titular] = []
                    }
                    grouped[tx.titular].push(tx)
                  }

                  return titularOrder.map(titular => (
                    <div key={titular}>
                      {/* Section divider */}
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">{titular}</span>
                        <div className="h-px flex-1 bg-border/60" />
                      </div>

                      {/* Transactions for this titular */}
                      <div className="space-y-2 mt-2">
                        {grouped[titular].map(tx => {
                          const ov = getTx(tx)
                          const hasUSD = tx.montoUSD !== null
                          const hasARS = tx.montoARS !== null
                          const isDevolucion = tx.tipo === "devolucion"
                          const monto = resolvedMonto(tx)
                          const convertedARS = hasUSD && usdRate !== null ? Math.round((tx.montoUSD ?? 0) * usdRate) : null

                          return (
                            <div
                              key={tx.id}
                              className={`rounded-2xl border transition-all ${ov.incluir ? "border-border bg-background" : "border-border/40 bg-muted/20 opacity-60"}`}
                            >
                              <div className="flex items-start gap-3 px-4 py-3.5">
                                {/* Toggle */}
                                <button
                                  type="button"
                                  onClick={() => setTxOv(tx.id, { incluir: !ov.incluir })}
                                  className={`size-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${ov.incluir ? "bg-primary border-primary" : "border-border"}`}
                                >
                                  {ov.incluir && <Check className="size-3 text-white" />}
                                </button>

                                <div className="flex-1 min-w-0 space-y-1.5">
                                  {/* Descripción editable */}
                                  <input
                                    type="text"
                                    value={ov.descripcion}
                                    onChange={e => setTxOv(tx.id, { descripcion: e.target.value })}
                                    className="w-full text-sm font-medium bg-transparent focus:outline-none focus:bg-muted/30 rounded px-1 -mx-1 transition-colors"
                                  />

                                  {/* Meta row */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(tx.fecha + "T12:00:00").toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                                    </span>
                                    {tx.tipo === "cuota" && tx.cuotaActual !== null && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">
                                        {tx.cuotaActual === 1 ? `${tx.cuotaTotal} cuotas` : `cuota ${tx.cuotaActual}/${tx.cuotaTotal}`}
                                      </span>
                                    )}
                                    {tx.tipo === "debito_automatico" && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Débito automático</span>
                                    )}
                                    {isDevolucion && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">Devolución</span>
                                    )}
                                    {tx.nota && (
                                      <span className="text-[10px] text-amber-700 flex items-center gap-1">
                                        <AlertTriangle className="size-3" />{tx.nota}
                                      </span>
                                    )}
                                  </div>

                                  {/* Categoría + moneda + user override */}
                                  {ov.incluir && (
                                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                                      {/* Categoría — button opens bottom sheet */}
                                      {(() => {
                                        const matchedCat = categories.find(c => c.name.toLowerCase() === (ov.categoria ?? "").toLowerCase())
                                        const orgName = matchedCat ? (organizations.find(o => o.id === matchedCat.organizationId)?.name ?? "") : ""
                                        return (
                                          <button
                                            type="button"
                                            onClick={() => setCategorySheetFor(tx.id)}
                                            className="flex items-center gap-1.5 text-xs bg-muted/50 border border-border/60 rounded-lg px-2 py-1 hover:border-foreground/30 transition-colors"
                                          >
                                            <span className={ov.categoria ? "text-foreground" : "text-muted-foreground"}>
                                              {ov.categoria ?? "Sin categoría"}
                                            </span>
                                            {orgName && <span className="text-muted-foreground/60">· {orgName}</span>}
                                            <ChevronDown className="size-3 text-muted-foreground" />
                                          </button>
                                        )
                                      })()}

                                      {/* USD toggle — solo cuando hay ambas monedas */}
                                      {hasUSD && hasARS && (
                                        <button type="button"
                                          onClick={() => setTxOv(tx.id, { usarUSD: !ov.usarUSD })}
                                          className={`text-xs px-2 py-1 rounded-lg border transition-colors ${ov.usarUSD ? "bg-blue-50 border-blue-200 text-blue-700" : "border-border text-muted-foreground"}`}
                                        >
                                          {ov.usarUSD ? `U$S ${tx.montoUSD?.toFixed(2)} → oficial` : "ARS del resumen"}
                                        </button>
                                      )}

                                      {/* Per-transaction user override — only when multiple members */}
                                      {orgMembers.length > 1 && (
                                        <div className="relative">
                                          <select
                                            value={txOverrides[tx.id]?.userId ?? titularMap[tx.titular] ?? currentUserId}
                                            onChange={e => setTxOv(tx.id, { userId: e.target.value })}
                                            className="appearance-none text-xs bg-muted/50 border border-border/60 rounded-lg px-2 py-1 pr-5 focus:outline-none"
                                          >
                                            {orgMembers.map(m => (
                                              <option key={m.id} value={m.id}>{m.name || m.email}</option>
                                            ))}
                                          </select>
                                          <ChevronDown className="size-3 absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* Monto */}
                                <div className="flex-shrink-0 text-right">
                                  <p className={`text-sm font-semibold ${isDevolucion ? "text-green-600" : "text-foreground"}`}
                                    style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                                    {ov.usarUSD
                                      ? convertedARS !== null
                                        ? formatARS(isDevolucion ? -convertedARS : convertedARS)
                                        : `U$S ${tx.montoUSD?.toFixed(2)}` // rate not loaded yet
                                      : formatARS(isDevolucion ? -(tx.montoARS ?? 0) : (tx.montoARS ?? 0))}
                                  </p>
                                  {/* Secondary line */}
                                  {hasUSD && (
                                    <p className="text-[10px] text-muted-foreground">
                                      {ov.usarUSD
                                        ? `U$S ${tx.montoUSD?.toFixed(2)}`
                                        : convertedARS !== null
                                          ? `≈ ${formatARS(convertedARS)} al oficial`
                                          : null}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </>
          )}

          {/* ── STEP: IMPORTING ── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">Importando {selectedTxs.length} transacciones...</p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && importResult && (
            <div className="flex flex-col items-center justify-center py-16 gap-5 text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="size-8 text-primary" />
              </div>
              <div>
                <p className="text-lg font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
                  ¡Importado!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {importResult.imported} gasto{importResult.imported !== 1 ? "s" : ""} creado{importResult.imported !== 1 ? "s" : ""}
                  {importResult.duplicates ? ` · ${importResult.duplicates} duplicado${importResult.duplicates !== 1 ? "s" : ""} ignorado${importResult.duplicates !== 1 ? "s" : ""}` : ""}
                </p>
              </div>
              {importResult.errors && importResult.errors.length > 0 && (
                <div className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-left">
                  <p className="text-xs font-semibold text-amber-800 mb-1">Algunos ítems no se pudieron importar:</p>
                  {importResult.errors.map((e, i) => (
                    <p key={i} className="text-xs text-amber-700">· {e}</p>
                  ))}
                </div>
              )}
              <div className="flex gap-3 w-full">
                <button type="button" onClick={() => { setStep("upload"); setSelectedFile(null); setParsed(null); setImportResult(null) }}
                  className="flex-1 rounded-full bg-muted text-muted-foreground py-3 text-sm font-medium active:scale-[0.97] transition-all">
                  Importar otro
                </button>
                <button type="button" onClick={() => push("/bills")}
                  className="flex-1 rounded-full bg-primary text-primary-foreground py-3 text-sm font-semibold active:scale-[0.97] transition-all">
                  Ver gastos
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Category bottom sheet ────────────────────────────────────────── */}
      {categorySheetFor && (() => {
        const sheetCatName = txOverrides[categorySheetFor]?.categoria ?? parsed?.transacciones.find(t => t.id === categorySheetFor)?.categoriaSugerida ?? null
        const hasCategory = !!categories.find(c => c.name.toLowerCase() === (sheetCatName ?? "").toLowerCase())
        return (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/40" onClick={() => setCategorySheetFor(null)} />
            <div className="relative bg-background rounded-t-3xl max-h-[75vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border/50">
                <p className="text-sm font-semibold">Categoría</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openNewCategory()}
                    className="flex items-center gap-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/15 px-2.5 py-1.5 rounded-full transition-colors active:scale-95"
                  >
                    <Plus className="size-3" /> Nueva
                  </button>
                  <button onClick={() => setCategorySheetFor(null)} className="text-muted-foreground active:scale-90 transition-all">
                    <X className="size-5" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 px-4 py-3 space-y-4">
                {/* Sin categoría */}
                <button
                  type="button"
                  onClick={() => { setTxOv(categorySheetFor, { categoria: null }); setCategorySheetFor(null) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                    !hasCategory ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60"
                  }`}
                >
                  Sin categoría
                </button>

                {/* Categories grouped by space */}
                {organizations.map(org => {
                  const orgCats = categories.filter(c => c.organizationId === org.id)
                  if (orgCats.length === 0) return null
                  return (
                    <div key={org.id}>
                      {/* Space header with color + icon + "Nueva" shortcut */}
                      <div className="flex items-center justify-between mb-1.5 px-1">
                        <div className="flex items-center gap-2">
                          <div className="size-5 rounded-md flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${MAUVE}25` }}>
                            {org.isPersonal
                              ? <User className="size-3" style={{ color: MAUVE }} />
                              : <Home className="size-3" style={{ color: MAUVE }} />}
                          </div>
                          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: MAUVE }}>{org.name}</p>
                        </div>
                        <button
                          onClick={() => openNewCategory(org.id)}
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
                        >
                          <Plus className="size-3" /> agregar
                        </button>
                      </div>

                      <div className="space-y-0.5">
                        {orgCats.map(cat => {
                          const isSelected = sheetCatName?.toLowerCase() === cat.name.toLowerCase()
                          return (
                            <button
                              key={cat.id}
                              type="button"
                              onClick={() => { setTxOv(categorySheetFor, { categoria: cat.name }); setCategorySheetFor(null) }}
                              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-colors ${
                                isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/60 text-foreground"
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                {cat.icon && <span className="text-base leading-none">{cat.icon}</span>}
                                {cat.name}
                              </span>
                              {isSelected && <Check className="size-4 text-primary flex-shrink-0" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
