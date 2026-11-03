import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  XCircle,
  CheckCircle,
  Search,
  Calendar,
  User,
  BookOpen,
  Eye,
  Filter,
  Download,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { adminAPI } from '../services/api';

export default function QuizResults() {
  const [attempts, setAttempts] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, passed, failed
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [attemptsRes, statsRes] = await Promise.all([
        adminAPI.getQuizAttempts({ limit: 100 }),
        adminAPI.getQuizStats(),
      ]);

      setAttempts(attemptsRes.data?.data?.attempts || []);
      setStats(statsRes.data?.data || null);
    } catch (err) {
      console.error('Error fetching quiz results:', err);
      alert('Failed to load quiz results');
    } finally {
      setLoading(false);
    }
  };

  const viewAttemptDetail = async (attemptId) => {
    try {
      const res = await adminAPI.getQuizAttemptDetail(attemptId);
      setSelectedAttempt(res.data?.data?.attempt || null);
      setShowDetailModal(true);
    } catch (err) {
      console.error('Error fetching attempt detail:', err);
      alert('Failed to load attempt details');
    }
  };

  const filteredAttempts = attempts.filter((attempt) => {
    // Status filter
    if (filterStatus === 'passed' && !attempt.isPassed) return false;
    if (filterStatus === 'failed' && attempt.isPassed) return false;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const studentName = attempt.studentId?.name?.toLowerCase() || '';
      const studentEmail = attempt.studentId?.email?.toLowerCase() || '';
      const lectureName = attempt.lecture?.title?.toLowerCase() || '';
      const courseName = attempt.course?.title?.toLowerCase() || '';

      return (
        studentName.includes(search) ||
        studentEmail.includes(search) ||
        lectureName.includes(search) ||
        courseName.includes(search)
      );
    }

    return true;
  });

  const exportToCSV = () => {
    const headers = [
      'Student Name',
      'Email',
      'Course',
      'Module',
      'Lecture',
      'Quiz',
      'Score',
      'Status',
      'Attempt',
      'Date',
    ];

    const rows = filteredAttempts.map((attempt) => [
      attempt.studentId?.name || 'N/A',
      attempt.studentId?.email || 'N/A',
      attempt.course?.title || 'N/A',
      attempt.module?.title || 'N/A',
      attempt.lecture?.title || 'N/A',
      attempt.quizId?.title || 'N/A',
      `${attempt.score}%`,
      attempt.isPassed ? 'Passed' : 'Failed',
      `#${attempt.attemptNumber || 1}`,
      new Date(attempt.createdAt).toLocaleDateString(),
    ]);

    const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quiz-results-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-slate-600">Loading quiz results...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 style={{ color: '#818cf8' }} />
            Quiz Results & Analytics
          </h2>
          <p className="mt-1" style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Track student quiz performance and attempts
          </p>
        </div>
        <button
          onClick={exportToCSV}
          className="flex items-center gap-2 px-4 py-2 text-white font-semibold rounded-lg transition"
          style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
        >
          <Download size={18} />
          Export CSV
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Total Attempts</span>
              <Trophy style={{ color: '#818cf8' }} size={24} />
            </div>
            <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{stats.totalAttempts}</div>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(16,185,129,0.3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Passed</span>
              <CheckCircle className="text-green-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-green-500">{stats.passedAttempts}</div>
            <div className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>{stats.passRate}% pass rate</div>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(239,68,68,0.3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Failed</span>
              <XCircle className="text-red-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-red-500">{stats.failedAttempts}</div>
          </div>

          <div className="rounded-xl p-6 border" style={{ background: 'var(--bg-card)', borderColor: 'rgba(59,130,246,0.3)' }}>
            <div className="flex items-center justify-between mb-2">
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Avg Score</span>
              <TrendingUp className="text-blue-500" size={24} />
            </div>
            <div className="text-3xl font-bold text-blue-500">{stats.avgScore}%</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 z-10" style={{ color: 'var(--text-tertiary)' }} size={20} />
            <input
              type="text"
              placeholder="Search by student, email, course, or lecture..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg outline-none border"
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                borderColor: 'var(--border-primary)',
                color: 'var(--text-primary)'
              }}
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter size={20} style={{ color: 'var(--text-tertiary)' }} />
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-4 pr-10 py-2.5 rounded-lg cursor-pointer font-medium outline-none border"
                style={{ 
                  minWidth: '180px',
                  background: 'rgba(255,255,255,0.05)',
                  borderColor: 'var(--border-primary)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="all">All Attempts</option>
                <option value="passed">Passed Only</option>
                <option value="failed">Failed Only</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="rounded-xl overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-primary)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-primary)' }}>
              <tr>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Student</th>
                <th className="text-left p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Course/Lecture</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Score</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Status</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Attempt</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Date</th>
                <th className="text-center p-4 font-semibold" style={{ color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8" style={{ color: 'var(--text-tertiary)' }}>
                    No quiz attempts found
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt) => (
                  <tr key={attempt._id} className="transition hover:bg-white/5" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <User style={{ color: 'var(--text-tertiary)' }} size={18} />
                        <div>
                          <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {attempt.studentId?.name || 'N/A'}
                          </div>
                          <div className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                            {attempt.studentId?.email || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-start gap-2">
                        <BookOpen style={{ color: '#818cf8' }} className="shrink-0 mt-1" size={18} />
                        <div className="min-w-0">
                          <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {attempt.course?.title || 'N/A'}
                          </div>
                          <div className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                            {attempt.lecture?.title || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{attempt.score}%</div>
                    </td>
                    <td className="p-4 text-center">
                      {attempt.isPassed ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
                          <CheckCircle size={14} />
                          Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold" style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444' }}>
                          <XCircle size={14} />
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>
                        #{attempt.attemptNumber || 1}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                        <Calendar size={14} />
                        {new Date(attempt.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => viewAttemptDetail(attempt._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-white rounded-lg transition text-sm font-semibold"
                        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {showDetailModal && selectedAttempt && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6"
            >
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-slate-900">Quiz Attempt Details</h3>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition"
                >
                  ✕
                </button>
              </div>

              {/* Student Info */}
              <div className="bg-slate-50 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-slate-900 mb-3">Student Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-600 text-sm">Name:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.studentId?.name}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Email:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.studentId?.email}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">School:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.studentId?.schoolName || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">City:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.studentId?.city || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quiz Info */}
              <div className="bg-indigo-50 rounded-xl p-4 mb-6">
                <h4 className="font-bold text-slate-900 mb-3">Quiz Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-600 text-sm">Course:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.course?.title}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Module:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.module?.title}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Lecture:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.lecture?.title}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Quiz:</span>
                    <div className="font-semibold text-slate-900">
                      {selectedAttempt.quizId?.title}
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div
                className={`rounded-xl p-4 mb-6 ${
                  selectedAttempt.isPassed
                    ? 'bg-green-50 border-2 border-green-200'
                    : 'bg-red-50 border-2 border-red-200'
                }`}
              >
                <h4 className="font-bold text-slate-900 mb-3">Results</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-slate-600 text-sm">Score:</span>
                    <div className="text-2xl font-bold text-slate-900">
                      {selectedAttempt.score}%
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Status:</span>
                    <div
                      className={`text-lg font-bold ${
                        selectedAttempt.isPassed ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {selectedAttempt.isPassed ? 'Passed ✓' : 'Failed ✗'}
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-600 text-sm">Attempt:</span>
                    <div className="text-lg font-bold text-slate-900">
                      #{selectedAttempt.attemptNumber || 1}
                    </div>
                  </div>
                </div>
              </div>

              {/* Answers */}
              {selectedAttempt.answers && selectedAttempt.answers.length > 0 && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-3">Answers Given</h4>
                  <div className="space-y-2">
                    {selectedAttempt.answers.map((answer, idx) => (
                      <div
                        key={idx}
                        className="p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <span className="font-semibold text-slate-700">Q{idx + 1}:</span>{' '}
                        <span className="text-slate-900">
                          Option {answer !== null ? answer + 1 : 'Not answered'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="px-6 py-2 bg-slate-200 text-slate-900 font-semibold rounded-lg hover:bg-slate-300 transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
