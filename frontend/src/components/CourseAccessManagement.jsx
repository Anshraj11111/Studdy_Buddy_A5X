import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, CheckCircle, XCircle, RefreshCw, Loader2, Search, GraduationCap, Crown, CreditCard } from 'lucide-react';
import api from '../services/api';

const CourseAccessManagement = ({ showToast }) => {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [filter, setFilter] = useState('all'); // all, with, without
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [schools, setSchools] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('all');

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/course-access/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Error fetching course access stats:', err);
    }
  };

  const fetchSchools = async () => {
    try {
      const res = await api.get('/admin/course-access/schools');
      setSchools(res.data.data.schools || []);
    } catch (err) {
      console.error('Error fetching schools:', err);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const params = { filter, page, limit: 20 };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (selectedSchool !== 'all') params.schoolName = selectedSchool;
      
      const res = await api.get('/admin/course-access/list', { params });
      setStudents(res.data.data.students || []);
      setTotal(res.data.data.total || 0);
    } catch (err) {
      console.error('Error fetching students:', err);
      showToast(err.response?.data?.error?.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchSchools();
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [filter, page, selectedSchool]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchStudents();
  };

  const getAccessBadge = (student) => {
    if (!student.hasAccess) {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: 'rgba(239,68,68,0.15)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#f87171'
        }}>
          <XCircle size={12} /> No Access
        </span>
      );
    }

    const accessType = student.accessType;
    if (accessType === 'School Code') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: 'rgba(52,211,153,0.15)',
          border: '1px solid rgba(52,211,153,0.3)',
          color: '#34d399'
        }}>
          <GraduationCap size={12} /> School
        </span>
      );
    } else if (accessType === 'Premium') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: 'rgba(251,191,36,0.15)',
          border: '1px solid rgba(251,191,36,0.3)',
          color: '#fbbf24'
        }}>
          <Crown size={12} /> Premium
        </span>
      );
    } else if (accessType === 'Paid Courses') {
      return (
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '4px 10px',
          borderRadius: 8,
          fontSize: 11,
          fontWeight: 600,
          background: 'rgba(99,102,241,0.15)',
          border: '1px solid rgba(99,102,241,0.3)',
          color: '#818cf8'
        }}>
          <CreditCard size={12} /> Paid ({student.paidCoursesCount})
        </span>
      );
    }
  };

  return (
    <div>
      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(52,211,153,0.15), rgba(16,185,129,0.1))',
              border: '1px solid rgba(52,211,153,0.3)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <CheckCircle size={24} color="#34d399" />
              <span style={{ fontSize: 32, fontWeight: 700, color: '#34d399' }}>{stats.withAccess}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>With Access</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 4 }}>
              {Math.round((stats.withAccess / stats.total) * 100)}% of total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            style={{
              borderRadius: 18,
              background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1))',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: 20,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <XCircle size={24} color="#f87171" />
              <span style={{ fontSize: 32, fontWeight: 700, color: '#f87171' }}>{stats.withoutAccess}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, fontWeight: 600 }}>Without Access</p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 4 }}>
              {Math.round((stats.withoutAccess / stats.total) * 100)}% of total
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            style={{
              borderRadius: 18,
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-secondary)',
              padding: 20,
            }}
          >
            <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>Access Breakdown</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div 
                onClick={() => { setFilter('school'); setPage(1); }}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(52,211,153,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>🎓 School Code</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#34d399' }}>{stats.breakdown.school}</span>
              </div>
              <div 
                onClick={() => { setFilter('premium'); setPage(1); }}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(251,191,36,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>👑 Premium</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#fbbf24' }}>{stats.breakdown.premium}</span>
              </div>
              <div 
                onClick={() => { setFilter('paid'); setPage(1); }}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>💳 Paid Courses</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#818cf8' }}>{stats.breakdown.paid}</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Filter and Search */}
      <div style={{
        borderRadius: 18,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        overflow: 'hidden',
        marginBottom: 24
      }}>
        <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#818cf8,#a78bfa,transparent)' }} />
        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Users size={18} color="#818cf8" />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 15 }}>Course Access</span>
            {total > 0 && <span style={{ background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 99, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{total}</span>}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <select
              value={selectedSchool}
              onChange={e => { setSelectedSchool(e.target.value); setPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(52,211,153,0.15)',
                border: '1px solid rgba(52,211,153,0.3)',
                color: '#34d399',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all" style={{ background: '#1e293b', color: '#e0e7ff' }}>All Schools</option>
              {schools.map(school => (
                <option key={school} value={school} style={{ background: '#1e293b', color: '#e0e7ff' }}>
                  {school}
                </option>
              ))}
            </select>
            <select
              value={filter}
              onChange={e => { setFilter(e.target.value); setPage(1); }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'rgba(99,102,241,0.15)',
                border: '1px solid var(--border-primary)',
                color: '#e0e7ff',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all" style={{ background: '#1e293b' }}>All Students</option>
              <option value="with" style={{ background: '#1e293b' }}>With Access</option>
              <option value="without" style={{ background: '#1e293b' }}>Without Access</option>
              <option value="school" style={{ background: '#1e293b' }}>🎓 School Code Only</option>
              <option value="premium" style={{ background: '#1e293b' }}>👑 Premium Only</option>
              <option value="paid" style={{ background: '#1e293b' }}>💳 Paid Courses Only</option>
            </select>
            <button
              onClick={() => { fetchStats(); fetchStudents(); fetchSchools(); }}
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

        <form onSubmit={handleSearch} style={{ padding: '0 20px 16px', display: 'flex', gap: 8 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 14px 8px 38px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-primary)',
                color: 'var(--text-primary)',
                fontSize: 13,
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
              border: 'none',
              color: 'white',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Search
          </button>
        </form>
      </div>

      {/* Students Table */}
      <div style={{
        borderRadius: 18,
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-secondary)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={28} style={{ color: '#818cf8', animation: 'spin 1s linear infinite' }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Users size={48} style={{ color: 'rgba(148,163,184,0.3)', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>No students found</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.1)', borderBottom: '1px solid var(--border-primary)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>STUDENT</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>EMAIL</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>ACCESS</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>SCHOOL</th>
                <th style={{ padding: '12px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>JOINED</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student, index) => (
                <tr
                  key={student._id}
                  style={{
                    borderBottom: index < students.length - 1 ? '1px solid var(--border-primary)' : 'none',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg,#818cf8,#a78bfa)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 700,
                        fontSize: 13
                      }}>
                        {student.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--text-primary)', fontSize: 13, fontWeight: 600 }}>{student.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{student.email}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {getAccessBadge(student)}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{student.schoolName}</td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 11 }}>
                    {new Date(student.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && students.length > 0 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
              Showing {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} of {total}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: page === 1 ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
                  border: '1px solid var(--border-primary)',
                  color: page === 1 ? 'var(--text-tertiary)' : '#a5b4fc',
                  fontSize: 12,
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * 20 >= total}
                style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: page * 20 >= total ? 'rgba(255,255,255,0.05)' : 'rgba(99,102,241,0.15)',
                  border: '1px solid var(--border-primary)',
                  color: page * 20 >= total ? 'var(--text-tertiary)' : '#a5b4fc',
                  fontSize: 12,
                  cursor: page * 20 >= total ? 'not-allowed' : 'pointer'
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourseAccessManagement;
