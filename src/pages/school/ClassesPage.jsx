import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Trash2, Save, BookOpen } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = { name:'', gradeLevel:'', teacherId:'', room:'', capacity:30, schedule:'', academicYear:'2024-2025', department:'', status:'active' }

export default function ClassesPage() {
  const { orgId } = useAuth()
  const [classes,  setClasses]  = useState([])
  const [teachers, setTeachers] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  const load = async () => {
    setLoading(true)
    const [cr, tr] = await Promise.all([
      window.api.classes.getAll({ orgId }),
      window.api.teachers.getAll({ orgId, status: 'active' }),
    ])
    if (cr.success) setClasses(cr.data)
    if (tr.success) setTeachers(tr.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (c) => { setEditing(c); setForm({ name:c.name, gradeLevel:c.grade_level||'', teacherId:c.teacher_id||'', room:c.room||'', capacity:c.capacity||30, schedule:c.schedule||'', academicYear:c.academic_year||'', department:c.department||'', status:c.status }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.name.trim()) { setMsg('Class name is required'); return }
    setSaving(true)
    const data = { orgId, ...form, teacherId: form.teacherId || null }
    const r = editing ? await window.api.classes.update({ ...data, id: editing.id }) : await window.api.classes.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Deactivate this class?')) { const r = await window.api.classes.delete({ id, orgId }); if (!r.success) alert(r.message); else load() } }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Classes"
        subtitle={`${classes.length} classes`}
        icon={BookOpen}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Class</button>}
      />

      {/* Class cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12"><div className="spinner mx-auto" /></div>
        ) : classes.length === 0 ? (
          <div className="col-span-3 empty-state card">No classes yet. Add one!</div>
        ) : classes.map(c => (
          <div key={c.id} className="card p-5 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">{c.name}</h4>
                {c.grade_level && <p className="text-xs text-gray-400">Level: {c.grade_level}</p>}
              </div>
              <span className={`badge capitalize ${c.status==='active' ? 'badge-green' : 'badge-gray'}`}>{c.status}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Teacher</span>
                <span className="font-medium text-gray-700 dark:text-gray-300">{c.teacher_name || '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Room</span>
                <span className="font-medium">{c.room || '—'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Students</span>
                <span className="font-bold text-primary-700 dark:text-primary-400">{c.student_count || 0} / {c.capacity}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-gray-400">Year</span>
                <span className="font-medium">{c.academic_year || '—'}</span>
              </div>
            </div>

            {c.schedule && <p className="text-xs text-gray-500 bg-gray-50 dark:bg-gray-700/40 rounded-lg px-3 py-1.5">🕐 {c.schedule}</p>}

            {/* Capacity bar */}
            <div>
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Capacity</span>
                <span>{Math.round((c.student_count || 0) * 100 / (c.capacity || 1))}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.round((c.student_count || 0) * 100 / (c.capacity || 1)))}%` }} />
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t dark:border-gray-700">
              <button onClick={() => openEdit(c)} className="btn-secondary btn-sm flex-1 justify-center"><Edit2 size={13} /> Edit</button>
              <button onClick={() => del(c.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Class' : 'New Class'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> {saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Class Name *</label><input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Hifz Class A" /></div>
          <div><label className="label">Grade Level</label><input className="input" value={form.gradeLevel} onChange={set('gradeLevel')} placeholder="e.g. Beginner, Grade 3" /></div>
          <div><label className="label">Department</label><input className="input" value={form.department} onChange={set('department')} placeholder="e.g. Quran, Arabic" /></div>
          <div>
            <label className="label">Teacher</label>
            <select className="input" value={form.teacherId} onChange={set('teacherId')}>
              <option value="">No Teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Room</label><input className="input" value={form.room} onChange={set('room')} /></div>
          <div><label className="label">Capacity</label><input type="number" className="input" value={form.capacity} onChange={set('capacity')} /></div>
          <div><label className="label">Academic Year</label><input className="input" value={form.academicYear} onChange={set('academicYear')} placeholder="2024-2025" /></div>
          <div className="col-span-2"><label className="label">Schedule</label><input className="input" value={form.schedule} onChange={set('schedule')} placeholder="e.g. Mon/Wed/Fri 4:00-6:00 PM" /></div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
