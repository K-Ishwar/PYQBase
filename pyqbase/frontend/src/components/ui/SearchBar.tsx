import * as React from "react"
import { Search } from "lucide-react"

type SearchBarProps = React.InputHTMLAttributes<HTMLInputElement>

export function SearchBar({ className, ...props }: SearchBarProps) {
  return (
    <div className={`relative w-full max-w-2xl group ${className}`}>
      <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
        <Search className="h-5 w-5" />
      </div>
      <input
        type="text"
        className="block w-full rounded-full border border-input bg-background py-4 pl-12 pr-16 text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-sm hover:border-primary/50"
        placeholder="Search any topic, subject or exam..."
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-4">
        <div className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs font-mono text-muted-foreground border">
          <span>⌘</span>
          <span>K</span>
        </div>
      </div>
    </div>
  )
}
