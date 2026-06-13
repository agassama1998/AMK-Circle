/**
 * ParentDashboard — READ ONLY
 *
 * Displays a parent's linked children and their data:
 *  - Children list / selector
 *  - Per-child: profile, attendance, grades, Quran progress, payments
 *  - Announcements
 *
 * No create / edit / delete controls anywhere on this page.
 * Backend independently enforces read-only + child-scoped access via JWT.
 */
import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import {
  Heart, ClipboardList, BookMarked, Wallet, Bell,
  User, ChevronRight, BookOpen
} from 'lucide-react'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function StatBadge({ label, value, color = 'gray' }) {
  const colors = {
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    red:   'bg-red-50 text-red-700 border-red-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
    gray:  'bg-gray-50 text-gray-700 border-gray-200',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${colors[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-[11px] mt-0.5">{label}</p>
    </div>
  )
}

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={15} className="text-primary-600" />
      <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
    </div>
  )
}

// ─── Per-child data panel ─────────────────────────────────────────────────────
function ChildPanel({ child, orgId }) {
  const { currencySymbol } = useSettings()
  const [attStats,   setAttStats]   = useState(null)
  const [attHistory, setAttHistory] = useState([])
  const [payments,   setPayments]   = useState([])
  const [quran,      setQuran]      = useState([])
  const [exams,      setExams]      = useState([])
  const [loaded,     setLoaded]     = useState(false)

  useEffect(() => {
    if (!child || !orgId) return
    let cancelled = false
    ;(async () => {
      const [attS, attH, pmts, qr] = await Promise.all([
        window.api.attendance.getStats({ orgId, studentId: child.id }),
        window.api.attendance.getByStudent({ orgId, studentId: child.id }),
        window.api.finance.getPayments({ orgId, studentId: child.id }),
        window.api.quran.getByStudent({ orgId, studentId: child.id }),
      ])
      if (cancelled) return
      setAttStats(attS.data || null)
      setAttHistory((attH.data || []).slice(0, 10))
      setPayments((pmts.data || []).slice(0, 8))
      setQuran((qr.data || []).slice(0, 8))

      if (child.class_id) {
        const er = await window.api.exams.getAll({ orgId, classId: child.class_id })
        if (!cancelled) setExams((er.data || []).slice(0, 5))
      }
      if (!cancelled) setLoaded(true)
    })()
    return () => { cancelled = true }
  }, [child, orgId])

  if (!loaded) {
    return (
      <div className="flex justify-center py-8">
        <div className="spinner" />
      </div>
    )
  }

  const attRate = attStats && attStats.total > 0
    ? Math.round(((attStats.present + attStats.late) / attStats.total) * 100)
    : 0

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + (p.amount || 0), 0)

  return (
    <div className="space-y-5 mt-4">
      {/* Attendance */}
      {attStats && (
        <div className="card p-4">
          <SectionHeader icon={ClipboardList} title="Attendance" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <StatBadge label="Present"    value={attStats.present} color="green" />
            <StatBadge label="Absent"     value={attStats.absent}  color="red"   />
            <StatBadge label="Late"       value={attStats.late}    color="amber" />
            <StatBadge label="Rate"       value={`${attRate}%`}    color={attRate >= 80 ? 'green' : attRate >= 60 ? 'amber' : 'red'} />
          </div>
          {attHistory.length > 0 && (
            <div className="mt-3 overflow-x-auto">
              <table className="table text-xs">
                <thead><tr><th>Date</th><th>Status</th><th>Notes</th></tr></thead>
                <tbody>
                  {attHistory.map(a => (
                    <tr key={a.id}>
                      <td>{a.date}</td>
                      <td>
                        <span className={`badge ${
                          a.status === 'present' ? 'badge-green' :
                          a.status === 'absent'  ? 'badge-red'   :
                          a.status === 'late'    ? 'badge-amber' : 'badge-gray'
                        }`}>{a.status}</span>
                      </td>
                      <td className="text-gray-400">{a.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Exams */}
      {exams.length > 0 && (
        <div className="card p-4">
          <SectionHeader icon={BookOpen} title="Exams" />
          <div className="space-y-2">
            {exams.map(e => (
              <div key={e.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-800">{e.name}</p>
                  <p className="text-xs text-gray-500">{e.subject_name} · {e.exam_date || 'TBD'}</p>
                </div>
                <span className={`badge ${e.status === 'completed' ? 'badge-green' : 'badge-blue'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quran progress */}
      {quran.length > 0 && (
        <div className="card p-4">
          <SectionHeader icon={BookMarked} title="Quran / Hifz Progress" />
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead><tr><th>Date</th><th>Surah</th><th>Juz</th><th>Type</th><th>Grade</th></tr></thead>
              <tbody>
                {quran.map(q => (
                  <tr key={q.id}>
                    <td>{q.date}</td>
                    <td>{q.surah_name || '—'}</td>
                    <td>{q.juz_number || '—'}</td>
                    <td className="capitalize">{q.type}</td>
                    <td>{q.grade ? <span className="badge badge-blue">{q.grade}</span> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div className="card p-4">
          <SectionHeader icon={Wallet} title="Payments" />
          <div className="mb-2 p-2 rounded bg-emerald-50 border border-emerald-200 text-center">
            <p className="text-xs text-emerald-600">Total Paid</p>
            <p className="text-lg font-bold text-emerald-700">{currencySymbol}{totalPaid.toFixed(2)}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="table text-xs">
              <thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td>{p.date}</td>
                    <td className="capitalize">{p.payment_type?.replace('_', ' ')}</td>
                    <td className="font-semibold">{currencySymbol}{Number(p.amount).toFixed(2)}</td>
                    <td>
                      <span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-amber'}`}>{p.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const { user } = useAuth()
  const orgId = user?.orgId

  const [children,      setChildren]      = useState([])
  const [selectedChild, setSelectedChild] = useState(null)
  const [announcements, setAnnouncements] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)

  const load = useCallback(async () => {
    if (!orgId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      // students:getAll is scoped to linked children by backend JWT check
      const [cr, ann] = await Promise.all([
        window.api.students.getAll({ orgId }),
        window.api.masjid.getAnnouncements({ orgId }),
      ])
      const kids = cr.data || []
      setChildren(kids)
      if (kids.length > 0 && !selectedChild) setSelectedChild(kids[0])
      setAnnouncements((ann.data || []).slice(0, 5))
    } catch (e) {
      setError('Failed to load your children\'s data. Please try again.')
      console.error('[ParentDashboard]', e)
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

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

      {/* Read-only notice */}
      <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-xs">
        <Heart size={13} />
        <span>Parent Portal — <strong>View Only</strong>. Contact the school admin to make changes.</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">{error}</div>
      )}

      {children.length === 0 && (
        <div className="card p-8 text-center text-gray-400">
          <Heart size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No children linked to your account.</p>
          <p className="text-xs mt-1">Please contact the school administrator.</p>
        </div>
      )}

      {children.length > 0 && (
        <>
          {/* Children selector */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              My Children ({children.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {children.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChild(c)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all
                    ${selectedChild?.id === c.id
                      ? 'bg-primary-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
                    <span className="text-xs font-bold">{c.full_name?.charAt(0)}</span>
                  </div>
                  <span>{c.full_name}</span>
                  {selectedChild?.id === c.id && <ChevronRight size={13} />}
                </button>
              ))}
            </div>
          </div>

          {/* Selected child profile + data */}
          {selectedChild && (
            <div>
              {/* Profile card */}
              <div className="card p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-lg font-bold text-primary-700">
                    {selectedChild.full_name?.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900">{selectedChild.full_name}</h2>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                    <span>ID: <strong className="text-gray-700">{selectedChild.student_id}</strong></span>
                    {selectedChild.class_name && <span>Class: <strong className="text-gray-700">{selectedChild.class_name}</strong></span>}
                    {selectedChild.enrolled_date && <span>Enrolled: <strong className="text-gray-700">{selectedChild.enrolled_date}</strong></span>}
                  </div>
                </div>
                <span className={`badge flex-shrink-0 ${selectedChild.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                  {selectedChild.status}
                </span>
              </div>

              {/* Data panels for selected child */}
              <ChildPanel child={selectedChild} orgId={orgId} />
            </div>
          )}
        </>
      )}

      {/* Announcements (always shown) */}
      {announcements.length > 0 && (
        <div className="card p-5">
          <SectionHeader icon={Bell} title="School Announcements" />
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
    </div>
  )
}
