import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Search, Edit2, ToggleLeft, ToggleRight, Save, Building2,
  Users, UserPlus, Key, Shield, Trash2, RotateCcw, AlertCircle,
} from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const ORG_TYPES = [
  'Islamic Community Center', 'Masjid', 'Dara (Quran Boarding School)',
  'College', 'School', 'Islamic Institute', 'Hybrid Institution',
]
const EMPTY_ORG  = {
  name: '', orgType: 'Islamic Community Center', address: '', city: '', state: '',
  country: 'USA', email: '', phone: '', website: '', timezone: 'America/Chicago',
  primaryColor: '#15803d', secondaryColor: '#d97706', subscriptionStatus: 'active',
}
const EMPTY_USER = { username: '', email: '', fullName: '', role: 'organization_admin', password: 'Admin@123!', phone: '' }
const ORG_ROLES  = ['organization_admin', 'principal', 'teacher', 'imam', 'finance', 'parent', 'student']

const ROLE_COLOR = {
  organization_admin: 'badge-purple', principal: 'badge-blue',
  teacher: 'badge-green', imam: 'badge-gold', finance: 'badge-blue',
  parent: 'badge-gray',  student: 'badge-gray',
}

const STATUS_COLOR = { active: 'badge-green', inactive: 'badge-gray', deleted: 'badge-red' }

// Confirmation copy per action
const CONFIRM_COPY = {
  activate:   { title: 'Activate Account',   btnClass: 'btn-primary',                    btn: 'Activate',   body: (name) => `Activate ${name}'s account? They will be able to log in again.` },
  deactivate: { title: 'Deactivate Account', btnClass: 'bg-amber-600 hover:bg-amber-700 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2', btn: 'Deactivate', body: (name) => `Deactivate ${name}? They will no longer be able to log in until reactivated.` },
  delete:     { title: 'Delete User',        btnClass: 'bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2',    btn: 'Delete',     body: (name) => `Remove ${name} from this organization? The account is soft-deleted and can be restored later.` },
  restore:    { title: 'Restore User',       btnClass: 'btn-primary',                    btn: 'Restore',    body: (name) => `Restore ${name}'s account? They will be set to Active and can log in again.` },
}

