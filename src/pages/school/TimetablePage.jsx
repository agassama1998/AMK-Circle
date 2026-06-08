import React, { useState, useEffect } from 'react'
import { Clock, Plus, Trash2, Edit2, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const TIMES = ['06:00','06:30','07:00','07:30','08:00','08:30','09:00','09:30','10:00','10:30',
               '11:00','11:30','12:00','12:30','13:00','13:30','14:00','14:30','15:00','15:30',
               '16:00','16:30','17:00','17:30','18:00','18:30','19:00','19:30','20:00','20:30','21:00']

const EMPTY = { classId:'', subjectId:'', teacherId:'', dayOfWeek:'Monday', startTime:'08:00', endTime:'09:00', room:'', academicYear:'', notes:'' }

export default function TimetablePage() {
  const { user, orgId } = useAuth()
  const isReadOnly = ['parent','student'].includes(user?.role)

  const [slots,    setSlots]    = useState([])
  const [classes,  setClasses]  = useState([])
  const [subjects, setSubjects] = useState([])
  const [teachers, setTeachers] = useState([])

  const [filterClass, setFilterClass] = useState('')
  const [filterDay,   setFilterDay]   = useState('')
  const [viewMode,    setViewMode]    = useState('grid') // grid | list

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')

  const load = async () => {
    const [sr, cr, subr, tr] = await Promise.all([
      window.api.timetable.getAll({ orgId, classId: filterClass||undefined, dayOfWeek: filterDay||undefined }),
      window.api.classes.getAll({ orgId }),
      window.api.subjects.getAll({ orgId }),
      window.api.teachers.getAll({ orgId }),
    ])
    if (sr.success) setSlots(sr.data)
    if (cr.success) setClasses(cr.data)
    if (subr.success) setSubjects(subr.data)
    if (tr.success) setTeachers(tr.data)
  }

  useEffect(() => { if (orgId) load() }, [orgId, filterClass, filterDay])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowModal(true) }
  const openEdit   = (s)  => { setEditing(s); setForm({ classId: s.class_id||'', subjectId: s.subject_id||'', teacherId: s.teacher_id||'', dayOfWeek: s.day_of_week, startTime: s.start_time, endTime: s.end_time, room: s.room||'', academicYear: s.academic_year||'', notes: s.notes||'' }); setShowModal(true) }

  const save = async () => {
    if (!form.dayOfWeek || !form.startTime || !form.endTime) { setMsg('Day and times are required'); return }
    setSaving(true)
    const payload = { orgId, dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime, classId: form.classId||null, subjectId: form.subjectId||null, teacherId: form.teacherId||null, room: form.room||null, academicYear: form.academicYear||null, notes: form.notes||null }
    const r = editing
      ? await window.api.timetable.update({ ...payload, id: editing.id })
      : await window.api.timetable.create(payload)
    setSaving(false)
    if (r.success) { setShowModal(false); load() } else setMsg(r.message)
  }

  const del = async (id) => {
    if (!confirm('Delete this timetable slot?')) return
    await window.api.timetable.delete({ id, orgId })
    load()
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Group slots by day for grid view
  const byDay = DAYS.reduce((acc, d) => { acc[d] = slots.filter(s => s.day_of_week === d); return acc }, {})

  const SlotCard = ({ s }) => (
    <div className="bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl p-2.5 text-xs group relative">
      <p className="font-semibold text-primary-800 dark:text-primary-300 truncate">{s.subject_name || 'Free Period'}</p>
      <p className="text-gray-600 dark:text-gray-400 truncate">{s.class_name || '—'}</p>
      <p className="text-gray-500 dark:text-gray-500 truncate">{s.teacher_name || '—'}</p>
      <p className="text-gray-400 mt-1">{s.start_time} – {s.end_time}{s.room ? ` · ${s.room}` : ''}</p>
      {!isReadOnly && (
        <div className="absolute top-1 right-1 hidden group-hover:flex gap-1">
          <button onClick={() => openEdit(s)} className="btn-icon p-1"><Edit2 size={11}/></button>
          <button onClick={() => del(s.id)} className="btn-icon p-1 text-red-500"><Trash2 size={11}/></button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Timetable" subtitle="Weekly class schedules and room allocations" icon={Calendar} />

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <select className="input w-44" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input w-36" value={filterDay} onChange={e => setFilterDay(e.target.value)}>
            <option value="">All Days</option>
            {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
            {['grid','list'].map(v => (
              <button key={v} onClick={() => setViewMode(v)} className={`px-3 py-1.5 text-xs font-medium capitalize ${viewMode===v ? 'bg-primary-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>{v}</button>
            ))}
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus size={16}/> Add Slot
          </button>
        )}
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-5 gap-3 overflow-x-auto">
          {DAYS.slice(0,5).map(day => (
            <div key={day} className="min-w-0">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2 text-center">{day}</h3>
              <div className="space-y-2">
                {byDay[day].length === 0
                  ? <div className="h-16 rounded-xl border-2 border-dashed border-gray-100 dark:border-gray-800 flex items-center justify-center"><p className="text-xs text-gray-300">No classes</p></div>
                  : byDay[day].sort((a,b) => a.start_time.localeCompare(b.start_time)).map(s => <SlotCard key={s.id} s={s}/>)
                }
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-gray-100 dark:border-gray-800">
              {['Day','Time','Class','Subject','Teacher','Room',''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {slots.length === 0
                ? <tr><td colSpan={7} className="py-12 text-center text-gray-400 text-sm">No timetable slots found</td></tr>
                : slots.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="px-4 py-3 font-medium text-sm">{s.day_of_week}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 font-mono">{s.start_time} – {s.end_time}</td>
                    <td className="px-4 py-3 text-sm">{s.class_name || '—'}</td>
                    <td className="px-4 py-3 text-sm">{s.subject_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.teacher_name || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.room || '—'}</td>
                    {!isReadOnly && (
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => openEdit(s)} className="btn-icon"><Edit2 size={14}/></button>
                          <button onClick={() => del(s.id)} className="btn-icon text-red-500"><Trash2 size={14}/></button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Slot' : 'Add Timetable Slot'} width="max-w-lg">
        {msg && <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-xl text-sm">{msg}</div>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Day</label>
            <select className="input" value={form.dayOfWeek} onChange={set('dayOfWeek')}>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Academic Year</label>
            <input className="input" value={form.academicYear} onChange={set('academicYear')} placeholder="2024-2025"/>
          </div>
          <div>
            <label className="label">Start Time</label>
            <select className="input" value={form.startTime} onChange={set('startTime')}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">End Time</label>
            <select className="input" value={form.endTime} onChange={set('endTime')}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.classId} onChange={set('classId')}>
              <option value="">— Select Class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select className="input" value={form.subjectId} onChange={set('subjectId')}>
              <option value="">— Select Subject —</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Teacher</label>
            <select className="input" value={form.teacherId} onChange={set('teacherId')}>
              <option value="">— Select Teacher —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Room</label>
            <input className="input" value={form.room} onChange={set('room')} placeholder="Room 101"/>
          </div>
          <div className="col-span-2">
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={set('notes')} placeholder="Optional notes"/>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : (editing ? 'Update' : 'Add Slot')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
