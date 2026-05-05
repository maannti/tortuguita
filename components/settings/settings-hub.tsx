"use client"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { ChevronRight, Sun, Moon, LogOut, User, Home, Check, CreditCard, Tag, Plus, X, Copy, Trash2, Settings2, UserMinus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { useSpaces } from "@/lib/spaces-context"

interface Organization {
  id: string
  name: string
  isPersonal: boolean
  role: string
  memberCount: number
  joinCode?: string | null
}
interface Props { creditCards: { id: string }[]; categories: { id: string }[] }

function getInitials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U"
}

export function SettingsHub({ creditCards, categories }: Props) {
  const { data: session } = useSession()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { activeSpaceIds, toggleSpace } = useSpaces()
  const [mounted, setMounted] = useState(false)
  const [organizations, setOrganizations] = useState<Organization[]>([])

  // Create / join space
  const [showNewSpace, setShowNewSpace] = useState(false)
  const [spaceMode, setSpaceMode] = useState<"create" | "join">("create")
  const [newSpaceName, setNewSpaceName] = useState("")
  const [newSpacePersonal, setNewSpacePersonal] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  // Manage space dialog
  const [managingOrg, setManagingOrg] = useState<Organization | null>(null)
  const [editName, setEditName] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [leaveConfirm, setLeaveConfirm] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [manageError, setManageError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Members management (owner only)
  type Member = { userId: string; name: string | null; email: string | null; role: string }
  const [members, setMembers] = useState<Member[]>([])
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null)

  useEffect(() => { setMounted(true) }, [])
  useEffect(() => {
    if (!session?.user?.id) return
    fetch("/api/organizations").then(r => r.ok ? r.json() : []).then(setOrganizations).catch(() => {})
  }, [session?.user?.id])

  const handleToggleSpace = (orgId: string) => {
    toggleSpace(orgId)
    router.refresh()
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
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || "Error al crear espacio"); return }
      const org: Organization = await res.json()
      setOrganizations(prev => [...prev, { ...org, memberCount: org.memberCount ?? 1 }])
      setNewSpaceName(""); setNewSpacePersonal(false); setShowNewSpace(false)
      // Auto-activate the new space
      if (!activeSpaceIds.has(org.id)) toggleSpace(org.id)
      router.refresh()
    } catch { setCreateError("Error al crear espacio") }
    finally { setIsCreating(false) }
  }

  const joinSpace = async () => {
    if (!joinCode.trim()) return
    setIsJoining(true)
    setCreateError(null)
    try {
      const res = await fetch("/api/organizations/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      })
      if (!res.ok) { const d = await res.json(); setCreateError(d.error || "Código inválido"); return }
      const org: Organization = await res.json()
      setOrganizations(prev => [...prev, { ...org, memberCount: org.memberCount ?? 1 }])
      setJoinCode(""); setShowNewSpace(false); setSpaceMode("create")
      if (!activeSpaceIds.has(org.id)) toggleSpace(org.id)
      router.refresh()
    } catch { setCreateError("Error al unirse al espacio") }
    finally { setIsJoining(false) }
  }

  const openManage = (org: Organization, e: React.MouseEvent) => {
    e.stopPropagation()
    setManagingOrg(org)
    setEditName(org.name)
    setDeleteConfirm(false)
    setLeaveConfirm(false)
    setManageError(null)
    setCopied(false)
    setMembers([])
    // Load members for shared spaces where current user is owner
    if (!org.isPersonal && org.role === "owner") {
      fetch(`/api/organizations/${org.id}/members`)
        .then(r => r.ok ? r.json() : [])
        .then(setMembers)
        .catch(() => {})
    }
  }

  const removeMember = async (userId: string) => {
    if (!managingOrg) return
    setRemovingMemberId(userId)
    setManageError(null)
    try {
      const res = await fetch(`/api/organizations/${managingOrg.id}/members?userId=${userId}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); setManageError(d.error || "Error al remover"); return }
      setMembers(prev => prev.filter(m => m.userId !== userId))
      setOrganizations(prev => prev.map(o =>
        o.id === managingOrg.id ? { ...o, memberCount: o.memberCount - 1 } : o
      ))
    } catch { setManageError("Error al remover miembro") }
    finally { setRemovingMemberId(null) }
  }

  const saveRename = async () => {
    if (!managingOrg || !editName.trim() || editName.trim() === managingOrg.name) return
    setIsSaving(true)
    setManageError(null)
    try {
      const res = await fetch(`/api/organizations/${managingOrg.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (!res.ok) { const d = await res.json(); setManageError(d.error || "Error al guardar"); return }
      setOrganizations(prev => prev.map(o => o.id === managingOrg.id ? { ...o, name: editName.trim() } : o))
      setManagingOrg(prev => prev ? { ...prev, name: editName.trim() } : null)
      router.refresh()
    } catch { setManageError("Error al guardar") }
    finally { setIsSaving(false) }
  }

  const deleteSpace = async () => {
    if (!managingOrg) return
    setIsDeleting(true)
    setManageError(null)
    try {
      const res = await fetch(`/api/organizations/${managingOrg.id}`, { method: "DELETE" })
      if (!res.ok) { const d = await res.json(); setManageError(d.error || "Error al eliminar"); return }
      setOrganizations(prev => prev.filter(o => o.id !== managingOrg.id))
      setManagingOrg(null)
      router.refresh()
    } catch { setManageError("Error al eliminar") }
    finally { setIsDeleting(false) }
  }

  const leaveSpace = async () => {
    if (!managingOrg) return
    setIsLeaving(true)
    setManageError(null)
    try {
      const res = await fetch(`/api/organizations/${managingOrg.id}/leave`, { method: "POST" })
      if (!res.ok) { const d = await res.json(); setManageError(d.error || "Error al salir"); return }
      setOrganizations(prev => prev.filter(o => o.id !== managingOrg.id))
      setManagingOrg(null)
      router.refresh()
    } catch { setManageError("Error al salir del espacio") }
    finally { setIsLeaving(false) }
  }

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })
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

          {/* Create / join space form */}
          {showNewSpace && (
            <div className="glass rounded-2xl px-4 py-4 mb-3 space-y-3">
              {/* Mode tabs */}
              <div className="flex rounded-xl bg-muted/60 p-1 gap-1">
                {(["create", "join"] as const).map((m) => (
                  <button key={m} onClick={() => { setSpaceMode(m); setCreateError(null) }}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${spaceMode === m ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"}`}>
                    {m === "create" ? "Crear" : "Unirse"}
                  </button>
                ))}
              </div>

              {spaceMode === "create" ? (
                <>
                  <input
                    type="text"
                    placeholder="Nombre del espacio"
                    value={newSpaceName}
                    onChange={e => setNewSpaceName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && createSpace()}
                    className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button type="button" onClick={() => setNewSpacePersonal(v => !v)} className="flex items-center gap-3 w-full">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${newSpacePersonal ? "bg-primary/10" : "bg-muted"}`}>
                      {newSpacePersonal ? <User className="h-4 w-4 text-primary" /> : <Home className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">{newSpacePersonal ? "Personal" : "Compartido"}</p>
                      <p className="text-xs text-muted-foreground">{newSpacePersonal ? "Solo vos" : "Con otras personas · genera código de invitación"}</p>
                    </div>
                  </button>
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <button onClick={createSpace} disabled={isCreating || !newSpaceName.trim()}
                    className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all">
                    {isCreating ? "Creando…" : "Crear espacio"}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Ingresá el código que te compartieron</p>
                    <input
                      type="text"
                      placeholder="Ej: ABC123"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value.toUpperCase())}
                      onKeyDown={e => e.key === "Enter" && joinSpace()}
                      maxLength={8}
                      className="w-full rounded-xl border border-border/50 bg-background px-3 py-2.5 text-sm font-mono uppercase outline-none focus:border-primary transition-colors tracking-widest"
                    />
                  </div>
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <button onClick={joinSpace} disabled={isJoining || !joinCode.trim()}
                    className="w-full rounded-full bg-primary text-primary-foreground py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all">
                    {isJoining ? "Uniéndose…" : "Unirse"}
                  </button>
                </>
              )}
            </div>
          )}

          {organizations.length > 0 && (
            <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
              {organizations.map((org) => {
                const isActive = activeSpaceIds.has(org.id)
                return (
                  <div key={org.id} className="flex items-center gap-3 px-4 py-3.5">
                    <button
                      onClick={() => handleToggleSpace(org.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: org.isPersonal ? "#9D8189" : "#7B9E87" }}
                      >
                        {org.isPersonal
                          ? <User className="h-4 w-4 text-white" />
                          : <Home className="h-4 w-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {org.isPersonal ? "Personal" : `${org.memberCount} miembro${org.memberCount !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      {isActive && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                    </button>
                    {/* Manage button */}
                    <button
                      onClick={(e) => openManage(org, e)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 active:scale-95 transition-all flex-shrink-0"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
              { label: "Mis tarjetas", href: "/cards", icon: <CreditCard className="h-4 w-4 text-white" />, bg: "#7B9E87" },
              { label: "Categorías de gastos", href: "/categories", icon: <Tag className="h-4 w-4 text-white" />, bg: "#9D8189" },
            ].map((item) => (
              <button key={item.label} onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-white/30 transition-colors">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: item.bg }}>
                  {item.icon}
                </div>
                <p className="flex-1 text-sm font-medium">{item.label}</p>
                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* ── Configuración ── */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">Configuración</p>
          <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
            {(() => {
              const sharedOrgs = organizations.filter(o => !o.isPersonal)
              const incomeHref = sharedOrgs.length === 1
                ? `/settings/organization?spaceId=${sharedOrgs[0].id}`
                : "/settings/organization"
              const items = [
                ...(sharedOrgs.length > 0
                  ? [{ label: "Ingresos del mes", desc: "División proporcional de gastos", href: incomeHref }]
                  : []),
                { label: "Perfil", desc: "Nombre, contraseña", href: "/settings/profile" },
              ]
              return items.map((item) => (
                <button key={item.label} onClick={() => router.push(item.href)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-white/30 transition-colors">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            })()}
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

      {/* ── Space management dialog ── */}
      <Dialog open={!!managingOrg} onOpenChange={(open) => { if (!open) { setManagingOrg(null); setDeleteConfirm(false); setLeaveConfirm(false); setManageError(null) } }}>
        <DialogContent className="rounded-3xl border-border/40 bg-card w-[min(calc(100vw-2rem),24rem)] p-6 [&>.absolute]:hidden inset-auto left-1/2 top-24 -translate-x-1/2 max-h-[70dvh] overflow-y-auto">
          <DialogHeader className="text-left gap-1 pb-2">
            <DialogTitle style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              {managingOrg?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {managingOrg?.isPersonal ? "Espacio personal" : `${managingOrg?.memberCount} miembro${managingOrg?.memberCount !== 1 ? "s" : ""} · espacio compartido`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Join code — shared spaces only */}
            {!managingOrg?.isPersonal && managingOrg?.joinCode && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Código de invitación</p>
                <button
                  onClick={() => copyCode(managingOrg.joinCode!)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-2xl bg-muted/60 hover:bg-muted active:scale-[0.98] transition-all"
                >
                  <span className="text-lg font-mono font-semibold tracking-[0.2em] text-foreground">{managingOrg.joinCode}</span>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied ? "¡Copiado!" : "Copiar"}</span>
                  </div>
                </button>
                <p className="text-xs text-muted-foreground mt-1.5 px-1">Compartí este código para que otros se unan al espacio.</p>
              </div>
            )}

            {/* Members list — shared spaces, owner only */}
            {managingOrg?.role === "owner" && !managingOrg?.isPersonal && members.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Miembros</p>
                <div className="space-y-1">
                  {members.map((m) => {
                    const isMe = m.userId === session?.user?.id
                    return (
                      <div key={m.userId} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/40">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-primary/10">
                          <User className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name || m.email}</p>
                          {m.role === "owner" && (
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Owner</p>
                          )}
                        </div>
                        {!isMe && (
                          <button
                            onClick={() => removeMember(m.userId)}
                            disabled={removingMemberId === m.userId}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all disabled:opacity-40"
                          >
                            {removingMemberId === m.userId
                              ? <span className="text-xs">…</span>
                              : <UserMinus className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Rename — only for owners */}
            {managingOrg?.role === "owner" && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Renombrar</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveRename()}
                    className="flex-1 rounded-xl border border-border/50 bg-background px-3 py-2 text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={saveRename}
                    disabled={isSaving || !editName.trim() || editName.trim() === managingOrg?.name}
                    className="px-4 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 active:scale-95 transition-all"
                  >
                    {isSaving ? "…" : "OK"}
                  </button>
                </div>
              </div>
            )}

            {manageError && <p className="text-xs text-destructive">{manageError}</p>}

            {/* Leave — only for non-owner members of shared spaces */}
            {managingOrg?.role !== "owner" && !managingOrg?.isPersonal && (
              <div className="pt-1 border-t border-border/40">
                {!leaveConfirm ? (
                  <button
                    onClick={() => setLeaveConfirm(true)}
                    className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-destructive active:scale-[0.98] transition-all"
                  >
                    <LogOut className="h-4 w-4" />
                    Salir del espacio
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive font-medium">¿Salir de "{managingOrg?.name}"? Vas a perder acceso a los gastos compartidos.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={leaveSpace}
                        disabled={isLeaving}
                        className="flex-1 rounded-full bg-destructive text-white py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
                      >
                        {isLeaving ? "Saliendo…" : "Salir"}
                      </button>
                      <button
                        onClick={() => setLeaveConfirm(false)}
                        className="flex-1 rounded-full bg-muted text-muted-foreground py-2.5 text-sm font-medium active:scale-[0.97] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete — only for owners, with confirmation step */}
            {managingOrg?.role === "owner" && (
              <div className="pt-1 border-t border-border/40">
                {!deleteConfirm ? (
                  <button
                    onClick={() => setDeleteConfirm(true)}
                    className="w-full flex items-center gap-2 py-2.5 text-sm font-medium text-destructive active:scale-[0.98] transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar espacio
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive font-medium">¿Eliminar "{managingOrg?.name}"? Esta acción no se puede deshacer.</p>
                    <div className="flex gap-2">
                      <button
                        onClick={deleteSpace}
                        disabled={isDeleting}
                        className="flex-1 rounded-full bg-destructive text-white py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
                      >
                        {isDeleting ? "Eliminando…" : "Eliminar"}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(false)}
                        className="flex-1 rounded-full bg-muted text-muted-foreground py-2.5 text-sm font-medium active:scale-[0.97] transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

    </div>
  )
}
