import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <React.Fragment key={item.label}>
            {isLast ? (
              <span className="font-medium text-foreground">{item.label}</span>
            ) : (
              <>
                <Link href={item.href || "#"} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </React.Fragment>
        )
      })}
    </nav>
  )
}