export default function OrganizationsPage() {
  const { user } = useAuth()  // super_admin user object

  // ── Org list ─────────────────────────────────────────────────────────────────
  const [orgs,    setOrgs]    = useState([])
  const [search,  setSearch]  = useState('')
  const [loading, setLoading] = useState(true)

  // ── Org form ─────────────────────────────────────────────────────────────────
  const [showOrgForm, setShowOrgForm] = useState(false)
  const [editingOrg,  setEditingOrg]  = useState(null)
  const [orgForm,     setOrgForm]     = useState(EMPTY_ORG)
  const [savingOrg,   setSavingOrg]   = useState(false)
  const [orgMsg,      setOrgMsg]      = useState('')

  // ── Users panel (per-org) ────────────────────────────────────────────────────
  const [selectedOrg,  setSelectedOrg]  = useState(null)
  const [orgUsers,     setOrgUsers]     = useState([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [userFilter,   setUserFilter]   = useState('active')   // 'active'|'inactive'|'deleted'|'all'

  // ── Add user inline form ──────────────────────────────────────────────────────
  const [showUserForm, setShowUserForm] = useState(false)
  const [userForm,     setUserForm]     = useState(EMPTY_USER)
  const [savingUser,   setSavingUser]   = useState(false)
  const [userMsg,      setUserMsg]      = useState('')

  // ── Reset password ────────────────────────────────────────────────────────────
  const [resetTarget, setResetTarget] = useState(null)
  const [newPass,     setNewPass]     = useState('Admin@123!')

  // ── Confirmation modal ────────────────────────────────────────────────────────
  // confirmTarget: { action: 'activate'|'deactivate'|'delete'|'restore', user: <row> }
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [confirmBusy,   setConfirmBusy]   = useState(false)
  const [confirmErr,    setConfirmErr]    = useState('')

  // ── Delete org modal ──────────────────────────────────────────────────────────
  const [deleteOrgTarget, setDeleteOrgTarget] = useState(null)
  const [deleteOrgBusy,   setDeleteOrgBusy]   = useState(false)
  const [deleteOrgErr,    setDeleteOrgErr]    = useState('')

  // ── Load orgs ─────────────────────────────────────────────────────────────────
  const loadOrgs = useCallback(async () => {
    setLoading(true)
    const r = await window.api.orgs.getAll({ search })
    if (r.success) setOrgs(r.data)
    setLoading(false)
  }, [search])

  useEffect(() => { loadOrgs() }, [loadOrgs])

  // ── Load org users (called whenever the panel opens or filter changes) ────────
  const loadOrgUsers = useCallback(async () => {
    if (!selectedOrg) return
    setLoadingUsers(true)
    const params = { orgId: selectedOrg.id }
    if (userFilter === 'deleted') params.status = 'deleted'
    else if (userFilter !== 'all') params.status = userFilter
    else params.includeDeleted = true   // 'all' shows everything

    const r = await window.api.users.getAll(params)
    if (r.success) setOrgUsers(r.data)
    setLoadingUsers(false)
  }, [selectedOrg, userFilter])

  useEffect(() => { loadOrgUsers() }, [loadOrgUsers])

  // ── Org CRUD ──────────────────────────────────────────────────────────────────
  const openNewOrg  = () => { setEditingOrg(null); setOrgForm(EMPTY_ORG); setShowOrgForm(true); setOrgMsg('') }
  const openEditOrg = (o) => {
    setEditingOrg(o)
    setOrgForm({
      name: o.name, orgType: o.org_type, address: o.address || '', city: o.city || '',
      state: o.state || '', country: o.country || 'USA', email: o.email || '',
      phone: o.phone || '', website: o.website || '', timezone: o.timezone || 'America/Chicago',
      primaryColor: o.primary_color || '#15803d', secondaryColor: o.secondary_color || '#d97706',
      subscriptionStatus: o.subscription_status || 'active',
    })
    setShowOrgForm(true); setOrgMsg('')
  }
  const saveOrg = async () => {
    if (!orgForm.name.trim()) { setOrgMsg('Organization name is required'); return }
    setSavingOrg(true)
    const r = editingOrg
      ? await window.api.orgs.update({ ...orgForm, id: editingOrg.id })
      : await window.api.orgs.create(orgForm)
    setSavingOrg(false)
    if (r.success) { setShowOrgForm(false); loadOrgs() } else setOrgMsg(r.message)
  }
  const toggleOrg = async (org) => {
    await window.api.orgs.toggleActive({ id: org.id })
    loadOrgs()
  }

  const confirmDeleteOrg = async () => {
    if (!deleteOrgTarget) return
    setDeleteOrgBusy(true)
    setDeleteOrgErr('')
    const r = await window.api.orgs.delete({
      id:         deleteOrgTarget.id,
      actorId:    user.id,
      actorRole:  user.role,
    })
    setDeleteOrgBusy(false)
    if (r.success) {
      setDeleteOrgTarget(null)
      loadOrgs()
    } else {
      setDeleteOrgErr(r.message || 'Failed to delete organization')
    }
  }

  // ── Users panel open ──────────────────────────────────────────────────────────
  const openUsersPanel = (org) => {
    setSelectedOrg(org)
    setUserFilter('active')   // default filter: active users
    setShowUserForm(false)
    setUserMsg('')
    setOrgUsers([])
  }
  const closeUsersPanel = () => {
    setSelectedOrg(null)
    setShowUserForm(false)
    setConfirmTarget(null)
  }

  // ── Create user ───────────────────────────────────────────────────────────────
  const openNewUser = () => { setUserForm(EMPTY_USER); setShowUserForm(true); setUserMsg('') }
  const saveUser = async () => {
    if (!userForm.username || !userForm.email || !userForm.fullName) {
      setUserMsg('Username, email and full name are required'); return
    }
    setSavingUser(true)
    const r = await window.api.users.create({ orgId: selectedOrg.id, ...userForm })
    setSavingUser(false)
    if (r.success) {
      setShowUserForm(false)
      setUserForm(EMPTY_USER)
      // Switch to "active" filter so the new user is immediately visible
      setUserFilter('active')
    } else {
      setUserMsg(r.message)
    }
  }

  // ── Confirmed action executor ─────────────────────────────────────────────────
  const executeConfirm = async () => {
    if (!confirmTarget) return
    setConfirmBusy(true)
    setConfirmErr('')

    const { action, user: u } = confirmTarget
    let r

    if (action === 'activate' || action === 'deactivate') {
      r = await window.api.users.updateStatus({
        id:         u.id,
        orgId:      selectedOrg.id,
        status:     action === 'activate' ? 'active' : 'inactive',
        actorRole:  user.role,
        actorOrgId: user.orgId,
      })
    } else if (action === 'delete') {
      r = await window.api.users.delete({
        id:         u.id,
        orgId:      selectedOrg.id,
        actorRole:  user.role,
        actorOrgId: user.orgId,
        actorId:    user.id,
      })
    } else if (action === 'restore') {
      r = await window.api.users.restore({
        id:         u.id,
        orgId:      selectedOrg.id,
        actorRole:  user.role,
        actorOrgId: user.orgId,
      })
    }

    setConfirmBusy(false)

    if (r?.success) {
      setConfirmTarget(null)
      loadOrgUsers()   // refresh list immediately after every action
    } else {
      setConfirmErr(r?.message || 'An error occurred')
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────────
  const resetPassword = async () => {
    if (!newPass || newPass.length < 6) { alert('Password must be at least 6 characters'); return }
    await window.api.users.resetPassword({ id: resetTarget.id, orgId: selectedOrg.id, newPassword: newPass })
    setResetTarget(null)
    alert('Password reset successfully')
  }

  // ── Resolve display status ────────────────────────────────────────────────────
  const resolveStatus = (u) => {
    if (u.deleted_at) return 'deleted'
    return u.status || (u.is_active ? 'active' : 'inactive')
  }

  const setO = k => e => setOrgForm(f  => ({ ...f, [k]: e.target.value }))
  const setU = k => e => setUserForm(f => ({ ...f, [k]: e.target.value }))

  // ── Confirmation copy helper ──────────────────────────────────────────────────
  const confirmCopy = confirmTarget ? CONFIRM_COPY[confirmTarget.action] : null

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Organizations"
        subtitle={`${orgs.length} organization${orgs.length !== 1 ? 's' : ''} registered`}
        icon={Building2}
        actions={<button onClick={openNewOrg} className="btn-primary"><Plus size={16} /> Add Organization</button>}
      />

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="input pl-9"
          placeholder="Search organizations…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Orgs Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['Organization', 'Type', 'Location', 'Students', 'Teachers', 'Revenue', 'Status', 'Actions'].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="td text-center py-12"><div className="spinner mx-auto" /></td></tr>
              ) : orgs.length === 0 ? (
                <tr><td colSpan={8} className="td text-center text-gray-400 py-12">No organizations found</td></tr>
              ) : orgs.map(o => (
                <tr key={o.id} className="tr">
                  <td className="td">
                    <div className="font-semibold text-gray-900 dark:text-white">{o.name}</div>
                    {o.email && <div className="text-xs text-gray-400">{o.email}</div>}
                  </td>
                  <td className="td">
                    <span className="badge badge-blue text-xs capitalize">{o.org_type}</span>
                  </td>
                  <td className="td text-sm text-gray-500">
                    {[o.city, o.state, o.country].filter(Boolean).join(', ')}
                  </td>
                  <td className="td text-center font-medium">{o.student_count || 0}</td>
                  <td className="td text-center font-medium">{o.teacher_count || 0}</td>
                  <td className="td font-medium text-primary-700 dark:text-primary-400">
                    ${Number(o.total_revenue || 0).toLocaleString()}
                  </td>
                  <td className="td">
                    <span className={`badge capitalize ${o.is_active ? 'badge-green' : 'badge-red'}`}>
                      {o.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="td">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditOrg(o)} className="btn-icon" title="Edit org">
                        <Edit2 size={14} />
                      </button>
                      <button onClick={() => openUsersPanel(o)} className="btn-icon" title="Manage users">
                        <Users size={14} />
                      </button>
                      <button onClick={() => toggleOrg(o)} className="btn-icon" title={o.is_active ? 'Disable org' : 'Enable org'}>
                        {o.is_active
                          ? <ToggleRight size={16} className="text-primary-600" />
                          : <ToggleLeft  size={16} />}
                      </button>
                      <button
                        onClick={() => { setDeleteOrgTarget(o); setDeleteOrgErr('') }}
                        className="btn-icon text-red-400 hover:text-red-600"
                        title="Delete organization"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Org form modal ─────────────────────────────────────────────────────── */}
      <Modal open={showOrgForm} onClose={() => setShowOrgForm(false)}
        title={editingOrg ? 'Edit Organization' : 'New Organization'} size="lg"
        footer={<>
          <button onClick={() => setShowOrgForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveOrg} disabled={savingOrg} className="btn-primary">
            <Save size={16} />{savingOrg ? 'Saving…' : 'Save'}
          </button>
        </>}
      >
        {orgMsg && <p className="text-sm text-red-500 mb-4">{orgMsg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Organization Name *</label>
            <input className="input" value={orgForm.name} onChange={setO('name')} placeholder="Full organization name" />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={orgForm.orgType} onChange={setO('orgType')}>
              {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subscription Status</label>
            <select className="input" value={orgForm.subscriptionStatus} onChange={setO('subscriptionStatus')}>
              {['active', 'trial', 'expired', 'suspended'].map(s =>
                <option key={s} value={s} className="capitalize">{s}</option>
              )}
            </select>
          </div>
          <div><label className="label">Email</label><input className="input" type="email" value={orgForm.email} onChange={setO('email')} /></div>
          <div><label className="label">Phone</label><input className="input" value={orgForm.phone} onChange={setO('phone')} /></div>
          <div><label className="label">Website</label><input className="input" value={orgForm.website} onChange={setO('website')} placeholder="https://" /></div>
          <div><label className="label">Address</label><input className="input" value={orgForm.address} onChange={setO('address')} /></div>
          <div><label className="label">City</label><input className="input" value={orgForm.city} onChange={setO('city')} /></div>
          <div><label className="label">State/Province</label><input className="input" value={orgForm.state} onChange={setO('state')} /></div>
          <div>
            <label className="label">Country</label>
            <select className="input" value={orgForm.country} onChange={setO('country')}>
              {['USA','Canada','UK','Australia','UAE','Saudi Arabia','Qatar','Kuwait','Malaysia','Other'].map(c =>
                <option key={c} value={c}>{c}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Timezone</label>
            <select className="input" value={orgForm.timezone} onChange={setO('timezone')}>
              {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','Europe/London','Asia/Riyadh','Asia/Dubai','Asia/Kuala_Lumpur'].map(t =>
                <option key={t} value={t}>{t}</option>
              )}
            </select>
          </div>
          <div>
            <label className="label">Primary Color</label>
            <div className="flex gap-2">
              <input type="color" className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" value={orgForm.primaryColor} onChange={setO('primaryColor')} />
              <input className="input flex-1" value={orgForm.primaryColor} onChange={setO('primaryColor')} />
            </div>
          </div>
          <div>
            <label className="label">Accent Color</label>
            <div className="flex gap-2">
              <input type="color" className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" value={orgForm.secondaryColor} onChange={setO('secondaryColor')} />
              <input className="input flex-1" value={orgForm.secondaryColor} onChange={setO('secondaryColor')} />
            </div>
          </div>
        </div>
      </Modal>

      {/* ── Users panel modal ──────────────────────────────────────────────────── */}
      <Modal
        open={!!selectedOrg}
        onClose={closeUsersPanel}
        title={selectedOrg ? `Users — ${selectedOrg.name}` : ''}
        size="lg"
        footer={
          <button onClick={closeUsersPanel} className="btn-secondary">Close</button>
        }
      >
        {selectedOrg && (
          <div className="space-y-4">

            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 text-sm">
              <Shield size={16} className="mt-0.5 flex-shrink-0" />
              <span>
                Users created here belong <strong>only</strong> to <strong>{selectedOrg.name}</strong>.
                They will only see that organization's data when they log in.
              </span>
            </div>

            {/* Add user button */}
            {!showUserForm && (
              <button onClick={openNewUser} className="btn-primary w-full justify-center">
                <UserPlus size={16} /> Add User for {selectedOrg.name}
              </button>
            )}

            {/* Inline user creation form */}
            {showUserForm && (
              <div className="border border-primary-200 dark:border-primary-800 rounded-2xl p-4 space-y-3 bg-primary-50/50 dark:bg-primary-900/10">
                <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                  New user for: {selectedOrg.name}
                </p>
                {userMsg && <p className="text-sm text-red-500">{userMsg}</p>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="label">Full Name *</label>
                    <input className="input" value={userForm.fullName} onChange={setU('fullName')} placeholder="Full name" />
                  </div>
                  <div>
                    <label className="label">Username *</label>
                    <input className="input" value={userForm.username} onChange={setU('username')} placeholder="login username" autoCapitalize="off" />
                  </div>
                  <div>
                    <label className="label">Email *</label>
                    <input className="input" type="email" value={userForm.email} onChange={setU('email')} />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <select className="input" value={userForm.role} onChange={setU('role')}>
                      {ORG_ROLES.map(r => <option key={r} value={r} className="capitalize">{r.replace('_', ' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Password</label>
                    <input className="input" value={userForm.password} onChange={setU('password')} placeholder="Min 6 chars" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input className="input" value={userForm.phone} onChange={setU('phone')} />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowUserForm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={saveUser} disabled={savingUser} className="btn-primary flex-1 justify-center">
                    <Save size={14} />{savingUser ? 'Creating…' : 'Create User'}
                  </button>
                </div>
              </div>
            )}

            {/* Status filter tabs */}
            <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 text-xs font-medium">
              {[
                { key: 'active',   label: 'Active' },
                { key: 'inactive', label: 'Inactive' },
                { key: 'deleted',  label: 'Deleted' },
                { key: 'all',      label: 'All' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setUserFilter(key)}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    userFilter === key
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* User list */}
            {loadingUsers ? (
              <div className="flex justify-center py-8"><div className="spinner" /></div>
            ) : orgUsers.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                {userFilter === 'active'   ? 'No active users.' :
                 userFilter === 'inactive' ? 'No inactive users.' :
                 userFilter === 'deleted'  ? 'No deleted users.' :
                 'No users yet — add the first one above.'}
              </p>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50 max-h-80 overflow-y-auto">
                {orgUsers.map(u => {
                  const st = resolveStatus(u)
                  return (
                    <div key={u.id} className={`flex items-center justify-between py-3 ${st === 'deleted' ? 'opacity-50' : ''}`}>
                      {/* Identity */}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{u.full_name}</p>
                        <p className="text-xs text-gray-400 truncate">@{u.username} · {u.email}</p>
                      </div>

                      {/* Badges + Actions */}
                      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                        <span className={`badge text-xs capitalize ${ROLE_COLOR[u.role] || 'badge-gray'}`}>
                          {u.role.replace('_', ' ')}
                        </span>
                        <span className={`badge text-xs ${STATUS_COLOR[st] || 'badge-gray'}`}>
                          {st}
                        </span>

                        {/* Reset password (only for non-deleted) */}
                        {!u.deleted_at && (
                          <button
                            className="btn-icon"
                            title="Reset password"
                            onClick={() => { setResetTarget(u); setNewPass('Admin@123!') }}
                          >
                            <Key size={13} />
                          </button>
                        )}

                        {/* ── THE FIX: symmetric activate / deactivate ── */}
                        {!u.deleted_at && st === 'active' && (
                          <button
                            className="btn-icon text-amber-500 hover:text-amber-700"
                            title="Deactivate"
                            onClick={() => setConfirmTarget({ action: 'deactivate', user: u })}
                          >
                            <ToggleRight size={15} />
                          </button>
                        )}
                        {!u.deleted_at && st === 'inactive' && (
                          <button
                            className="btn-icon text-emerald-500 hover:text-emerald-700"
                            title="Activate"
                            onClick={() => setConfirmTarget({ action: 'activate', user: u })}
                          >
                            <ToggleLeft size={15} />
                          </button>
                        )}

                        {/* Delete (non-deleted users only) */}
                        {!u.deleted_at && (
                          <button
                            className="btn-icon text-red-400 hover:text-red-600"
                            title="Delete user"
                            onClick={() => setConfirmTarget({ action: 'delete', user: u })}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}

                        {/* Restore (deleted users only) */}
                        {u.deleted_at && (
                          <button
                            className="btn-icon text-blue-500 hover:text-blue-700"
                            title="Restore user"
                            onClick={() => setConfirmTarget({ action: 'restore', user: u })}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* ── Confirmation modal ─────────────────────────────────────────────────── */}
      <Modal
        open={!!confirmTarget}
        onClose={() => { setConfirmTarget(null); setConfirmErr('') }}
        title={confirmCopy?.title || ''}
        size="sm"
        footer={<>
          <button
            onClick={() => { setConfirmTarget(null); setConfirmErr('') }}
            className="btn-secondary"
            disabled={confirmBusy}
          >
            Cancel
          </button>
          <button
            onClick={executeConfirm}
            disabled={confirmBusy}
            className={confirmCopy?.btnClass || 'btn-primary'}
          >
            {confirmBusy ? 'Processing…' : confirmCopy?.btn}
          </button>
        </>}
      >
        {confirmErr && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-3 text-sm">
            <AlertCircle size={14} /> {confirmErr}
          </div>
        )}
        <p className="text-sm text-gray-700 dark:text-gray-300">
          {confirmTarget ? CONFIRM_COPY[confirmTarget.action]?.body(confirmTarget.user.full_name) : ''}
        </p>
      </Modal>

      {/* ── Reset password modal ───────────────────────────────────────────────── */}
      <Modal
        open={!!resetTarget}
        onClose={() => setResetTarget(null)}
        title={`Reset Password — ${resetTarget?.full_name}`}
        size="sm"
        footer={<>
          <button onClick={() => setResetTarget(null)} className="btn-secondary">Cancel</button>
          <button onClick={resetPassword} className="btn-primary"><Key size={14} /> Reset</button>
        </>}
      >
        <div>
          <label className="label">New Password</label>
          <input className="input" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 6 characters" />
        </div>
      </Modal>

      {/* ── Delete Organization confirmation modal ─────────────────────────────── */}
      <Modal
        open={!!deleteOrgTarget}
        onClose={() => { setDeleteOrgTarget(null); setDeleteOrgErr('') }}
        title="Delete Organization"
        size="sm"
        footer={<>
          <button
            onClick={() => { setDeleteOrgTarget(null); setDeleteOrgErr('') }}
            className="btn-secondary"
            disabled={deleteOrgBusy}
          >
            Cancel
          </button>
          <button
            onClick={confirmDeleteOrg}
            disabled={deleteOrgBusy}
            className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-xl flex items-center gap-2 disabled:opacity-50"
          >
            <Trash2 size={15} />
            {deleteOrgBusy ? 'Deleting…' : 'Delete Organization'}
          </button>
        </>}
      >
        {deleteOrgErr && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 rounded-xl px-3 py-2 mb-4 text-sm">
            <AlertCircle size={14} /> {deleteOrgErr}
          </div>
        )}
        <div className="space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Are you sure you want to delete{' '}
            <strong className="text-gray-900 dark:text-white">{deleteOrgTarget?.name}</strong>?
          </p>
          <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 text-xs text-red-700 dark:text-red-400 space-y-1.5">
            <p>This action will:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>Hide the organization from the active list</li>
              <li>Block all its users from logging in</li>
              <li>Preserve all data (students, teachers, payments, attendance)</li>
            </ul>
            <p className="font-medium mt-2">This cannot be undone from the UI.</p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
