"use client"
import { useRouter } from "next/navigation"
import { ChevronLeft, Plus, Pencil } from "lucide-react"
import { DeleteCategoryButton } from "./delete-category-button"

interface Category {
  id: string; name: string; color: string | null; icon: string | null
}

interface CategoriesListProps {
  categories: Category[]
  spaceId: string
  spaceName: string
}

export function CategoriesList({ categories, spaceId, spaceName }: CategoriesListProps) {
  const router = useRouter()
  const newHref = `/categories/new?spaceId=${spaceId}`

  return (
    <div className="pb-28">
      <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <button onClick={() => router.push("/categories")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ChevronLeft className="size-4" />Volver
        </button>
        <h1 className="text-base font-semibold" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
          Categorías de gastos
        </h1>
        <button onClick={() => router.push(newHref)}
          className="flex items-center gap-1 text-sm font-semibold text-primary">
          <Plus className="size-4" />Nueva
        </button>
      </div>

      <div className="px-4 pt-4">
        {categories.length > 0 ? (
          <div className="glass rounded-2xl divide-y divide-white/60 overflow-hidden">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="size-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${cat.color || "#9D8189"}22` }}>
                  {cat.icon
                    ? <span className="text-lg">{cat.icon}</span>
                    : <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: cat.color || "#9D8189" }} />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{cat.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Gasto fijo</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => router.push(`/categories/${cat.id}/edit`)}
                    className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="size-4" />
                  </button>
                  <DeleteCategoryButton id={cat.id} name={cat.name} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-4">📋</div>
            <p className="text-base font-medium mb-1" style={{ fontFamily: "var(--font-fraunces, serif)" }}>
              Sin categorías todavía
            </p>
            <p className="text-sm text-muted-foreground mb-6">Agregá tu primer gasto fijo o recurrente</p>
            <button onClick={() => router.push(newHref)}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground rounded-full px-6 py-3 text-sm font-medium shadow-md active:scale-95 transition-transform">
              <Plus className="size-4" />Agregar
            </button>
          </div>
        )}
      </div>

      {categories.length > 0 && (
        <button onClick={() => router.push(newHref)}
          className="fixed bottom-24 right-4 z-30 flex items-center justify-center size-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 active:scale-95 transition-transform">
          <Plus className="size-6" />
        </button>
      )}
    </div>
  )
}
