import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, RefreshCw, Loader2, Mail, User, Phone, KeyRound } from 'lucide-react'
import api from '../services/api'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const PreRegisteredStudents = ({ showToast }) => {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newStudent, setNewStudent] = useState({ name: '', email: '', phone: '', schoolName: '', schoolPassword: '' })
  const [statusFilter, setStatusFilter] = useState('all')

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const res = await api.get('/admin/pre-registered', { params: { status: statusFilter } })
      setStudents(res.data.data.students || [])
    } catch (err) {
      console.error('Error fetching pre-registered students:', err)
      showToast(err.response?.data?.error?.message || 'Failed to load students', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [statusFilter])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newStudent.name.trim() || !newStudent.email.trim() || !newStudent.schoolPassword.trim()) {
      showToast('Name, email, and school password are required', 'error')
      return
    }

    setCreating(true)
    try {
      await api.post('/admin/pre-register', newStudent)
      setNewStudent({ name: '', email: '', phone: '', schoolName: '', schoolPassword: '' })
      fetchStudents()
      showToast('Student pre-registered successfully!', 'success')
    } catch (err) {
      console.error('Error pre-registering student:', err)
      showToast(err?.response?.data?.error?.message || 'Failed to pre-register student', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete pre-registration for "${name}"?`)) return
    try {
      await api.delete(`/admin/pre-registered/${id}`)
      setStudents(prev => prev.filter(s => s._id !== id))
      showToast('Pre-registration deleted', 'success')
    } catch (err) {
      console.error('Error deleting pre-registration:', err)
      showToast('Failed to delete pre-registration', 'error')
    }
  }

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let password = ''
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewStudent(prev => ({ ...prev, schoolPassword: password }))
  }

  return (
    <div>
      {/* Create New Pre-Registration Form */}
      <div style={{
        borderRadius: 18,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#10b981,#059669,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(16,185,129,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <Plus size={18} color="#10b981" />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Pre-Register Student</span>
        </div>
        <form onSubmit={handleCreate} style={{ padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                Student Name *
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Enter student name"
                  value={newStudent.name}
                  onChange={e => setNewStudent(p => ({ ...p, name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                Email *
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="email"
                  placeholder="student@email.com"
                  value={newStudent.email}
                  onChange={e => setNewStudent(p => ({ ...p, email: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                Phone (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="Phone number"
                  value={newStudent.phone}
                  onChange={e => setNewStudent(p => ({ ...p, phone: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                School Code (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  type="text"
                  placeholder="School code"
                  value={newStudent.schoolName}
                  onChange={e => setNewStudent(p => ({ ...p, schoolName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '10px 14px 10px 38px',
                    borderRadius: 10,
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid var(--border-primary)',
                    color: 'var(--text-primary)',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: 12, marginBottom: 6, fontWeight: 600 }}>
                School Password *
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <KeyRound size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  <input
                    type="text"
                    placeholder="School password"
                    value={newStudent.schoolPassword}
                    onChange={e => setNewStudent(p => ({ ...p, schoolPassword: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border-primary)',
                      color: 'var(--text-primary)',
                      fontSize: 14,
                      outline: 'none'
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={generateRandomPassword}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    border: '1px solid rgba(16,185,129,0.3)',
                    background: 'rgba(16,185,129,0.1)',
                    color: '#10b981',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
          <motion.button
            type="submit"
            disabled={creating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              color: 'var(--text-primary)',
              cursor: creating ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              opacity: creating ? 0.6 : 1
            }}
          >
            {creating ? (
              <>
                <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                Creating...
              </>
            ) : (
              <>
                <Plus size={16} />
                Pre-Register Student
              </>
            )}
          </motion.button>
        </form>
      </div>

      {/* Students List - Table Format */}
      <div style={{
        borderRadius: 18,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        backdropFilter: 'blur(20px)',
        overflow: 'hidden'
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#6366f1,#8b5cf6,transparent)' }} />
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(99,102,241,0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="#818cf8" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Pre-Registered Students</span>
            {students.length > 0 && (
              <span style={{
                background: 'rgba(99,102,241,0.2)',
                color: '#818cf8',
                borderRadius: 99,
                padding: '2px 10px',
                fontSize: 11,
                fontWeight: 700
              }}>
                {students.length}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid var(--border-primary)',
                color: '#a5b4fc',
                fontSize: 12,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All</option>
              <option value="unused">Unused</option>
              <option value="used">Used</option>
            </select>
            <button
              onClick={fetchStudents}
              style={{
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                color: '#a5b4fc',
                cursor: 'pointer',
                padding: '6px 10px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
        <div style={{ padding: '16px', maxHeight: 600, overflowY: 'auto', overflowX: 'auto' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Loader2 size={28} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <Users size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No pre-registered students</p>
              <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>
                Create a pre-registration above to get started
              </p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
              <thead>
                <tr style={{ background: 'rgba(99,102,241,0.1)', borderRadius: 8 }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                    Student Name
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Email
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Phone
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    School Code
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Password
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Status
                  </th>
                  <th style={{ padding: '12px 16px', textAlign: 'center', color: 'rgba(99,102,241,0.9)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, i) => (
                  <motion.tr
                    key={student._id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      background: student.isUsed ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.03)',
                      border: student.isUsed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(99,102,241,0.1)'
                    }}
                  >
                    <td style={{ padding: '14px 16px', color: 'var(--text-primary)', fontSize: 13, fontWeight: 600, borderTopLeftRadius: 8, borderBottomLeftRadius: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                          {student.name[0]?.toUpperCase()}
                        </div>
                        <span>{student.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {student.email}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {student.phone || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>
                      {student.schoolName || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b', padding: '4px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, fontFamily: 'monospace', border: '1px solid rgba(245,158,11,0.3)', display: 'inline-block' }}>
                        {student.schoolPassword}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      {student.isUsed ? (
                        <span style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, display: 'inline-block' }}>
                          ✓ USED
                        </span>
                      ) : (
                        <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 700, display: 'inline-block' }}>
                          PENDING
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center', borderTopRightRadius: 8, borderBottomRightRadius: 8 }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                        <button
                          onClick={() => handleDelete(student._id, student.name)}
                          style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.12)', color: '#f87171', cursor: 'pointer', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export { PreRegisteredStudents as default }
