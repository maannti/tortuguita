export default function Loading() {
  return (
    <div className="px-4 pt-4 space-y-4 animate-pulse">
      {/* Hero */}
      <div className="rounded-3xl bg-muted/60 h-36" />
      {/* Action bar */}
      <div className="rounded-2xl bg-muted/60 h-10" />
      {/* List rows */}
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-muted/60 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded-full bg-muted/60" />
            <div className="h-3 w-20 rounded-full bg-muted/60" />
          </div>
          <div className="h-4 w-16 rounded-full bg-muted/60" />
        </div>
      ))}
    </div>
  )
}
