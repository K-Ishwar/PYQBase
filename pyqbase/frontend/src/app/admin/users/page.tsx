'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { Users, Crown, ShieldAlert } from 'lucide-react'

export default function UsersAdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, usersRes] = await Promise.all([
          apiClient('/api/v1/admin/users/stats'),
          apiClient('/api/v1/admin/users')
        ])
        const statsData = await statsRes.json()
        const usersData = await usersRes.json()
        
        setStats(statsData)
        setUsers(Array.isArray(usersData) ? usersData.filter((u: any) => u.role === 'admin') : [])
      } catch (err: any) {
        console.error(err)
        setErrorMsg(err.message || String(err))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  if (loading) return <div className="text-center py-20 animate-pulse text-muted-foreground font-semibold">Loading user data...</div>

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">User Management</h1>
        <p className="text-muted-foreground mt-1">Overview of registered users, subscribers, and admin accounts.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-4 bg-primary/10 text-primary rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Users</p>
            <p className="text-4xl font-extrabold">{stats?.total_users || 0}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-xl">
            <Crown className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Subscribers</p>
            <p className="text-4xl font-extrabold">{stats?.subscribed_users || 0}</p>
          </div>
        </div>

        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow">
          <div className="p-4 bg-red-500/10 text-red-600 rounded-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Admins</p>
            <p className="text-4xl font-extrabold">{stats?.admin_users || 0}</p>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border bg-muted/20">
          <h2 className="text-xl font-bold">Admin Accounts</h2>
        </div>

        {errorMsg ? (
          <div className="p-6 text-red-500 font-bold bg-red-500/10">Error fetching data: {errorMsg}</div>
        ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Joined Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.subscription_status === 'premium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}>
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    No admin accounts found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}
      </div>
    </div>
  )
}
