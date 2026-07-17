'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '@/lib/api-client'
import { Users, Crown, ShieldAlert, Shield, Trash2, CheckCircle, ShieldOff, XCircle } from 'lucide-react'

export default function UsersAdminPage() {
  const [stats, setStats] = useState<any>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'subscribers' | 'admins'>('all')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [statsRes, usersRes] = await Promise.all([
        apiClient('/api/v1/admin/users/stats', { cache: 'no-store' }),
        apiClient('/api/v1/admin/users', { cache: 'no-store' })
      ])
      const statsData = await statsRes.json()
      const usersData = await usersRes.json()
      
      setStats(statsData)
      setAllUsers(Array.isArray(usersData) ? usersData : [])
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || String(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const updateUser = async (userId: string, data: any) => {
    if (!confirm(`Are you sure you want to update this user?`)) return
    try {
      const res = await apiClient(`/api/v1/admin/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update user')
      fetchData() // Refresh list
    } catch (err: any) {
      alert(err.message)
    }
  }

  const deleteUser = async (userId: string) => {
    if (!confirm('Are you absolutely sure you want to delete this user? This cannot be undone.')) return
    try {
      const res = await apiClient(`/api/v1/admin/users/${userId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete user')
      fetchData() // Refresh list
    } catch (err: any) {
      alert(err.message)
    }
  }

  // Filter users based on tab
  const displayUsers = allUsers.filter(u => {
    if (activeTab === 'subscribers') return u.subscription_status === 'premium'
    if (activeTab === 'admins') return u.role === 'admin'
    return true
  })

  if (loading && allUsers.length === 0) return <div className="text-center py-20 animate-pulse text-muted-foreground font-semibold">Loading user data...</div>

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
        <div className="p-0 border-b border-border bg-muted/10 flex">
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'all' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted'}`}
          >
            All Users
          </button>
          <button 
            onClick={() => setActiveTab('subscribers')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'subscribers' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted'}`}
          >
            Subscribers
          </button>
          <button 
            onClick={() => setActiveTab('admins')}
            className={`px-6 py-4 font-bold text-sm transition-colors border-b-2 ${activeTab === 'admins' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:bg-muted'}`}
          >
            Admins
          </button>
        </div>

        {errorMsg ? (
          <div className="p-6 text-red-500 font-bold bg-red-500/10">Error fetching data: {errorMsg}</div>
        ) : (
        <div className="overflow-x-auto min-h-[300px]">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Subscription</th>
                <th className="px-6 py-4">Joined Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border relative">
              {loading && <tr className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10"><td colSpan={5} className="text-center pt-20 text-muted-foreground font-bold">Refreshing...</td></tr>}
              {displayUsers.map((u) => (
                <tr key={u.id} className="hover:bg-muted/30 transition-colors group">
                  <td className="px-6 py-4 font-medium group-hover:text-primary transition-colors">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.role === 'admin' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-muted text-muted-foreground'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${u.subscription_status === 'premium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-muted text-muted-foreground'}`}>
                      {u.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Admin Toggle */}
                      {u.role === 'admin' ? (
                         <button onClick={() => updateUser(u.id, { role: 'user' })} title="Revoke Admin" className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 transition-colors">
                           <ShieldOff className="w-4 h-4" />
                         </button>
                      ) : (
                         <button onClick={() => updateUser(u.id, { role: 'admin' })} title="Promote to Admin" className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                           <Shield className="w-4 h-4" />
                         </button>
                      )}

                      {/* Sub Toggle */}
                      {u.subscription_status === 'premium' ? (
                         <button onClick={() => updateUser(u.id, { subscription_status: 'free' })} title="Revoke Subscription" className="p-2 bg-yellow-100 text-yellow-600 rounded-lg hover:bg-yellow-200 dark:bg-yellow-900/20 dark:hover:bg-yellow-900/40 transition-colors">
                           <XCircle className="w-4 h-4" />
                         </button>
                      ) : (
                         <button onClick={() => updateUser(u.id, { subscription_status: 'premium' })} title="Make Subscriber" className="p-2 bg-muted text-muted-foreground rounded-lg hover:bg-secondary transition-colors">
                           <CheckCircle className="w-4 h-4" />
                         </button>
                      )}

                      {/* Delete User */}
                      <button onClick={() => deleteUser(u.id)} title="Delete User" className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/50 transition-colors ml-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {displayUsers.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground font-medium">
                    No users found in this category.
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
