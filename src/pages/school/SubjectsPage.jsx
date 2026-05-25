import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Trash2, Save, BookOpen } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = { name:'', code:'', description:'', classId:'', teacherId:'' }

export default function SubjectsPage() {
  const { orgId } = useAuth()
  const [subjects, setSubjects]   = useState([])
  const [classes, setClasses]     = useState([])
  const [teachers, setTeachers]   = useState([])
  const [filterClass, setFilter]  = useState('')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [sRes, cRes, tRes] = await Promise.all([
      window.api.subjects.getAll({ orgId, classId: filterClass || undefined }),
      window.api.classes.getAll({ orgId }),
      window.api.teachers.getAll({ orgId }),
    ])
    if (sRes.success) setSubjects(sRes.data)
    if (cRes.success) setClasses(cRes.data)
    if (tRes.success) setTeachers(tRes.data)
    setLoading(false)
  }, [orgId, filterClass])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ name: s.name, code: s.code||'', description: s.description||'', classId: s.class_id||'', teacherId: s.teacher_id||'' })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.name.trim()) { setMsg('Subject name is required'); return }
    setSaving(true)
    const data = { orgId, ...form, classId: form.classId || null, teacherId: form.teacherId || null }
    const r = editing
      ? await window.api.subjects.update({ ...data, id: editing.id })
      : await window.api.subjects.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => {
    if (!confirm('Delete this subject?')) return
    const r = await window.api.subjects.delete({ id, orgId })
    if (r.success) load()
    else alert(r.message)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Subjects"
        subtitle={`${subjects.length} subjects`}
        icon={BookOpen}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Subject</button>}
      />

      <div className="flex gap-3 items-center">
        <select className="input max-w-xs" value={filterClass} onChange={e => setFilter(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-sm text-gray-400">{subjects.length} result{subjects.length !== 1 ? 's' : ''}</span>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Subject Name','Code','Class','Teacher','Description','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : subjects.length === 0 ? (
                <tr><td colSpan={6} className="td py-12 text-center text-gray-400">No subjects found. Add one to get started.</td></tr>
              ) : subjects.map(s => (
                <tr key={s.id} className="tr">
                  <td className="td font-semibold">{s.name}</td>
                  <td className="td font-mono text-xs text-gray-500">{s.code || '—'}</td>
                  <td className="td text-sm">{s.class_name || <span className="text-gray-400">Not assigned</span>}</td>
                  <td className="td text-sm text-gray-500">{s.teacher_name || '—'}</td>
                  <td className="td text-sm text-gray-400 max-w-xs truncate">{s.description || '—'}</td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(s)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => del(s.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Edit Subject' : 'Add Subject'}
        size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Subject Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Mathematics, Quran, Arabic" />
          </div>
          <div>
            <label className="label">Subject Code</label>
            <input className="input" value={form.code} onChange={set('code')} placeholder="e.g. MATH101" />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.classId} onChange={set('classId')}>
              <option value="">— No class assigned —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Teacher</label>
            <select className="input" value={form.teacherId} onChange={set('teacherId')}>
              <option value="">— No teacher assigned —</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Description</label>
            <textarea className="input h-20 resize-none" value={form.description} onChange={set('description')} placeholder="Brief description of the subject..." />
          </div>
        </div>
      </Modal>
    </div>
  )
}
