import * as React from "react"
import { ChevronRight } from "lucide-react"

interface TopicCardProps {
  icon: React.ReactNode
  title: string
  count: number
  href?: string
}

export function TopicCard({ icon, title, count, href = "#" }: TopicCardProps) {
  return (
    <a
      href={href}
      className="group flex items-center justify-between p-4 rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:border-primary/30"
    >
      <div className="flex items-center gap-4">
        <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
          {icon}
        </div>
        <div>
          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors">
            {title}
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            {count} Questions
          </p>
        </div>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </a>
  )
}
