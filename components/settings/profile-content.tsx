"use client"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { ChevronLeft, Check, Trash2 } from "lucide-react"

interface Props {
  user: { name?: string | null; email?: string | null; image?: string | null }
}

function getInitials(name?: string | null) {
  return name ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?"
}

export function ProfileContent({ user }: Props) {
  const router = useRouter()
  const [name, setName] = useState(user.name || "")
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) { setError("Ingresá un nombre"); return }
    setIsSaving(true); setError(null)
    try {
      const body: Record<string, string> = { name: name.trim() }
      if (newPassword) {
        if (!currentPassword) { setError("Ingresá tu contraseña actual"); setIsSaving(false); return }
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al guardar el perfil") }
      setSaved(true); setCurrentPassword(""); setNewPassword("")
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      if (err instanceof TypeError && err.message.includes("fetch")) {
        setError("Error de conexión. Revisá tu conexión e intentá de nuevo.")
      } else {
        setError(err instanceof Error ? err.message : "Error al guardar")
      }
    } finally { setIsSaving(false) }
  }

  async function handleDelete() {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch("/api/users/profile", { method: "DELETE" })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Error al eliminar la cuenta") }
      await signOut({ callbackUrl: "/login" })
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Error al eliminar")
      setIsDeleting(false)
    }
  }

  return (
    <div className="pb-24">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="text-base font-semibold">Perfil</h1>
        <div className="w-12" />
      </div>

      <form onSubmit={handleSave} className="px-4 pt-6 space-y-5">
        {/* Avatar */}
        <div className="flex justify-center pb-2">
          <div className="size-20 rounded-full bg-primary/10 flex items-center justify-center">
            {user.image
              ? <img src={user.image} alt="" className="size-20 rounded-full object-cover" />
              : <span className="text-2xl font-semibold text-primary">{getInitials(user.name)}</span>
            }
          </div>
        </div>

        {error && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{error}</div>}

        {/* Nombre */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Correo</label>
          <div className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            {user.email}
          </div>
        </div>

        {/* Cambiar contraseña */}
        <div className="space-y-3 pt-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cambiar contraseña <span className="normal-case font-normal">(opcional)</span>
          </p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Contraseña actual"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Nueva contraseña"
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <button
          type="submit"
          disabled={isSaving}
          className="w-full rounded-xl bg-primary text-primary-foreground py-3.5 text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
        >
          {saved ? <><Check className="size-4" />Guardado</> : isSaving ? "Guardando..." : "Guardar cambios"}
        </button>

        {/* Zona de peligro */}
        <div className="pt-4 mt-2 border-t border-border/40 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zona de peligro</p>
          {deleteError && <div className="rounded-xl bg-destructive/10 text-destructive text-sm px-4 py-3">{deleteError}</div>}
          {!deleteConfirm ? (
            <button
              type="button"
              onClick={() => setDeleteConfirm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-destructive/30 py-3 text-sm font-medium text-destructive hover:bg-destructive/5 active:scale-[0.98] transition-all"
            >
              <Trash2 className="size-4" />
              Eliminar mi cuenta
            </button>
          ) : (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 space-y-3">
              <p className="text-sm text-destructive font-medium">¿Estás seguro? Esta acción borra tu cuenta y todos tus datos. No se puede deshacer.</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 rounded-full bg-destructive text-white py-2.5 text-sm font-semibold disabled:opacity-50 active:scale-[0.97] transition-all"
                >
                  {isDeleting ? "Eliminando…" : "Sí, eliminar"}
                </button>
                <button
                  type="button"
                  onClick={() => { setDeleteConfirm(false); setDeleteError(null) }}
                  className="flex-1 rounded-full bg-muted text-muted-foreground py-2.5 text-sm font-medium active:scale-[0.97] transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}
