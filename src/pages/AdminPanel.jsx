import { useState, useEffect, useCallback } from 'react'
import { adminAPI } from '../services/api'

const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || 'StuddyAdmin@2025'

export default function AdminPanel() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem('admin_auth') === 'true')
  const [pw, setPw] = useState('')
  const [pwErr, setPwErr] = useState('')

  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('all')       // all | student | mentor
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogin = (e) => {
    e.preventDefault()
    if (pw === ADMIN_SECRET) {
      sessionStorage.setItem('admin_auth', 'true')
      setAuthed(true)
    } else {
      setPwErr('Wrong password')
    }
  }

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const role = tab === 'all' ? undefined : tab
      const [statsRes, usersRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getUsers({ role, search, page, limit: 20 }),
      ])
      setStats(statsRes.data.data)
      setUsers(usersRes.data.data.users)
      setTotal(usersRes.data.data.total)
    } catch (err) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error?.message || err.message
      if (status === 401) {
        showToast('Backend rejected admin secret — check ADMIN_SECRET env var on Render', 'error')
      } else {
        showToast(`Failed to load data: ${msg}`, 'error')
      }
      console.error('Admin fetch error:', err?.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }, [tab, search, page])

  useEffect(() => {
    if (authed) fetchData()
  }, [authed, fetchData])

  const handleToggle = async (id) => {
    setActionLoading(id + '_toggle')
    try {
      const res = await adminAPI.toggleUser(id)
      const updated = res.data.data.user
      setUsers(prev => prev.map(u => u._id === id ? { ...u, isActive: updated.isActive } : u))
      showToast(`User ${updated.isActive ? 'activated' : 'deactivated'}`)
    } catch {
      showToast('Action failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This cannot be undone.`)) return
    setActionLoading(id + '_delete')
    try {
      await adminAPI.deleteUser(id)
      setUsers(prev => prev.filter(u => u._id !== id))
      setTotal(t => t - 1)
      showToast('User deleted')
    } catch {
      showToast('Delete failed', 'error')
    } finally {
      setActionLoading(null)
    }
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <form onSubmit={handleLogin} className="bg-gray-900 border border-gray-700 rounded-2xl p-8 w-full max-w-sm shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-3xl mb-2"></div>
            <h1 className="text-xl font-bold text-white">Admin Access</h1>
            <p className="text-gray-400 text-sm mt-1">Studdy Buddy Admin Panel</p>
          </div>
          <input
            type="password"
            placeholder="Enter admin password"
            value={pw}
            onChange={e => { setPw(e.target.value); setPwErr('') }}
            className="w-full bg-gray-800 border border-gray-600 text-white rounded-lg px-4 py-3 mb-3 focus:outline-none focus:border-blue-500"
            autoFocus
          />
          {pwErr && <p className="text-red-400 text-sm mb-3">{pwErr}</p>}
          <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
            Login
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl"></span>
          <div>
            <h1 className="text-lg font-bold">Admin Panel</h1>
            <p className="text-gray-400 text-xs">Studdy Buddy</p>
          </div>
        </div>
        <button
          onClick={() => { sessionStorage.removeItem('admin_auth'); setAuthed(false) }}
          className="text-gray-400 hover:text-red-400 text-sm transition"
        >
          Logout
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {[
              { label: 'Total Users', value: stats.totalUsers, icon: '' },
              { label: 'Students', value: stats.totalStudents, icon: '' },
              { label: 'Mentors', value: stats.totalMentors, icon: '' },
              { label: 'Doubts', value: stats.totalDoubts, icon: '' },
              { label: 'Resources', value: stats.totalResources, icon: '' },
            ].map(s => (
              <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-gray-400 text-xs mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex gap-2">
            {['all', 'student', 'mentor'].map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1) }}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-blue-500"
          />
          <button onClick={fetchData} className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg text-sm transition">
            Refresh
          </button>
        </div>

        {/* Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">User</th>
                    <th className="text-left px-4 py-3">Role</th>
                    <th className="text-left px-4 py-3">XP</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Joined</th>
                    <th className="text-left px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-10 text-gray-500">No users found</td></tr>
                  ) : users.map(u => (
                    <tr key={u._id} className="border-b border-gray-800 hover:bg-gray-800/50 transition">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {u.profileImage ? (
                            <img src={u.profileImage} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold">
                              {u.name?.[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-white">{u.name}</div>
                            <div className="text-gray-400 text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'mentor' ? 'bg-purple-900/50 text-purple-300' : 'bg-blue-900/50 text-blue-300'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-yellow-400 font-medium">{u.xp ?? 0}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.isActive !== false ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                          {u.isActive !== false ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggle(u._id)}
                            disabled={actionLoading === u._id + '_toggle'}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition ${u.isActive !== false ? 'bg-orange-900/50 text-orange-300 hover:bg-orange-800/50' : 'bg-green-900/50 text-green-300 hover:bg-green-800/50'} disabled:opacity-50`}
                          >
                            {actionLoading === u._id + '_toggle' ? '...' : (u.isActive !== false ? 'Deactivate' : 'Activate')}
                          </button>
                          <button
                            onClick={() => handleDelete(u._id, u.name)}
                            disabled={actionLoading === u._id + '_delete'}
                            className="px-3 py-1 rounded-lg text-xs font-medium bg-red-900/50 text-red-300 hover:bg-red-800/50 transition disabled:opacity-50"
                          >
                            {actionLoading === u._id + '_delete' ? '...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > 20 && (
          <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
            <span>Showing {Math.min((page - 1) * 20 + 1, total)}{Math.min(page * 20, total)} of {total}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition">Prev</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page * 20 >= total} className="px-3 py-1 bg-gray-800 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition">Next</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
