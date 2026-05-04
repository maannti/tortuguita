"use client"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { ChevronRight, Sun, Moon, LogOut, User, Home, Check, CreditCard, Tag, Plus, X } from "lucide-react"

interface Organization { id: string; name: string; isPersonal: boolean; role: string; memberCount: number }
interface Props { creditCards: { id: string }[]; categories: { id: string }[] }

function getInitials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U"
}

export function SettingsHub({ creditCards, categories }: Props) {
  const { data: session, update: updateSession } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [isSwitching, setIsSwitching] = useState(false)
  const [showNewSpace, setShowNewSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState("")
  const [newSpacePersonal, setNewSpacePersonal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/organizations").then(r => r.ok ? r.json() : []).then(setOrganizations).catch(() => {})
  }, [session?.user?.id])

  const switchOrg = async (orgId: string) => {
    if (isSwitching || orgId === session?.user?.currentOrganizationId) return
    setIsSwitching(true)
    try {
      const res = await fetch("/api/users/switch-organization", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId: orgId }),
      })
      if (res.ok) { await updateSession({ currentOrganizationId: orgId }); router.refresh() }
    } catch {} finally { setIsSwitching(false) }
  }

  const createSpace = async () => {
    if (!newSpaceName.trim()) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSpaceName.trim(), isPersonal: newSpacePersonal }),
      })
      if (!res.ok) {
        const d = await res.json()
        setCreateError(d.error || "Error al crear espacio")
        return
      }
      const org: Organization & { joinCode?: string } = await res.json()
      setOrganizations(prev => [...prev, { ...org, memberCount: org.memberCount ?? 1 }])
      setNewSpaceName("")
      setNewSpacePersonal(false)
      setShowNewSpace(false)
      // Switch to the new space automatically
      await switchOrg(org.id)
      router.refresh()
    } catch {
      setCreateError("Error al crear espacio")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="pb-28">

      {/* ── User card ── */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 ring-2 ring-primary/20">
            {session?.user?.image
              ? <img src={session.user.image} alt="" className="w-16 h-16 rounded-full object-cover" />
              : <span className="text-xl font-semibold text-primary">{getInitials(session?.user?.name)}</span>
            }
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold truncate" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              {session?.user?.name}
            </p>
            <p className="text-sm text-muted-foreground truncate">{session?.user?.email}</p>
          </div>
        </div>
      </div>

      <div className="px-4 space-y-5">

        {/* ── Espacios ── */}
        <section>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Espacios</p>
            <button
              onClick={() => { setShowNewSpace(v => !v); setCreateError(null); setNewSpaceName(""); setNewSpacePersonal(false) }}
              className="flex items-center gap-1 text-xs font-medium text-primary active:scale-95 transition-all"
            >
              {showNewSpace ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showNewSpace ? "Cancelar" : "Nuevo"}
            </button>
          </div>

          {/* Create space form */}
          {showNewSpace && (
            <div className="glass rounded-2xl px-4 py-4 mb-3 space-y-3">
              <p className="text-sm font-medium" style={{ fontFamily: "var(--font-fraunces, serif)" }}>Nuevo espacio</p>
              <input
                type="text"
                placeholder="Nombre del espacio"
                value={newSpaceName}
                onChange={e => setNewSpaceName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && createSpace()}
                className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
              />
              {/* Personal toggle */}
              <button
                type="button"
                onClick={() => setNewSpacePersonal(v => !v)}
                className="flex items-center gap-3 w-full"
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${newSpacePersonal ? "bg-primary/10" : "bg-muted"}`}>
                  {newSpacePersonal
                    ? <User className="h-4 w-4 text-primary" />
                    : <Home className="h-4 w-4 text-muted-foreground" />}
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{newSpacePersonal ? "Personal" : "Compartido"}</p>
                  <p className="text-xs text-muted-foreground">{newSpacePersonal ? "Solo vos" : "Con otras personas (genera código de invitación)"}</p>
                </div>
              </button>
              {createError && <p className="text-xs text-destructive">{createError}</p>}
              <button
                onClick={createSpace}
                disabled={isCreating || !newSpaceName.trim()}
                className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
              >
                {isCreating ? "Creando…" : "Crear espacio"}
              </button>
            </div>
          )}

          {organizations.length > 0 && (
            <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
              {organizations.map((org) => {
                const isActive = org.id === session?.user?.currentOrganizationId
                return (
                  <button key={org.id} onClick={() => switchOrg(org.id)} disabled={isSwitching}
                    className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/30 transition-colors">
                    <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                      {org.isPersonal
                        ? <User className="h-4 w-4 text-muted-foreground" />
                        : <Home className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.isPersonal ? "Personal" : `${org.memberCount} miembro${org.memberCount !== 1 ? "s" : ""}`}</p>
                    </div>
                    {isActive && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </section>

        {/* ── Gestión ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Gestión</p>
          <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
            {[
              {
                label: "Mis tarjetas",
                desc: `${creditCards.length} tarjeta${creditCards.length !== 1 ? "s" : ""} de crédito`,
                href: "/cards",
                icon: <CreditCard className="h-4 w-4" />,
              },
              {
                label: "Categorías de gastos",
                desc: `${categories.length} categoría${categories.length !== 1 ? "s" : ""}`,
                href: "/categories",
                icon: <Tag className="h-4 w-4" />,
              },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/30 transition-colors">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  {item.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* ── Configuración ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Configuración</p>
          <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
            {[
              { label: "Ingresos del mes", desc: "División proporcional de gastos", href: "/settings/organization" },
              { label: "Organización",     desc: "Miembros, código de invitación",  href: "/settings/organization" },
              { label: "Perfil",           desc: "Nombre, contraseña",              href: "/settings/profile" },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/30 transition-colors">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* ── Preferencias + Cerrar sesión ── */}
        <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
          <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-white/30 transition-colors">
            <p className="text-sm font-medium">Tema</p>
            {mounted && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-xs">{theme === "dark" ? "Oscuro" : "Claro"}</span>
                {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </div>
            )}
          </button>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center gap-3 px-4 py-3.5 text-destructive hover:bg-destructive/5 transition-colors">
            <LogOut className="h-4 w-4" />
            <span className="text-sm font-medium">Cerrar sesión</span>
          </button>
        </div>

      </div>
    </div>
  )
}
