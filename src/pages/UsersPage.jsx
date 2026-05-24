import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { Plus, Edit2, Trash2, Save, Shield, Key } from 'lucide-react'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'

const ROLES = ['organization_admin','principal','teacher','imam','finance','parent','student']
const EMPTY = { username:'', email:'', fullName:'', role:'teacher', phone:'', password:'Welcome@123!' }

const ROLE_COLOR = { organization_admin:'badge-purple', principal:'badge-blue', teacher:'badge-green', imam:'badge-gold', finance:'badge-blue', parent:'badge-gray', student:'badge-gray' }

export default function UsersPage() {
  const { orgId } = useAuth()
  const [users,    setUsers]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')
  const [showReset, setShowReset] = useState(null)
  const [newPass,   setNewPass]   = useState('Welcome@123!')

  const load = async () => {
    setLoading(true)
    const r = await window.api.users.getAll({ orgId })
    if (r.success) setUsers(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (u) => { setEditing(u); setForm({ username:u.username, email:u.email, fullName:u.full_name, role:u.role, phone:u.phone||'', password:'' }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.username || !form.email || !form.fullName) { setMsg('Username, email and name are required'); return }
    setSaving(true)
    const data = { orgId, ...form }
    const r = editing
      ? await window.api.users.update({ ...data, id: editing.id, isActive: editing.is_active })
      : await window.api.users.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Deactivate this user?')) { await window.api.users.delete({ id, orgId }); load() } }

  const resetPass = async () => {
    if (!newPass || newPass.length < 6) return
    await window.api.users.resetPassword({ id: showReset.id, orgId, newPassword: newPass })
    setShowReset(null)
    alert('Password reset successfully')
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Users & Roles" subtitle={`${users.length} users`} icon={Shield}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add User</button>}
      />

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Name','Username','Email','Role','Phone','Last Login','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              : users.length === 0 ? <tr><td colSpan={8} className="td py-12 text-center text-gray-400">No users found</td></tr>
              : users.map(u => (
                <tr key={u.id} className="tr">
                  <td className="td font-semibold">{u.full_name}</td>
                  <td className="td font-mono text-sm text-gray-500">@{u.username}</td>
                  <td className="td text-sm text-gray-500">{u.email}</td>
                  <td className="td"><span className={`badge capitalize ${ROLE_COLOR[u.role] || 'badge-gray'}`}>{u.role?.replace('_',' ')}</span></td>
                  <td className="td text-sm text-gray-500">{u.phone || '—'}</td>
                  <td className="td text-xs text-gray-400">{u.last_login?.slice(0,16) || 'Never'}</td>
                  <td className="td"><span className={`badge ${u.is_active ? 'badge-green' : 'badge-red'}`}>{u.is_active ? 'Active' : 'Inactive'}</span></td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(u)} className="btn-icon"><Edit2 size={14} /></button>
                      <button onClick={() => { setShowReset(u); setNewPass('Welcome@123!') }} className="btn-icon text-blue-500 hover:text-blue-700" title="Reset Password"><Key size={14} /></button>
                      <button onClick={() => del(u.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit User' : 'Add User'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> Save</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={form.fullName} onChange={set('fullName')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Username *</label><input className="input" value={form.username} onChange={set('username')} disabled={!!editing} /></div>
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
          </div>
          <div><label className="label">Email *</label><input type="email" className="input" value={form.email} onChange={set('email')} /></div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.replace('_',' ')}</option>)}
            </select>
          </div>
          {!editing && (
            <div><label className="label">Initial Password</label><input type="password" className="input" value={form.password} onChange={set('password')} /></div>
          )}
        </div>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={!!showReset} onClose={() => setShowReset(null)} title="Reset Password"
        footer={<>
          <button onClick={() => setShowReset(null)} className="btn-secondary">Cancel</button>
          <button onClick={resetPass} className="btn-primary"><Key size={15} /> Reset</button>
        </>}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Reset password for <strong>{showReset?.full_name}</strong>
        </p>
        <div>
          <label className="label">New Password</label>
          <input type="text" className="input" value={newPass} onChange={e => setNewPass(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
