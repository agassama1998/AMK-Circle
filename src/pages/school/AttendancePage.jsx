import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Save, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'

const STATUS_OPTIONS = ['present','absent','late','excused']
const STATUS_COLOR = {
  present: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  absent:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  late:    'bg-gold-100 text-gold-800 dark:bg-gold-900/30 dark:text-gold-300',
  excused: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  '': 'bg-gray-100 text-gray-400',
}

export default function AttendancePage() {
  const { orgId, user } = useAuth()
  const [date,     setDate]     = useState(new Date().toISOString().split('T')[0])
  const [classId,  setClassId]  = useState('')
  const [classes,  setClasses]  = useState([])
  const [students, setStudents] = useState([])
  const [records,  setRecords]  = useState({}) // studentId -> status
  const [notes,    setNotes]    = useState({})  // studentId -> note
  const [loading,  setLoading]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    window.api.classes.getAll({ orgId }).then(r => { if (r.success) setClasses(r.data) })
  }, [orgId])

  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.attendance.getByDate({ orgId, date, classId: classId || undefined })
    if (r.success) {
      const rec = {}
      const nt  = {}
      r.data.forEach(s => { rec[s.id] = s.status || ''; nt[s.id] = s.notes || '' })
      setStudents(r.data)
      setRecords(rec)
      setNotes(nt)
    }
    setLoading(false)
  }, [orgId, date, classId])

  useEffect(() => { load() }, [load])

  const markAll = (status) => {
    const newRec = {}
    students.forEach(s => { newRec[s.id] = status })
    setRecords(newRec)
  }

  const save = async () => {
    setSaving(true)
    const recs = students.map(s => ({ studentId: s.id, status: records[s.id] || 'present', notes: notes[s.id] || null }))
    const r = await window.api.attendance.save({ orgId, date, classId: classId || null, records: recs, recordedBy: user?.id })
    setSaving(false)
    setMsg(r.success ? `Saved ${recs.length} attendance records` : r.message)
    setTimeout(() => setMsg(''), 3000)
  }

  const shiftDate = (days) => {
    const d = new Date(date)
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
  }

  const presentCount = Object.values(records).filter(s => s === 'present').length
  const absentCount  = Object.values(records).filter(s => s === 'absent').length
  const lateCount    = Object.values(records).filter(s => s === 'late').length
  const totalWithStatus = students.filter(s => records[s.id]).length

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Attendance" subtitle="Daily student attendance tracking" icon={ClipboardList} />

      {/* Date picker + class filter */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-1">
          <button onClick={() => shiftDate(-1)} className="btn-icon"><ChevronLeft size={16} /></button>
          <input type="date" className="input w-auto" value={date} onChange={e => setDate(e.target.value)} />
          <button onClick={() => shiftDate(1)} className="btn-icon"><ChevronRight size={16} /></button>
        </div>
        <select className="input w-auto" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Quick mark buttons */}
        <div className="flex gap-2 ml-auto">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => markAll(s)} className={`btn-sm btn-secondary capitalize ${STATUS_COLOR[s]} border-0`}>{s} all</button>
          ))}
        </div>
      </div>

      {/* Summary pills */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label:'Present', count: presentCount, cls: 'badge-green' },
          { label:'Absent',  count: absentCount,  cls: 'badge-red' },
          { label:'Late',    count: lateCount,     cls: 'badge-gold' },
          { label:'Total',   count: students.length, cls: 'badge-gray' },
        ].map(({ label, count, cls }) => (
          <div key={label} className={`badge ${cls} px-4 py-1.5 text-sm`}>
            {label}: <span className="font-bold ml-1">{count}</span>
          </div>
        ))}
      </div>

      {/* Attendance table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th className="th">#</th>
                <th className="th">Student</th>
                <th className="th">Class</th>
                <th className="th">Status</th>
                <th className="th">Notes</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={5} className="td py-12 text-center text-gray-400">No students found for this selection</td></tr>
              ) : students.map((s, idx) => (
                <tr key={s.id} className="tr">
                  <td className="td text-gray-400 text-sm">{idx + 1}</td>
                  <td className="td">
                    <div className="font-medium">{s.full_name}</div>
                    {s.arabic_name && <div className="text-xs text-gray-400 font-arabic">{s.arabic_name}</div>}
                  </td>
                  <td className="td text-sm text-gray-500">{s.class_name || '—'}</td>
                  <td className="td">
                    <div className="flex gap-1.5 flex-wrap">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setRecords(r => ({ ...r, [s.id]: opt }))}
                          className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all border-2
                            ${records[s.id] === opt
                              ? `${STATUS_COLOR[opt]} border-current`
                              : 'bg-gray-50 dark:bg-gray-700/50 text-gray-400 border-transparent hover:border-gray-300'
                            }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="td">
                    <input
                      className="input text-xs py-1 h-7 max-w-32"
                      placeholder="Optional note"
                      value={notes[s.id] || ''}
                      onChange={e => setNotes(n => ({ ...n, [s.id]: e.target.value }))}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center justify-between">
        {msg && <p className="text-sm text-green-600 font-medium">{msg}</p>}
        <button onClick={save} disabled={saving || students.length === 0} className="btn-primary ml-auto">
          <Save size={16} /> {saving ? 'Saving...' : `Save Attendance (${students.length})`}
        </button>
      </div>
    </div>
  )
}
