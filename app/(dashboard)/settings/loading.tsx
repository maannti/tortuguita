export default function Loading() {
  return (
    <div className="px-4 pt-6 space-y-5 animate-pulse">
      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="size-16 rounded-full bg-muted/60 flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-5 w-32 rounded-full bg-muted/60" />
          <div className="h-3 w-44 rounded-full bg-muted/60" />
        </div>
      </div>
      {/* Section blocks */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-20 rounded-full bg-muted/60" />
          <div className="rounded-2xl bg-muted/60 h-14" />
        </div>
      ))}
    </div>
  )
}
