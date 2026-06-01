import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Plus, Edit2, Save, Shield, Key, Trash2,
  Activity, RotateCcw, AlertCircle,
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import PageHeader from '../components/ui/PageHeader'

const ROLES = ['organization_admin', 'principal', 'teacher', 'imam', 'finance', 'parent', 'student']
const EMPTY = { username: '', email: '', fullName: '', role: 'teacher', phone: '', password: 'Welcome@123!' }

const ROLE_COLOR = {
  organization_admin: 'badge-purple',
  principal:          'badge-blue',
  teacher:            'badge-green',
  imam:               'badge-gold',
  finance:            'badge-blue',
  parent:             'badge-gray',
  student:            'badge-gray',
}

// Derives a display status string for a user row.
// deleted_at takes priority; then the status column; then falls back to is_active.
function resolveStatus(u) {
  if (u.deleted_at) return 'deleted'
  return u.status || (u.is_active ? 'active' : 'inactive')
}

const STATUS_BADGE = {
  active:   'badge-green',
  inactive: 'badge-gray',
  deleted:  'badge-red',
}

const STATUS_DESCRIPTIONS = {
  active:   'Login access will be granted. The user can sign in immediately.',
  inactive: 'Login access will be revoked. The user will see an "Account inactive" message.',
}

export default function UsersPage() {
  const { user, orgId, canManageStatus } = useAuth()

  const [users,        setUsers]        = useState([])
  const [loading,      setLoading]      = useState(true)
  const [filterStatus, setFilterStatus] = useState('')   // '' | 'active' | 'inactive' | 'deleted'

  // Add / edit
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [formMsg,  setFormMsg]  = useState('')

  // Password reset
  const [showReset, setShowReset] = useState(null)
  const [newPass,   setNewPass]   = useState('Welcome@123!')

  // Status change modal (activate / deactivate)
  const [statusTarget, setStatusTarget] = useState(null)
  const [newStatus,    setNewStatus]    = useState('active')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusMsg,    setStatusMsg]    = useState('')

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteSaving, setDeleteSaving] = useState(false)
  const [deleteMsg,    setDeleteMsg]    = useState('')

  // Restore confirmation modal
  const [restoreTarget, setRestoreTarget] = useState(null)
  const [restoreSaving, setRestoreSaving] = useState(false)
  const [restoreMsg,    setRestoreMsg]    = useState('')

  // ── Load ─────────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.users.getAll({
      orgId,
      status: filterStatus || undefined,
    })
    if (r.success) setUsers(r.data)
    setLoading(false)
  }, [orgId, filterStatus])

  useEffect(() => { load() }, [load])

  // ── Add / Edit ───────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm(EMPTY); setFormMsg(''); setShowForm(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({ username: u.username, email: u.email, fullName: u.full_name, role: u.role, phone: u.phone || '', password: '' })
    setFormMsg('')
    setShowForm(true)
  }

  const save = async () => {
    if (!form.username || !form.email || !form.fullName) {
      setFormMsg('Username, email and name are required')
      return
    }
    setSaving(true)
    const data = { orgId, ...form }
    const r = editing
      ? await window.api.users.update({ ...data, id: editing.id, isActive: editing.is_active })
      : await window.api.users.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() }
    else setFormMsg(r.message)
  }

  // ── Password reset ────────────────────────────────────────────────────────────
  const resetPass = async () => {
    if (!newPass || newPass.length < 6) return
    await window.api.users.resetPassword({ id: showReset.id, orgId, newPassword: newPass })
    setShowReset(null)
    alert('Password reset successfully')
  }

  // ── Status change ─────────────────────────────────────────────────────────────
  const openStatusModal = (u) => {
    const current = resolveStatus(u)
    setStatusTarget(u)
    setNewStatus(current === 'active' ? 'inactive' : 'active') // pre-select the opposite
    setStatusMsg('')
  }

  const saveStatus = async () => {
    setStatusSaving(true)
    const r = await window.api.users.updateStatus({
      id:         statusTarget.id,
      orgId,
      status:     newStatus,
      actorRole:  user.role,
      actorOrgId: user.orgId,
    })
    setStatusSaving(false)
    if (r.success) { setStatusTarget(null); load() }
    else setStatusMsg(r.message)
  }

  // ── Soft-delete ───────────────────────────────────────────────────────────────
  const openDeleteModal = (u) => { setDeleteTarget(u); setDeleteMsg('') }

  const confirmDelete = async () => {
    setDeleteSaving(true)
    const r = await window.api.users.delete({
      id:         deleteTarget.id,
      orgId,
      actorRole:  user.role,
      actorOrgId: user.orgId,
      actorId:    user.id,
    })
    setDeleteSaving(false)
    if (r.success) { setDeleteTarget(null); load() }
    else setDeleteMsg(r.message)
  }

  // ── Restore ───────────────────────────────────────────────────────────────────
  const openRestoreModal = (u) => { setRestoreTarget(u); setRestoreMsg('') }

  const confirmRestore = async () => {
    setRestoreSaving(true)
    const r = await window.api.users.restore({
      id:         restoreTarget.id,
      orgId,
      actorRole:  user.role,
      actorOrgId: user.orgId,
    })
    setRestoreSaving(false)
    if (r.success) { setRestoreTarget(null); load() }
    else setRestoreMsg(r.message)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Users & Roles"
        subtitle={`${users.length} user${users.length !== 1 ? 's' : ''}`}
        icon={Shield}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add User</button>}
      />

      {/* Status filter */}
      <div className="flex gap-3 flex-wrap items-center">
        <select
          className="input w-auto"
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
        >
          <option value="">All Active &amp; Inactive</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="deleted">Deleted</option>
        </select>
        {filterStatus === 'deleted' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Showing soft-deleted accounts. Use Restore to reinstate a user.
          </p>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['Name', 'Username', 'Email', 'Role', 'Phone', 'Last Login', 'Status', 'Actions'].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={8} className="td py-12 text-center text-gray-400">No users found</td></tr>
              ) : users.map(u => {
                const st = resolveStatus(u)
                const isDeleted = st === 'deleted'
                return (
                  <tr key={u.id} className={`tr ${isDeleted ? 'opacity-60' : ''}`}>
                    <td className="td font-semibold">{u.full_name}</td>
                    <td className="td font-mono text-sm text-gray-500">@{u.username}</td>
                    <td className="td text-sm text-gray-500">{u.email}</td>
                    <td className="td">
                      <span className={`badge capitalize ${ROLE_COLOR[u.role] || 'badge-gray'}`}>
                        {u.role?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="td text-sm text-gray-500">{u.phone || '—'}</td>
                    <td className="td text-xs text-gray-400">{u.last_login?.slice(0, 16) || 'Never'}</td>
                    <td className="td">
                      <span className={`badge capitalize ${STATUS_BADGE[st] || 'badge-gray'}`}>{st}</span>
                    </td>
                    <td className="td">
                      <div className="flex gap-1">
                        {!isDeleted && (
                          <button onClick={() => openEdit(u)} className="btn-icon" title="Edit user">
                            <Edit2 size={14} />
                          </button>
                        )}
                        {!isDeleted && (
                          <button
                            onClick={() => { setShowReset(u); setNewPass('Welcome@123!') }}
                            className="btn-icon text-blue-500 hover:text-blue-700"
                            title="Reset password"
                          >
                            <Key size={14} />
                          </button>
                        )}
                        {canManageStatus && !isDeleted && (
                          <button
                            onClick={() => openStatusModal(u)}
                            className="btn-icon text-amber-500 hover:text-amber-700"
                            title={`${st === 'active' ? 'Deactivate' : 'Activate'} user`}
                          >
                            <Activity size={14} />
                          </button>
                        )}
                        {canManageStatus && !isDeleted && (
                          <button
                            onClick={() => openDeleteModal(u)}
                            className="btn-icon text-red-400 hover:text-red-600"
                            title="Delete user"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {canManageStatus && isDeleted && (
                          <button
                            onClick={() => openRestoreModal(u)}
                            className="btn-icon text-emerald-500 hover:text-emerald-700"
                            title="Restore deleted user"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────────────────────────── */}
      <Modal
        open={showForm}
        onClose={() => setShowForm(false)}
        title={editing ? 'Edit User' : 'Add User'}
        size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> Save</button>
        </>}
      >
        {formMsg && <p className="text-sm text-red-500 mb-3">{formMsg}</p>}
        <div className="space-y-3">
          <div>
            <label className="label">Full Name *</label>
            <input className="input" value={form.fullName} onChange={set('fullName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Username *</label>
              <input className="input" value={form.username} onChange={set('username')} disabled={!!editing} />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={set('email')} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={set('role')}>
              {ROLES.map(r => <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          {!editing && (
            <div>
              <label className="label">Initial Password</label>
              <input type="password" className="input" value={form.password} onChange={set('password')} />
            </div>
          )}
        </div>
      </Modal>

      {/* ── Reset Password Modal ─────────────────────────────────────────────── */}
      <Modal
        open={!!showReset}
        onClose={() => setShowReset(null)}
        title="Reset Password"
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

      {/* ── Change Status Modal ──────────────────────────────────────────────── */}
      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Change Account Status"
        size="sm"
        footer={<>
          <button onClick={() => setStatusTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={saveStatus}
            disabled={statusSaving || newStatus === resolveStatus(statusTarget || {})}
            className="btn-primary"
          >
            <Activity size={15} /> {statusSaving ? 'Saving…' : 'Apply'}
          </button>
        </>}
      >
        {statusMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {statusMsg}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          User: <strong className="text-gray-900 dark:text-white">{statusTarget?.full_name}</strong>
        </p>
        <div className="mb-4">
          <label className="label">New Status</label>
          <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        {STATUS_DESCRIPTIONS[newStatus] && (
          <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-xl px-3 py-2">
            ⚠ {STATUS_DESCRIPTIONS[newStatus]}
          </p>
        )}
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete User"
        size="sm"
        footer={<>
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={confirmDelete}
            disabled={deleteSaving}
            className="btn-danger"
          >
            <Trash2 size={15} /> {deleteSaving ? 'Deleting…' : 'Delete'}
          </button>
        </>}
      >
        {deleteMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {deleteMsg}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Delete <strong className="text-gray-900 dark:text-white">{deleteTarget?.full_name}</strong>?
        </p>
        <p className="text-xs text-gray-500">
          The account will be soft-deleted — no data is lost. An admin can restore it at any time using the Deleted filter.
        </p>
      </Modal>

      {/* ── Restore Confirmation Modal ───────────────────────────────────────── */}
      <Modal
        open={!!restoreTarget}
        onClose={() => setRestoreTarget(null)}
        title="Restore User"
        size="sm"
        footer={<>
          <button onClick={() => setRestoreTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={confirmRestore}
            disabled={restoreSaving}
            className="btn-primary"
          >
            <RotateCcw size={15} /> {restoreSaving ? 'Restoring…' : 'Restore'}
          </button>
        </>}
      >
        {restoreMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {restoreMsg}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          Restore <strong className="text-gray-900 dark:text-white">{restoreTarget?.full_name}</strong>?
        </p>
        <p className="text-xs text-gray-500">
          The account will be set back to <strong>Active</strong> and the user will be able to log in again.
        </p>
      </Modal>
    </div>
  )
}
