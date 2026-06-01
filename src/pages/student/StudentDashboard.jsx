/**
 * StudentDashboard — READ ONLY
 *
 * Displays a student's own data:
 *  - Profile card
 *  - Attendance summary
 *  - Exam grades
 *  - Quran / Hifz progress
 *  - Fee / payment history
 *  - Announcements
 *
 * No create / edit / delete controls anywhere on this page.
 * Backend independently enforces read-only access via JWT role check.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  User, ClipboardList, BookMarked, Wallet, Bell,
  CheckCircle, XCircle, Clock, Award, BookOpen, TrendingUp
} from 'lucide-react'

// ─── Tiny helpers ─────────────────────────────────────────────────────────────
function StatBadge({ label, value, color = 'gray' }) {
  const colors = {
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:    'bg-red-50 text-red-700 border-red-200',
    amber:  'bg-amber-50 text-amber-700 border-amber-200',
    blue:   'bg-blue-50 text-blue-700 border-blue-200',
    gray:   'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <div className={`rounded-lg border px-4 py-3 text-center ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs mt-0.5">{label}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={16} className="text-primary-600" />
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuth()
  const orgId = user?.orgId

  const [student,       setStudent]       = useState(null)
  const [attStats,      setAttStats]      = useState(null)
  const [attHistory,    setAttHistory]    = useState([])
  const [grades,        setGrades]        = useState([])
  const [exams,         setExams]         = useState([])
  const [quran,         setQuran]         = useState([])
  const [payments,      setPayments]      = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      // students:getAll is scoped to self by backend JWT check
      const sr = await window.api.students.getAll({ orgId })
      const self = sr.data?.[0] || null
      setStudent(self)

      if (self) {
        const [attS, attH, pmts, ann] = await Promise.all([
          window.api.attendance.getStats({ orgId, studentId: self.id }),
          window.api.attendance.getByStudent({ orgId, studentId: self.id }),
          window.api.finance.getPayments({ orgId, studentId: self.id }),
          window.api.masjid.getAnnouncements({ orgId }),
        ])
        setAttStats(attS.data || null)
        setAttHistory((attH.data || []).slice(0, 30))
        setPayments(pmts.data || [])
        setAnnouncements((ann.data || []).slice(0, 5))

        // Quran progress
        const qr = await window.api.quran.getByStudent({ orgId, studentId: self.id })
        setQuran((qr.data || []).slice(0, 10))

        // Exams for the student's class (backend returns all; frontend shows relevant)
        if (self.class_id) {
          const er = await window.api.exams.getAll({ orgId, classId: self.class_id })
          setExams((er.data || []).slice(0, 5))
        }
      }
    } catch (e) {
      setError('Failed to load your data. Please try again.')
      console.error('[StudentDashboard]', e)
    } finally {
      setLoading(false)
    }
  }, [orgId])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="spinner" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      </div>
    )
  }

  const attRate = attStats
    ? attStats.total > 0
      ? Math.round(((attStats.present + attStats.late) / attStats.total) * 100)
      : 0
    : 0

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
        <User size={13} />
        <span>Student Portal — <strong>View Only</strong>. Contact your teacher or admin to make changes.</span>
      </div>

      {/* Profile card */}
      {student && (
        <div className="card p-5 flex flex-col sm:flex-row gap-4 items-start">
          <div className="w-14 h-14 rounded-2xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <span className="text-2xl font-bold text-primary-700">
              {student.full_name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900">{student.full_name}</h2>
            {student.arabic_name && (
              <p className="text-sm text-gray-500 font-arabic mt-0.5">{student.arabic_name}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
              <span>ID: <strong className="text-gray-700">{student.student_id}</strong></span>
              {student.class_name && <span>Class: <strong className="text-gray-700">{student.class_name}</strong></span>}
              {student.gender && <span>Gender: <strong className="text-gray-700 capitalize">{student.gender}</strong></span>}
              {student.enrolled_date && <span>Enrolled: <strong className="text-gray-700">{student.enrolled_date}</strong></span>}
            </div>
          </div>
          <span className={`badge ${student.status === 'active' ? 'badge-green' : 'badge-gray'} flex-shrink-0`}>
            {student.status}
          </span>
        </div>
      )}

      {/* Attendance summary */}
      {attStats && (
        <div className="card p-5">
          <SectionHeader icon={ClipboardList} title="Attendance Summary" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBadge label="Present"    value={attStats.present} color="green" />
            <StatBadge label="Absent"     value={attStats.absent}  color="red"   />
            <StatBadge label="Late"       value={attStats.late}    color="amber" />
            <StatBadge label="Attendance" value={`${attRate}%`}    color={attRate >= 80 ? 'green' : attRate >= 60 ? 'amber' : 'red'} />
          </div>
          {attHistory.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <table className="table text-xs">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attHistory.slice(0, 10).map(a => (
                    <tr key={a.id}>
                      <td>{a.date}</td>
                      <td>
                        <span className={`badge ${
                          a.status === 'present' ? 'badge-green' :
                          a.status === 'absent'  ? 'badge-red'   :
                          a.status === 'late'    ? 'badge-amber' : 'badge-gray'
                        }`}>{a.status}</span>
                      </td>
                      <td className="text-gray-500">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Quran / Hifz progress */}
      {quran.length > 0 && (
        <div className="card p-5">
          <SectionHeader icon={BookMarked} title="Quran / Hifz Progress" />
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Surah</th>
                  <th>Juz</th>
                  <th>Pages</th>
                  <th>Type</th>
                  <th>Grade</th>
                  <th>Teacher</th>
                </tr>
              </thead>
              <tbody>
                {quran.map(q => (
                  <tr key={q.id}>
                    <td>{q.date}</td>
                    <td>{q.surah_name || '—'}</td>
                    <td>{q.juz_number || '—'}</td>
                    <td>{q.pages || '—'}</td>
                    <td className="capitalize">{q.type}</td>
                    <td>{q.grade ? <span className="badge badge-blue">{q.grade}</span> : '—'}</td>
                    <td>{q.teacher_name || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exams (upcoming and recent) */}
      {exams.length > 0 && (
        <div className="card p-5">
          <SectionHeader icon={BookOpen} title="Exams" />
          <div className="space-y-2">
            {exams.map(e => (
              <div key={e.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {e.subject_name && <span>{e.subject_name} · </span>}
                    {e.exam_date ? e.exam_date : 'Date TBD'}
                  </p>
                </div>
                <span className={`badge ${
                  e.status === 'completed' ? 'badge-green' :
                  e.status === 'scheduled' ? 'badge-blue'  : 'badge-gray'
                }`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fee summary */}
      {payments.length > 0 && (
        <div className="card p-5">
          <SectionHeader icon={Wallet} title="Fee / Payment History" />
          <div className="mb-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <p className="text-xs text-emerald-600">Total Paid</p>
            <p className="text-xl font-bold text-emerald-700">${totalPaid.toFixed(2)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Receipt</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map(p => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td className="font-mono text-[11px]">{p.receipt_number}</td>
                    <td className="capitalize">{p.payment_type?.replace('_', ' ')}</td>
                    <td className="font-semibold">${Number(p.amount).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-amber'}`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="card p-5">
          <SectionHeader icon={Bell} title="Announcements" />
          <div className="space-y-3">
            {announcements.map(a => (
              <div key={a.id} className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-sm font-semibold text-blue-800">{a.title}</p>
                <p className="text-xs text-blue-600 mt-1">{a.content}</p>
                {a.date && <p className="text-[10px] text-blue-400 mt-1">{a.date}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {!student && !loading && (
        <div className="card p-8 text-center text-gray-400">
          <User size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No student record linked to your account.</p>
          <p className="text-xs mt-1">Please contact your administrator.</p>
        </div>
      )}
    </div>
  )
}
