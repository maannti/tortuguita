export default function Loading() {
  return (
    <div className="px-4 pt-4 space-y-4 animate-pulse">
      {/* Hero card */}
      <div className="rounded-3xl bg-muted/60 h-52" />
      {/* Two mini cards */}
      <div className="flex gap-3">
        <div className="flex-1 rounded-2xl bg-muted/60 h-20" />
        <div className="flex-1 rounded-2xl bg-muted/60 h-20" />
      </div>
      {/* Section title */}
      <div className="h-4 w-24 rounded-full bg-muted/60" />
      {/* Card rows */}
      <div className="rounded-2xl bg-muted/60 h-24" />
      <div className="rounded-2xl bg-muted/60 h-24" />
    </div>
  )
}
