import Link from 'next/link'

export default function AdminDashboard() {
  const stats = [
    { label: 'Total Questions', value: '—', href: '/admin/questions' },
    { label: 'Subjects', value: '—', href: '/admin/taxonomy' },
    { label: 'Audit Logs', value: '—', href: '#' },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">
          Manage questions, taxonomy, and content ingestion.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-xl border bg-card p-6 hover:border-primary/40 hover:shadow-sm transition-all"
          >
            <p className="text-sm text-muted-foreground">{stat.label}</p>
            <p className="mt-2 text-4xl font-bold text-foreground">{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            href="/admin/questions/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-dark transition-colors"
          >
            + Add New Question
          </Link>
          <Link
            href="/admin/taxonomy"
            className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Manage Taxonomy
          </Link>
        </div>
      </div>
    </div>
  )
}
