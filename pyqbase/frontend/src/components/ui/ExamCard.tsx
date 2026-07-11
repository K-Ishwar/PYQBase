import * as React from "react"


interface ExamCardProps {
  icon: React.ReactNode
  title: string
  description: string
  href?: string
}

export function ExamCard({ icon, title, description, href = "#" }: ExamCardProps) {
  return (
    <a
      href={href}
      className="group flex flex-col items-center p-6 rounded-2xl border bg-card text-card-foreground shadow-sm transition-all hover:scale-[1.02] hover:shadow-md hover:border-primary/30"
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
  )
}
