'use client'

import React, { useState, useEffect } from 'react'
import { User, Snowflake, Trash2, Shield, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react'
import { useSession } from 'next-auth/react'

interface UserItem {
  id: string
  name: string | null
  email: string
  role: 'user' | 'admin'
  is_frozen: boolean
  created_at: string
}

export default function UserManager() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ text: string; isError?: boolean } | null>(null)

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/users')
      if (!res.ok) throw new Error('Failed to fetch users')
      const data = await res.json()
      setUsers(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setMessage({ text: e.message || 'Error loading users', isError: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleToggleFreeze = async (user: UserItem) => {
    try {
      setActionLoading(user.id)
      setMessage(null)
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, isFrozen: !user.is_frozen }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_frozen: !u.is_frozen } : u))
      )
      setMessage({ text: `User ${user.email} is now ${!user.is_frozen ? 'frozen' : 'active'}` })
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to update user', isError: true })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`Are you sure you want to permanently delete ${user.email}?`)) return
    try {
      setActionLoading(user.id)
      setMessage(null)
      const res = await fetch(`/api/admin/users?userId=${encodeURIComponent(user.id)}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setMessage({ text: `User ${user.email} deleted successfully` })
    } catch (e: any) {
      setMessage({ text: e.message || 'Failed to delete user', isError: true })
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <User className="w-5 h-5 text-neutral-900" />
            User & Access Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Administer registered users, freeze or suspend accounts, and remove users.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 p-3.5 rounded-xl border text-sm ${
            message.isError
              ? 'bg-neutral-100 border-neutral-300 text-neutral-900'
              : 'bg-neutral-50 border-neutral-200 text-neutral-900'
          }`}
        >
          {message.isError ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isSelf = u.id === session?.user?.id
                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{u.name || 'Unnamed'}</div>
                        <div className="text-xs text-slate-400 font-mono">{u.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          u.role === 'admin' ? 'bg-neutral-900 text-white' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role === 'admin' && <Shield className="w-3 h-3" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {u.is_frozen ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-200 text-neutral-800">
                            <Snowflake className="w-3 h-3" />
                            Frozen
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isSelf && (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleToggleFreeze(u)}
                              disabled={actionLoading === u.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                                u.is_frozen
                                  ? 'border-neutral-300 bg-neutral-900 text-white hover:bg-neutral-800'
                                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-800'
                              }`}
                            >
                              {u.is_frozen ? 'Unfreeze' : 'Freeze'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u)}
                              disabled={actionLoading === u.id}
                              className="p-1.5 rounded-lg border border-neutral-200 hover:bg-neutral-100 text-neutral-700 transition-all"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
