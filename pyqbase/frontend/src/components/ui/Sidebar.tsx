import * as React from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"

export interface SidebarItem {
  id: string
  label: string
  href: string
  isActive?: boolean
}

export interface SidebarSection {
  title?: string
  items: SidebarItem[]
}

interface SidebarProps {
  sections: SidebarSection[]
  className?: string
}

export function Sidebar({ sections, className = "" }: SidebarProps) {
  return (
    <aside className={`w-64 flex-shrink-0 border-r bg-background min-h-[calc(100vh-4rem)] py-6 pr-6 ${className}`}>
      <nav className="space-y-6">
        {sections.map((section, idx) => (
          <div key={idx}>
            {section.title && (
              <h4 className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {section.title}
              </h4>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item.id}>
                  <Link
                    href={item.href}
                    className={`flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      item.isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {item.label}
                    {item.isActive && <ChevronRight className="h-4 w-4" />}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
