"use client"

import { createContext, useContext, useState, useEffect, useCallback } from "react"

export interface Space {
  id: string
  name: string
  isPersonal: boolean
  role: string
  memberCount: number
}

interface SpacesContextValue {
  spaces: Space[]
  activeSpaceIds: Set<string>
  toggleSpace: (id: string) => void
  isHydrated: boolean
}

const SpacesContext = createContext<SpacesContextValue | null>(null)

const LS_KEY = "activeSpaceIds"
const COOKIE_KEY = "activeSpaceIds"

function writeCookie(ids: string[]) {
  if (typeof document === "undefined") return
  document.cookie = `${COOKIE_KEY}=${ids.join(",")}; path=/; max-age=31536000; SameSite=Lax`
}

export function SpacesProvider({
  spaces,
  children,
}: {
  spaces: Space[]
  children: React.ReactNode
}) {
  const allIds = spaces.map(s => s.id)
  const [activeSpaceIds, setActiveSpaceIds] = useState<Set<string>>(() => new Set(allIds))
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as string[]
        // Only keep IDs that still belong to this user
        const valid = parsed.filter(id => spaces.some(s => s.id === id))
        if (valid.length > 0) {
          setActiveSpaceIds(new Set(valid))
          writeCookie(valid)
        } else {
          // All saved IDs are gone — reset to all
          writeCookie(allIds)
          localStorage.setItem(LS_KEY, JSON.stringify(allIds))
        }
      } catch {
        writeCookie(allIds)
      }
    } else {
      // First time — activate all spaces and persist
      writeCookie(allIds)
      localStorage.setItem(LS_KEY, JSON.stringify(allIds))
    }
    setIsHydrated(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleSpace = useCallback((id: string) => {
    setActiveSpaceIds(prev => {
      if (prev.has(id) && prev.size === 1) return prev // keep at least one
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      const arr = Array.from(next)
      localStorage.setItem(LS_KEY, JSON.stringify(arr))
      writeCookie(arr)
      return next
    })
  }, [])

  return (
    <SpacesContext.Provider value={{ spaces, activeSpaceIds, toggleSpace, isHydrated }}>
      {children}
    </SpacesContext.Provider>
  )
}

export function useSpaces() {
  const ctx = useContext(SpacesContext)
  if (!ctx) throw new Error("useSpaces must be used within SpacesProvider")
  return ctx
}
