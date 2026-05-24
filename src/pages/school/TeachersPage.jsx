import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Edit2, Trash2, Save, UserCheck } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = { fullName:'', arabicName:'', email:'', phone:'', gender:'male', specialization:'', hireDate:'', salary:'', status:'active', qualifications:'', notes:'' }

export default function TeachersPage() {
  const { orgId } = useAuth()
  const [teachers, setTeachers] = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.teachers.getAll({ orgId, search })
    if (r.success) setTeachers(r.data)
    setLoading(false)
  }, [orgId, search])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (t) => { setEditing(t); setForm({ fullName:t.full_name, arabicName:t.arabic_name||'', email:t.email||'', phone:t.phone||'', gender:t.gender, specialization:t.specialization||'', hireDate:t.hire_date||'', salary:t.salary||'', status:t.status, qualifications:t.qualifications||'', notes:t.notes||'' }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.fullName.trim()) { setMsg('Full name required'); return }
    setSaving(true)
    const data = { orgId, ...form }
    const r = editing ? await window.api.teachers.update({ ...data, id: editing.id }) : await window.api.teachers.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Deactivate this teacher?')) { await window.api.teachers.delete({ id, orgId }); load() } }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Teachers & Staff"
        subtitle={`${teachers.length} staff members`}
        icon={UserCheck}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Teacher</button>}
      />

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search teachers..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['ID','Name','Gender','Specialization','Phone','Salary','Classes','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={9} className="td py-12 text-center text-gray-400">No teachers found</td></tr>
              ) : teachers.map(t => (
                <tr key={t.id} className="tr">
                  <td className="td font-mono text-xs text-gray-500">{t.employee_id}</td>
                  <td className="td">
                    <div className="font-semibold">{t.full_name}</div>
                    {t.arabic_name && <div className="text-xs text-gray-400 font-arabic">{t.arabic_name}</div>}
                  </td>
                  <td className="td capitalize text-sm">{t.gender}</td>
                  <td className="td text-sm text-gray-500">{t.specialization || '—'}</td>
                  <td className="td text-sm text-gray-500">{t.phone || '—'}</td>
                  <td className="td font-medium">{t.salary ? `$${Number(t.salary).toLocaleString()}` : '—'}</td>
                  <td className="td text-center">{t.class_count || 0}</td>
                  <td className="td">
                    <span className={`badge capitalize ${t.status==='active' ? 'badge-green' : 'badge-gray'}`}>{t.status}</span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => del(t.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'} size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Full Name *</label><input className="input" value={form.fullName} onChange={set('fullName')} /></div>
          <div><label className="label">Arabic Name</label><input className="input font-arabic text-right" dir="rtl" value={form.arabicName} onChange={set('arabicName')} /></div>
          <div><label className="label">Gender</label><select className="input" value={form.gender} onChange={set('gender')}><option value="male">Male</option><option value="female">Female</option></select></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.email} onChange={set('email')} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          <div><label className="label">Specialization</label><input className="input" value={form.specialization} onChange={set('specialization')} placeholder="e.g. Quran, Arabic, Math" /></div>
          <div><label className="label">Hire Date</label><input type="date" className="input" value={form.hireDate} onChange={set('hireDate')} /></div>
          <div><label className="label">Monthly Salary ($)</label><input type="number" className="input" value={form.salary} onChange={set('salary')} /></div>
          <div><label className="label">Status</label><select className="input" value={form.status} onChange={set('status')}><option value="active">Active</option><option value="inactive">Inactive</option></select></div>
          <div className="sm:col-span-2"><label className="label">Qualifications</label><textarea className="input h-16 resize-none" value={form.qualifications} onChange={set('qualifications')} /></div>
          <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
