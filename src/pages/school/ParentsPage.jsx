import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Edit2, Trash2, Save, Users } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = { fullName:'', email:'', phone:'', altPhone:'', address:'', occupation:'', relationship:'father', notes:'' }
const RELATIONSHIPS = ['father','mother','guardian','uncle','aunt','grandfather','grandmother','sibling','other']

export default function ParentsPage() {
  const { orgId } = useAuth()
  const [parents, setParents]   = useState([])
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.parents.getAll({ orgId, search })
    if (r.success) setParents(r.data)
    setLoading(false)
  }, [orgId, search])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (p) => {
    setEditing(p)
    setForm({ fullName: p.full_name, email: p.email||'', phone: p.phone||'', altPhone: p.alt_phone||'', address: p.address||'', occupation: p.occupation||'', relationship: p.relationship||'father', notes: p.notes||'' })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.fullName.trim()) { setMsg('Full name is required'); return }
    setSaving(true)
    const data = { orgId, ...form }
    const r = editing
      ? await window.api.parents.update({ ...data, id: editing.id })
      : await window.api.parents.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => {
    if (!confirm('Delete this parent record?')) return
    const r = await window.api.parents.delete({ id, orgId })
    if (r.success) load()
    else alert(r.message)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Parents & Guardians"
        subtitle={`${parents.length} records`}
        icon={Users}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Parent</button>}
      />

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Search by name, email or phone..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Name','Relationship','Phone','Alt Phone','Email','Occupation','Students','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : parents.length === 0 ? (
                <tr><td colSpan={8} className="td py-12 text-center text-gray-400">No parents found. Add one to get started.</td></tr>
              ) : parents.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td font-semibold">{p.full_name}</td>
                  <td className="td capitalize text-sm text-gray-500">{p.relationship}</td>
                  <td className="td text-sm">{p.phone || '—'}</td>
                  <td className="td text-sm text-gray-400">{p.alt_phone || '—'}</td>
                  <td className="td text-sm text-gray-500">{p.email || '—'}</td>
                  <td className="td text-sm text-gray-500">{p.occupation || '—'}</td>
                  <td className="td text-center">
                    <span className="badge badge-blue">{p.student_count || 0}</span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(p)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => del(p.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
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
        title={editing ? 'Edit Parent / Guardian' : 'Add Parent / Guardian'}
        size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full Name *</label>
            <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="Parent's full name" />
          </div>
          <div>
            <label className="label">Relationship</label>
            <select className="input" value={form.relationship} onChange={set('relationship')}>
              {RELATIONSHIPS.map(r => <option key={r} value={r} className="capitalize">{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Occupation</label>
            <input className="input" value={form.occupation} onChange={set('occupation')} placeholder="e.g. Engineer, Teacher" />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.phone} onChange={set('phone')} placeholder="+1 (555) 000-0000" />
          </div>
          <div>
            <label className="label">Alt Phone</label>
            <input className="input" value={form.altPhone} onChange={set('altPhone')} placeholder="Secondary number" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Email</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} placeholder="parent@example.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Address</label>
            <textarea className="input h-16 resize-none" value={form.address} onChange={set('address')} placeholder="Home address" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
