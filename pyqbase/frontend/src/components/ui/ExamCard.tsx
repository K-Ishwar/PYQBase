import * as React from "react"
import { SpotlightCard } from "./SpotlightCard"


interface ExamCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
}

export function ExamCard({ icon, title, description, href = "#" }: ExamCardProps) {
  return (
    <SpotlightCard>
      <a
        href={href}
        className="group flex flex-col items-center p-6 h-full w-full"
      >
      <div className="mb-4 rounded-full bg-primary/5 p-4 text-primary">
        {icon}
      </div>
      <h3 className="mb-2 font-bold tracking-tight text-lg group-hover:text-primary transition-colors">
        {title}
      </h3>
      <p className="text-center text-sm text-muted-foreground">
        {description}
      </p>
      </a>
    </SpotlightCard>
  )
}
