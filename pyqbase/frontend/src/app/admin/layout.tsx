import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'

async function getAdminUser() {
  const cookieStore = cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!



  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check is_admin from app_metadata JWT claim
  const isAdmin = user.app_metadata?.role === 'admin'
  if (!isAdmin) redirect('/login')

  return { id: user.id, email: user.email, isAdmin: true }
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const admin = await getAdminUser()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Admin Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-primary">PYQBase</span>
            <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
              Admin
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground truncate">{admin.email}</p>
        </div>
        <nav className="p-4 space-y-1">
          <AdminNavLink href="/admin" label="Dashboard" icon="⊞" />
          <AdminNavLink href="/admin/questions" label="Questions" icon="?" />
          <AdminNavLink href="/admin/taxonomy" label="Taxonomy" icon="⋮" />
          <div className="pt-4 mt-4 border-t border-border">
            <AdminNavLink href="/" label="← Back to Site" icon="↩" />
          </div>
        </nav>
      </aside>

      {/* Admin Content Area */}
      <main className="flex-1 flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center px-6">
          <span className="text-sm font-medium text-muted-foreground">Admin Panel</span>
        </header>
        <div className="flex-1 p-8 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  )
}

function AdminNavLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      <span className="text-base">{icon}</span>
      {label}
    </Link>
  )
}
