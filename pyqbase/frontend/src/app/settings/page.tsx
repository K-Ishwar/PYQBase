'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { useQuery, useMutation } from '@tanstack/react-query'

interface ProfileData {
  id: string
  email: string
  subscription_status: string
  deleted_at: string | null
  reactivation_deadline: string | null
}

export default function SettingsPage() {
  const router = useRouter()
  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [exportRequested, setExportRequested] = useState(false)

  const { data: profile, isLoading } = useQuery<ProfileData>({
    queryKey: ['account', 'me'],
    queryFn: async () => {
      const res = await apiClient('/api/v1/account/me')
      if (!res.ok) throw new Error('Failed to load profile')
      return res.json()
    },
  })

  const reactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient('/api/v1/account/reactivate', { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Reactivation failed')
      }
      return res.json()
    },
    onSuccess: () => router.refresh(),
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient('/api/v1/account', { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Deletion failed')
      }
      return res.json()
    },
    onSuccess: () => {
      setShowDeleteModal(false)
      router.refresh()
    },
  })

  const exportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient('/api/v1/account/export')
      if (!res.ok) throw new Error('Export request failed')
      return res.json()
    },
    onSuccess: () => setExportRequested(true),
  })

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // ── Reactivation Banner ────────────────────────────────────────────────────
  if (profile?.deleted_at) {
    const deadline = profile.reactivation_deadline
      ? new Date(profile.reactivation_deadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : 'soon'

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center space-y-5">
          <div className="text-5xl">⚠️</div>
          <h1 className="text-2xl font-bold text-destructive">Account Scheduled for Deletion</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account is scheduled for permanent deletion. All your data will be erased
            after <strong>{deadline}</strong>. You can reactivate your account now.
          </p>
          <button
            onClick={() => reactivateMutation.mutate()}
            disabled={reactivateMutation.isPending}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {reactivateMutation.isPending ? 'Reactivating…' : 'Reactivate My Account'}
          </button>
          {reactivateMutation.isError && (
            <p className="text-destructive text-sm">{(reactivateMutation.error as Error).message}</p>
          )}
        </div>
      </div>
    )
  }

  // ── Normal Settings Page ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-8">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your account and data</p>
        </div>

        {/* Profile Info */}
        <section className="rounded-2xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Profile</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{profile?.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium capitalize">{profile?.subscription_status || 'Free'}</p>
            </div>
          </div>
        </section>

        {/* Data Export (LC-04 / DPDP) */}
        <section className="rounded-2xl border bg-card p-6 space-y-4">
          <h2 className="font-semibold text-lg">Data Export</h2>
          <p className="text-sm text-muted-foreground">
            Download a full JSON export of your quiz attempts, SRS history, and mock tests.
            As required by the DPDP Act 2023, we will email it within 72 hours.
          </p>
          {exportRequested ? (
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 p-3 text-sm">
              ✓ Export requested! Check your email within 72 hours.
            </div>
          ) : (
            <button
              id="request-export-btn"
              onClick={() => exportMutation.mutate()}
              disabled={exportMutation.isPending}
              className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-60"
            >
              {exportMutation.isPending ? 'Requesting…' : 'Request Data Export'}
            </button>
          )}
        </section>

        {/* Delete Account (FR-01.4) */}
        <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
          <h2 className="font-semibold text-lg text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground">
            Deleting your account will schedule all your data for permanent removal after 30 days.
            You may reactivate within that window by logging back in.
          </p>
          <button
            id="delete-account-btn"
            onClick={() => setShowDeleteModal(true)}
            className="rounded-lg bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium hover:bg-destructive/90 transition-colors"
          >
            Delete Account
          </button>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-card border p-6 space-y-5 shadow-xl">
            <h2 className="text-xl font-bold text-destructive">Confirm Account Deletion</h2>
            <p className="text-sm text-muted-foreground">
              Type <strong>DELETE</strong> to confirm. Your data will be permanently erased after 30 days.
            </p>
            <input
              id="delete-confirm-input"
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-destructive"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirm('') }}
                className="flex-1 rounded-lg border py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                id="delete-confirm-btn"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteConfirm !== 'DELETE' || deleteMutation.isPending}
                className="flex-1 rounded-lg bg-destructive text-destructive-foreground py-2 text-sm font-medium hover:bg-destructive/90 transition-colors disabled:opacity-40"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, Delete My Account'}
              </button>
            </div>
            {deleteMutation.isError && (
              <p className="text-destructive text-sm">{(deleteMutation.error as Error).message}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
