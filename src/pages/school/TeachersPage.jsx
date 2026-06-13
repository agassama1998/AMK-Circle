import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Plus, Search, Edit2, Save, UserCheck, Activity, AlertCircle, Trash2, CheckCircle } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = {
  fullName: '', arabicName: '', email: '', phone: '', gender: 'male',
  specialization: '', hireDate: '', salary: '', status: 'active',
  qualifications: '', notes: '',
}

const STATUS_COLOR = { active: 'badge-green', inactive: 'badge-gray' }

const STATUS_DESCRIPTIONS = {
  active:   'This will restore the teacher to active status, enabling class assignments and payroll.',
  inactive: 'This will deactivate the teacher. They will be removed from class assignment dropdowns and excluded from payroll runs.',
}

export default function TeachersPage() {
  const { user, orgId, canManageStatus } = useAuth()
  const { currencySymbol } = useSettings()

  const [teachers,     setTeachers]     = useState([])
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading,      setLoading]      = useState(true)

  // Add / edit
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  // Status management
  const [statusTarget, setStatusTarget] = useState(null)
  const [newStatus,    setNewStatus]    = useState('active')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusMsg,    setStatusMsg]    = useState('')

  // Delete
  const [deleteTarget,  setDeleteTarget]  = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteMsg,     setDeleteMsg]     = useState('')
  const [toast,         setToast]         = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.teachers.getAll({
      orgId,
      search:  search  || undefined,
      status:  filterStatus || undefined,
    })
    if (r.success) setTeachers(r.data)
    setLoading(false)
  }, [orgId, search, filterStatus])

  useEffect(() => { load() }, [load])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (t) => {
    setEditing(t)
    setForm({
      fullName: t.full_name, arabicName: t.arabic_name || '', email: t.email || '',
      phone: t.phone || '', gender: t.gender, specialization: t.specialization || '',
      hireDate: t.hire_date || '', salary: t.salary || '', status: t.status,
      qualifications: t.qualifications || '', notes: t.notes || '',
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.fullName.trim()) { setMsg('Full name required'); return }
    setSaving(true)
    const data = { orgId, ...form }
    const r = editing
      ? await window.api.teachers.update({ ...data, id: editing.id })
      : await window.api.teachers.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  // ── Status management ────────────────────────────────────────────────────────
  const openStatusModal = (t) => {
    setStatusTarget(t)
    setNewStatus(t.status || 'active')
    setStatusMsg('')
  }

  const saveStatus = async () => {
    setStatusSaving(true)
    const r = await window.api.teachers.updateStatus({
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

  // ── Delete ────────────────────────────────────────────────────────────────────
  const openDeleteModal = (t) => { setDeleteTarget(t); setDeleteMsg('') }

  const confirmDelete = async () => {
    setDeleteLoading(true)
    const r = await window.api.teachers.delete({ id: deleteTarget.id, orgId })
    setDeleteLoading(false)
    if (r.success) {
      setDeleteTarget(null)
      showToast(`${deleteTarget.full_name} has been permanently deleted.`, 'success')
      load()
    } else {
      setDeleteMsg(r.message || 'Deletion failed. Please try again.')
    }
  }

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Teachers & Staff"
        subtitle={`${teachers.length} staff member${teachers.length !== 1 ? 's' : ''}`}
        icon={UserCheck}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Teacher</button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search teachers…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['ID', 'Name', 'Gender', 'Specialization', 'Phone', 'Salary', 'Classes', 'Status', 'Actions'].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : teachers.length === 0 ? (
                <tr><td colSpan={9} className="td py-12 text-center text-gray-400">No teachers found</td></tr>
              ) : teachers.map(t => (
                <tr key={t.id} className={`tr ${t.status === 'inactive' ? 'opacity-60' : ''}`}>
                  <td className="td font-mono text-xs text-gray-500">{t.employee_id}</td>
                  <td className="td">
                    <div className="font-semibold">{t.full_name}</div>
                    {t.arabic_name && <div className="text-xs text-gray-400 font-arabic">{t.arabic_name}</div>}
                  </td>
                  <td className="td capitalize text-sm">{t.gender}</td>
                  <td className="td text-sm text-gray-500">{t.specialization || '—'}</td>
                  <td className="td text-sm text-gray-500">{t.phone || '—'}</td>
                  <td className="td font-medium">{t.salary ? `${currencySymbol}${Number(t.salary).toLocaleString()}` : '—'}</td>
                  <td className="td text-center">{t.class_count || 0}</td>
                  <td className="td">
                    <span className={`badge capitalize ${STATUS_COLOR[t.status] || 'badge-gray'}`}>{t.status}</span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(t)} className="btn-icon" title="Edit"><Edit2 size={14} /></button>
                      {canManageStatus && (
                        <button
                          onClick={() => openStatusModal(t)}
                          className="btn-icon text-amber-500 hover:text-amber-700"
                          title="Change status"
                        >
                          <Activity size={14} />
                        </button>
                      )}
                      {canManageStatus && (
                        <button
                          onClick={() => openDeleteModal(t)}
                          className="btn-icon text-red-500 hover:text-red-700"
                          title="Delete teacher"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Teacher' : 'Add Teacher'} size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving…' : 'Save'}</button>
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
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">Qualifications</label><textarea className="input h-16 resize-none" value={form.qualifications} onChange={set('qualifications')} /></div>
          <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium animate-fade-in
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Teacher"
        size="sm"
        footer={<>
          <button onClick={() => setDeleteTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={confirmDelete}
            disabled={deleteLoading}
            className="btn-primary bg-red-600 hover:bg-red-700 focus:ring-red-500"
          >
            <Trash2 size={15} /> {deleteLoading ? 'Deleting…' : 'Delete Permanently'}
          </button>
        </>}
      >
        {deleteMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {deleteMsg}
          </div>
        )}
        <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl mb-4">
          <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">This action cannot be undone.</p>
            <p className="text-xs text-red-600 dark:text-red-300">
              Salary records will be removed. Class and subject assignments will be unlinked. Quran progress records will be preserved without a teacher reference.
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Are you sure you want to delete{' '}
          <strong className="text-gray-900 dark:text-white">{deleteTarget?.full_name}</strong>
          {deleteTarget?.employee_id ? ` (${deleteTarget.employee_id})` : ''}?
        </p>
      </Modal>

      {/* Status Management Modal */}
      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Change Teacher Status"
        size="sm"
        footer={<>
          <button onClick={() => setStatusTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={saveStatus}
            disabled={statusSaving || newStatus === (statusTarget?.status || 'active')}
            className={`btn-primary ${newStatus === 'inactive' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : ''}`}
          >
            <Activity size={15} /> {statusSaving ? 'Saving…' : 'Apply Change'}
          </button>
        </>}
      >
        {statusMsg && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {statusMsg}
          </div>
        )}
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          Teacher: <strong className="text-gray-900 dark:text-white">{statusTarget?.full_name}</strong>
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Current status: <span className={`badge capitalize ${STATUS_COLOR[statusTarget?.status] || 'badge-gray'}`}>{statusTarget?.status}</span>
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
    </div>
  )
}
