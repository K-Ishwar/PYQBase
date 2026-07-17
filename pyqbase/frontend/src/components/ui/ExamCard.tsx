import * as React from "react"
import { SpotlightCard } from "./SpotlightCard"
import { ArrowRight } from "lucide-react"


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
        className="group flex flex-col items-start p-6 h-full w-full relative"
      >
        <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          {icon}
        </div>
        <h3 className="mb-2 font-bold tracking-tight text-xl group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground flex-1">
          {description}
        </p>
        <div className="mt-6 flex items-center text-sm font-bold text-primary opacity-80 group-hover:opacity-100 transition-opacity w-full justify-between">
          <span>View Exam Details</span>
          <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
        </div>
      </a>
    </SpotlightCard>
  )
}
