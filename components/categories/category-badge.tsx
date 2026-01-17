import { Badge } from "@/components/ui/badge"

interface CategoryBadgeProps {
  name: string
  color?: string | null
  icon?: string | null
}

export function CategoryBadge({ name, color, icon }: CategoryBadgeProps) {
  return (
    <Badge
      variant="outline"
      className="font-medium"
      style={{
        borderColor: color || undefined,
        color: color || undefined,
      }}
    >
      {icon && <span className="mr-1">{icon}</span>}
      {name}
    </Badge>
  )
}
