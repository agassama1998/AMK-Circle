import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { BarChart3, Download } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'
import { exportToExcel } from '../../utils/excel'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#15803d','#d97706','#3b82f6','#8b5cf6','#ef4444','#06b6d4','#f97316']

const TABS = ['Financial','Students','Attendance','Hifz','Audit Logs']

function fmt(n) { return `$${Number(n||0).toLocaleString()}` }

export default function ReportsPage() {
  const { orgId } = useAuth()
  const [tab, setTab] = useState(0)

  // Financial
  const [finData, setFinData]   = useState(null)
  const [finStart, setFinStart] = useState('')
  const [finEnd,   setFinEnd]   = useState('')
  const [finType,  setFinType]  = useState('')

  // Students
  const [stuData,  setStuData]  = useState([])
  const [stuClass, setStuClass] = useState('')

  // Attendance
  const [attData,  setAttData]  = useState([])
  const [attClass, setAttClass] = useState('')
  const [attStart, setAttStart] = useState('')
  const [attEnd,   setAttEnd]   = useState('')

  // Hifz
  const [hifzData, setHifzData] = useState([])

  // Audit
  const [auditData, setAuditData] = useState([])
  const [auditAction, setAuditAction] = useState('')

  // Classes
  const [classes,  setClasses]  = useState([])
  const [loading,  setLoading]  = useState(false)

  useEffect(() => {
    window.api.classes.getAll({ orgId }).then(r => r.success && setClasses(r.data))
  }, [orgId])

  // Financial
  useEffect(() => {
    if (tab !== 0) return
    setLoading(true)
    window.api.reports.getFinancialReport({ orgId, startDate: finStart||undefined, endDate: finEnd||undefined, type: finType||undefined })
      .then(r => { if (r.success) setFinData(r.data); setLoading(false) })
  }, [tab, orgId, finStart, finEnd, finType])

  // Students
  useEffect(() => {
    if (tab !== 1) return
    setLoading(true)
    window.api.reports.getStudentReport({ orgId, classId: stuClass||undefined, status:'active' })
      .then(r => { if (r.success) setStuData(r.data); setLoading(false) })
  }, [tab, orgId, stuClass])

  // Attendance
  useEffect(() => {
    if (tab !== 2) return
    setLoading(true)
    window.api.reports.getAttendanceReport({ orgId, classId: attClass||undefined, startDate: attStart||undefined, endDate: attEnd||undefined })
      .then(r => { if (r.success) setAttData(r.data); setLoading(false) })
  }, [tab, orgId, attClass, attStart, attEnd])

  // Hifz
  useEffect(() => {
    if (tab !== 3) return
    setLoading(true)
    window.api.reports.getHifzReport({ orgId })
      .then(r => { if (r.success) setHifzData(r.data); setLoading(false) })
  }, [tab, orgId])

  // Audit
  useEffect(() => {
    if (tab !== 4) return
    setLoading(true)
    window.api.reports.getAuditLogs({ orgId, action: auditAction||undefined })
      .then(r => { if (r.success) setAuditData(r.data); setLoading(false) })
  }, [tab, orgId, auditAction])

  const exportExcel = async () => {
    try {
      if (tab === 0 && finData?.payments) await exportToExcel(finData.payments, 'Financial_Report')
      if (tab === 1) await exportToExcel(stuData, 'Students_Report')
      if (tab === 2) await exportToExcel(attData, 'Attendance_Report')
      if (tab === 3) await exportToExcel(hifzData, 'Hifz_Report')
      if (tab === 4) await exportToExcel(auditData, 'Audit_Logs')
    } catch (e) { alert('Export failed: ' + e.message) }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Reports & Analytics" subtitle="Comprehensive organization reports" icon={BarChart3}
        actions={<button onClick={exportExcel} className="btn-secondary"><Download size={16} /> Export Excel</button>}
      />

      <div className="tab-bar">
        {TABS.map((t, i) => <button key={t} onClick={() => setTab(i)} className={`tab-btn ${tab===i?'active':''}`}>{t}</button>)}
      </div>

      {/* ─── Financial ─────────────────────────────────────────────────────── */}
      {tab === 0 && (
        <div className="space-y-5">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <input type="date" className="input w-auto" value={finStart} onChange={e => setFinStart(e.target.value)} placeholder="Start date" />
            <input type="date" className="input w-auto" value={finEnd}   onChange={e => setFinEnd(e.target.value)}   placeholder="End date" />
            <select className="input w-auto" value={finType} onChange={e => setFinType(e.target.value)}>
              <option value="">All Types</option>
              {['tuition','donation','zakat','sadaqah','boarding','registration','other'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>

          {finData && (
            <>
              {/* Summary chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="card p-5">
                  <h3 className="section-title mb-4">Income by Type</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={finData.summary || []} dataKey="total" nameKey="type" cx="50%" cy="50%" outerRadius={80} innerRadius={45}>
                        {(finData.summary || []).map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Legend iconSize={10} formatter={v => <span className="capitalize text-xs">{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="card p-5">
                  <h3 className="section-title mb-4">Summary by Type</h3>
                  <div className="space-y-2">
                    {(finData.summary || []).map((s, i) => (
                      <div key={s.type} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-sm capitalize">{s.type}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold">{fmt(s.total)}</span>
                          <span className="text-xs text-gray-400 ml-2">({s.count})</span>
                        </div>
                      </div>
                    ))}
                    <div className="border-t dark:border-gray-700 pt-2 flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-primary-700">{fmt((finData.summary||[]).reduce((s,r) => s+(r.total||0), 0))}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments table */}
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b dark:border-gray-700/50 flex justify-between items-center">
                  <h3 className="section-title">Payments ({finData.payments?.length || 0})</h3>
                  <span className="text-sm font-bold text-primary-700">{fmt((finData.payments||[]).reduce((s,p) => s+p.amount, 0))}</span>
                </div>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>{['Receipt','Date','Person','Type','Method','Amount'].map(h => <th key={h} className="th">{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {loading ? <tr><td colSpan={6} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                      : (finData.payments || []).slice(0, 100).map(p => (
                        <tr key={p.id} className="tr">
                          <td className="td font-mono text-xs">{p.receipt_number}</td>
                          <td className="td text-sm text-gray-500">{p.date}</td>
                          <td className="td font-medium">{p.person_name}</td>
                          <td className="td capitalize text-sm">{p.payment_type}</td>
                          <td className="td capitalize text-sm text-gray-500">{p.payment_method}</td>
                          <td className="td font-bold text-primary-700">{fmt(p.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── Students ──────────────────────────────────────────────────────── */}
      {tab === 1 && (
        <div className="space-y-5">
          <div className="flex gap-3">
            <select className="input w-auto" value={stuClass} onChange={e => setStuClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>{['ID','Name','Class','Present','Absent','Late','Att %','Quran Sessions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={8} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                  : stuData.length === 0 ? <tr><td colSpan={8} className="td py-10 text-center text-gray-400">No data</td></tr>
                  : stuData.map(s => (
                    <tr key={s.id} className="tr">
                      <td className="td font-mono text-xs text-gray-500">{s.student_id}</td>
                      <td className="td font-medium">{s.full_name}</td>
                      <td className="td text-sm text-gray-500">{s.class_name || '—'}</td>
                      <td className="td text-green-600 font-medium">{s.present}</td>
                      <td className="td text-red-500 font-medium">{s.absent}</td>
                      <td className="td text-gold-600 font-medium">{s.late}</td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${s.attendanceRate||0}%` }} />
                          </div>
                          <span className="text-xs font-medium">{s.attendanceRate}%</span>
                        </div>
                      </td>
                      <td className="td text-center">{s.quranSessions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Attendance ────────────────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="space-y-5">
          <div className="flex flex-wrap gap-3">
            <select className="input w-auto" value={attClass} onChange={e => setAttClass(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" className="input w-auto" value={attStart} onChange={e => setAttStart(e.target.value)} />
            <input type="date" className="input w-auto" value={attEnd}   onChange={e => setAttEnd(e.target.value)} />
          </div>
          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>{['ID','Name','Class','Present','Absent','Late','Excused','Total','Rate'].map(h => <th key={h} className="th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={9} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                  : attData.length === 0 ? <tr><td colSpan={9} className="td py-10 text-center text-gray-400">No data</td></tr>
                  : attData.map(s => (
                    <tr key={s.id} className="tr">
                      <td className="td font-mono text-xs">{s.student_id}</td>
                      <td className="td font-medium">{s.full_name}</td>
                      <td className="td text-sm text-gray-500">{s.class_name||'—'}</td>
                      <td className="td text-green-600 font-medium">{s.present}</td>
                      <td className="td text-red-500 font-medium">{s.absent}</td>
                      <td className="td text-gold-600">{s.late}</td>
                      <td className="td text-blue-600">{s.excused}</td>
                      <td className="td">{s.total}</td>
                      <td className="td font-bold">{s.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── Hifz ──────────────────────────────────────────────────────────── */}
      {tab === 3 && (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>{['ID','Name','Arabic','Class','Pages Memorized','% Complete','Milestones','Sessions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                : hifzData.length === 0 ? <tr><td colSpan={8} className="td py-10 text-center text-gray-400">No data</td></tr>
                : hifzData.map(s => (
                  <tr key={s.id} className="tr">
                    <td className="td font-mono text-xs">{s.student_id}</td>
                    <td className="td font-medium">{s.full_name}</td>
                    <td className="td font-arabic text-sm">{s.arabic_name||'—'}</td>
                    <td className="td text-sm text-gray-500">{s.class_name||'—'}</td>
                    <td className="td font-bold text-primary-700">{s.pages_memorized||0}</td>
                    <td className="td">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary-600 to-gold-500 rounded-full"
                            style={{ width: `${Math.round((s.pages_memorized||0)*100/604)}%` }} />
                        </div>
                        <span className="text-xs font-bold">{Math.round((s.pages_memorized||0)*100/604)}%</span>
                      </div>
                    </td>
                    <td className="td text-center">{s.milestones||0}</td>
                    <td className="td text-center">{s.quran_sessions||0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Audit Logs ────────────────────────────────────────────────────── */}
      {tab === 4 && (
        <div className="space-y-4">
          <select className="input w-auto" value={auditAction} onChange={e => setAuditAction(e.target.value)}>
            <option value="">All Actions</option>
            {['LOGIN','LOGOUT','CREATE_STUDENT','UPDATE_STUDENT','CREATE_PAYMENT','CREATE_TEACHER','UPDATE_PRAYER_TIMES','CHANGE_PASSWORD'].map(a =>
              <option key={a} value={a}>{a}</option>
            )}
          </select>
          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>{['Timestamp','User','Action','Table','Details'].map(h => <th key={h} className="th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? <tr><td colSpan={5} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                  : auditData.slice(0,100).map(l => (
                    <tr key={l.id} className="tr">
                      <td className="td font-mono text-xs text-gray-400">{l.created_at?.slice(0,19)}</td>
                      <td className="td text-sm font-medium">{l.username||'—'}</td>
                      <td className="td"><span className="badge badge-blue text-xs">{l.action}</span></td>
                      <td className="td text-xs capitalize text-gray-500">{l.table_name?.replace('_',' ')||'—'}</td>
                      <td className="td text-xs text-gray-400 max-w-xs truncate">{l.details||'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
