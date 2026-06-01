import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Edit2, Eye, Save, BookOpen, Users, Activity, AlertCircle } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY = {
  fullName: '', arabicName: '', dateOfBirth: '', gender: 'male', nationality: '',
  classId: '', parentName: '', parentPhone: '', parentEmail: '', address: '',
  enrolledDate: new Date().toISOString().split('T')[0], status: 'active', notes: '',
}

const STATUS_COLOR = {
  active:    'badge-green',
  inactive:  'badge-gray',
  suspended: 'badge-red',
  graduated: 'badge-blue',
}

// Description shown inside the confirmation modal for each target status
const STATUS_DESCRIPTIONS = {
  active:    'This will re-enroll the student and restore full access to classes, attendance, and exams.',
  inactive:  'This will temporarily hide the student from active operations. Their historical data is fully preserved.',
  suspended: 'The student will be blocked from attendance and exams. Their record is preserved and visible in reports.',
  graduated: 'The student will be marked as graduated. Their academic record will be preserved in read-only / alumni format. Their graduation date will be set to today.',
}

export default function StudentsPage() {
  const { user, orgId, canManageStatus } = useAuth()

  const [students,     setStudents]     = useState([])
  const [classes,      setClasses]      = useState([])
  const [search,       setSearch]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterClass,  setFilterClass]  = useState('')
  const [loading,      setLoading]      = useState(true)

  // Add / edit
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  // View profile
  const [viewStudent, setViewStudent] = useState(null)
  const [quranRecs,   setQuranRecs]   = useState([])
  const [showQuran,   setShowQuran]   = useState(false)
  const [qForm,       setQForm]       = useState({ date: '', surahName: '', ayahFrom: '', ayahTo: '', juzNumber: '', pages: '', grade: '', notes: '' })

  // Status management
  const [statusTarget, setStatusTarget] = useState(null)
  const [newStatus,    setNewStatus]    = useState('active')
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusMsg,    setStatusMsg]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [sr, cr] = await Promise.all([
      window.api.students.getAll({ orgId, search, status: filterStatus || undefined, classId: filterClass || undefined }),
      window.api.classes.getAll({ orgId }),
    ])
    if (sr.success) setStudents(sr.data)
    if (cr.success) setClasses(cr.data)
    setLoading(false)
  }, [orgId, search, filterStatus, filterClass])

  useEffect(() => { load() }, [load])

  // ── CRUD ────────────────────────────────────────────────────────────────────
  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (s) => {
    setEditing(s)
    setForm({ ...EMPTY, ...s, classId: s.class_id || '' })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.fullName.trim()) { setMsg('Full name is required'); return }
    setSaving(true)
    const data = { orgId, ...form, classId: form.classId || null }
    const r = editing
      ? await window.api.students.update({ ...data, id: editing.id })
      : await window.api.students.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  // ── View profile ─────────────────────────────────────────────────────────────
  const openView = async (s) => {
    setViewStudent(s)
    const r = await window.api.quran.getByStudent({ studentId: s.id, orgId })
    if (r.success) setQuranRecs(r.data)
  }

  const saveQuran = async () => {
    if (!qForm.surahName || !qForm.date) return
    const r = await window.api.quran.add({ orgId, studentId: viewStudent.id, ...qForm })
    if (r.success) {
      const q = await window.api.quran.getByStudent({ studentId: viewStudent.id, orgId })
      if (q.success) setQuranRecs(q.data)
      setQForm({ date: '', surahName: '', ayahFrom: '', ayahTo: '', juzNumber: '', pages: '', grade: '', notes: '' })
      setShowQuran(false)
    }
  }

  // ── Status management ─────────────────────────────────────────────────────────
  const openStatusModal = (s) => {
    setStatusTarget(s)
    setNewStatus(s.status || 'active')
    setStatusMsg('')
  }

  const saveStatus = async () => {
    setStatusSaving(true)
    const r = await window.api.students.updateStatus({
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

  const set  = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const setQ = k => e => setQForm(f => ({ ...f, [k]: e.target.value }))

  // Rows dim if not active
  const rowOpacity = (s) => (s.status !== 'active' ? 'opacity-70' : '')

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader
        title="Students"
        subtitle={`${students.length} student${students.length !== 1 ? 's' : ''} found`}
        icon={Users}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Register Student</button>}
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, ID, parent…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
          <option value="graduated">Graduated</option>
        </select>
        <select className="input w-auto" value={filterClass} onChange={e => setFilterClass(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['ID', 'Name', 'Gender', 'Class', 'Parent', 'Phone', 'Enrolled', 'Status', 'Actions'].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={9} className="td py-12 text-center text-gray-400">No students found</td></tr>
              ) : students.map(s => (
                <tr key={s.id} className={`tr ${rowOpacity(s)}`}>
                  <td className="td font-mono text-xs text-gray-500">{s.student_id}</td>
                  <td className="td">
                    <div className="font-semibold text-gray-900 dark:text-white">{s.full_name}</div>
                    {s.arabic_name && <div className="text-xs text-gray-400 font-arabic">{s.arabic_name}</div>}
                  </td>
                  <td className="td capitalize text-gray-500 text-sm">{s.gender}</td>
                  <td className="td text-gray-500 text-sm">{s.class_name || '—'}</td>
                  <td className="td text-sm">{s.parent_name || '—'}</td>
                  <td className="td text-sm text-gray-500">{s.parent_phone || '—'}</td>
                  <td className="td text-sm text-gray-400">{s.enrolled_date || '—'}</td>
                  <td className="td">
                    <span className={`badge capitalize ${STATUS_COLOR[s.status] || 'badge-gray'}`}>{s.status}</span>
                  </td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => openView(s)} className="btn-icon" title="View profile"><Eye size={14} /></button>
                      <button onClick={() => openEdit(s)} className="btn-icon" title="Edit"><Edit2 size={14} /></button>
                      {canManageStatus && (
                        <button
                          onClick={() => openStatusModal(s)}
                          className="btn-icon text-amber-500 hover:text-amber-700"
                          title="Change status"
                        >
                          <Activity size={14} />
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

      {/* Add/Edit Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Student' : 'Register New Student'} size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            <Save size={16} /> {saving ? 'Saving…' : 'Save Student'}
          </button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Full Name (English) *</label>
            <input className="input" value={form.fullName} onChange={set('fullName')} placeholder="Full legal name" />
          </div>
          <div>
            <label className="label">Arabic Name</label>
            <input className="input font-arabic text-right" dir="rtl" value={form.arabicName || ''} onChange={set('arabicName')} />
          </div>
          <div>
            <label className="label">Date of Birth</label>
            <input type="date" className="input" value={form.dateOfBirth || ''} onChange={set('dateOfBirth')} />
          </div>
          <div>
            <label className="label">Gender</label>
            <select className="input" value={form.gender} onChange={set('gender')}>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div>
            <label className="label">Nationality</label>
            <input className="input" value={form.nationality || ''} onChange={set('nationality')} />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.classId || ''} onChange={set('classId')}>
              <option value="">No Class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Enrolled Date</label>
            <input type="date" className="input" value={form.enrolledDate || ''} onChange={set('enrolledDate')} />
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>

          <div className="sm:col-span-2 border-t dark:border-gray-700 pt-4 mt-1">
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300 mb-3">Parent / Guardian</p>
          </div>
          <div>
            <label className="label">Parent/Guardian Name</label>
            <input className="input" value={form.parentName || ''} onChange={set('parentName')} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input" value={form.parentPhone || ''} onChange={set('parentPhone')} />
          </div>
          <div>
            <label className="label">Email</label>
            <input type="email" className="input" value={form.parentEmail || ''} onChange={set('parentEmail')} />
          </div>
          <div>
            <label className="label">Address</label>
            <input className="input" value={form.address || ''} onChange={set('address')} />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Notes</label>
            <textarea className="input h-16 resize-none" value={form.notes || ''} onChange={set('notes')} />
          </div>
        </div>
      </Modal>

      {/* View Student Modal */}
      {viewStudent && (
        <Modal open={!!viewStudent} onClose={() => setViewStudent(null)} title={viewStudent.full_name} size="lg">
          <div className="grid grid-cols-2 gap-3 text-sm mb-5">
            {[
              ['Student ID',  viewStudent.student_id],
              ['Class',       viewStudent.class_name || '—'],
              ['DOB',         viewStudent.date_of_birth || '—'],
              ['Gender',      viewStudent.gender],
              ['Nationality', viewStudent.nationality || '—'],
              ['Parent',      viewStudent.parent_name || '—'],
              ['Phone',       viewStudent.parent_phone || '—'],
              ['Email',       viewStudent.parent_email || '—'],
              ['Enrolled',    viewStudent.enrolled_date || '—'],
              ['Status',      viewStudent.status],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-2">
                <span className="text-gray-500 text-xs w-24 flex-shrink-0">{label}:</span>
                <span className="font-medium capitalize">{val}</span>
              </div>
            ))}
          </div>

          {/* Quran Progress */}
          <div className="border-t dark:border-gray-700 pt-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="section-title flex items-center gap-2"><BookOpen size={16} /> Quran Progress</h4>
              <button onClick={() => setShowQuran(s => !s)} className="btn-primary btn-sm">
                <Plus size={13} /> Add Record
              </button>
            </div>

            {showQuran && (
              <div className="card p-4 mb-4 bg-primary-50 dark:bg-primary-900/20">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div><label className="label">Date</label><input type="date" className="input" value={qForm.date} onChange={setQ('date')} /></div>
                  <div><label className="label">Surah Name</label><input className="input" placeholder="e.g. Al-Baqarah" value={qForm.surahName} onChange={setQ('surahName')} /></div>
                  <div><label className="label">Juz #</label><input type="number" className="input" min="1" max="30" value={qForm.juzNumber} onChange={setQ('juzNumber')} /></div>
                  <div><label className="label">Ayah From</label><input type="number" className="input" value={qForm.ayahFrom} onChange={setQ('ayahFrom')} /></div>
                  <div><label className="label">Ayah To</label><input type="number" className="input" value={qForm.ayahTo} onChange={setQ('ayahTo')} /></div>
                  <div><label className="label">Pages</label><input className="input" placeholder="e.g. 12-14" value={qForm.pages} onChange={setQ('pages')} /></div>
                  <div>
                    <label className="label">Grade</label>
                    <select className="input" value={qForm.grade} onChange={setQ('grade')}>
                      <option value="">Select</option>
                      {['Excellent', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Type</label>
                    <select className="input" value={qForm.type || 'memorization'} onChange={setQ('type')}>
                      <option value="memorization">Memorization</option>
                      <option value="revision">Revision</option>
                      <option value="tajweed">Tajweed</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={saveQuran} className="btn-primary"><Save size={14} /> Save</button>
                  <button onClick={() => setShowQuran(false)} className="btn-secondary">Cancel</button>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-52 overflow-y-auto">
              {quranRecs.map(q => (
                <div key={q.id} className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-sm">
                  <span className="text-gray-400 text-xs w-24 flex-shrink-0">{q.date}</span>
                  <span className="flex-1 font-medium">{q.surah_name} {q.juz_number ? `(Juz ${q.juz_number})` : ''}</span>
                  {q.pages && <span className="text-gray-500 text-xs">Pg {q.pages}</span>}
                  {q.grade && <span className="badge badge-green text-xs">{q.grade}</span>}
                </div>
              ))}
              {!quranRecs.length && <p className="text-gray-400 text-sm text-center py-6">No Quran records yet</p>}
            </div>
          </div>
        </Modal>
      )}

      {/* Status Management Modal */}
      <Modal
        open={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        title="Change Student Status"
        size="sm"
        footer={<>
          <button onClick={() => setStatusTarget(null)} className="btn-secondary">Cancel</button>
          <button
            onClick={saveStatus}
            disabled={statusSaving || newStatus === (statusTarget?.status || 'active')}
            className={`btn-primary ${newStatus === 'suspended' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : newStatus === 'graduated' ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : ''}`}
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
          Student: <strong className="text-gray-900 dark:text-white">{statusTarget?.full_name}</strong>
        </p>
        <p className="text-xs text-gray-400 mb-4">
          Current: <span className={`badge capitalize ${STATUS_COLOR[statusTarget?.status] || 'badge-gray'}`}>{statusTarget?.status}</span>
        </p>

        <div className="mb-4">
          <label className="label">New Status</label>
          <select className="input" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
            <option value="graduated">Graduated</option>
          </select>
        </div>

        {STATUS_DESCRIPTIONS[newStatus] && (
          <p className={`text-xs rounded-xl px-3 py-2 ${
            newStatus === 'suspended' ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
            : newStatus === 'graduated' ? 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
            : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
          }`}>
            ⚠ {STATUS_DESCRIPTIONS[newStatus]}
          </p>
        )}
      </Modal>
    </div>
  )
}
