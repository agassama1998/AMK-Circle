import React, { useState, useEffect } from 'react'
import { ShieldAlert, Plus, Edit2, Trash2, CheckCircle, Search, Filter } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import Modal from '../../components/ui/Modal'

const INCIDENT_TYPES = ['misconduct','bullying','absence','late','disrespect','property_damage','cheating','violence','other']
const SEVERITIES     = ['minor','moderate','major','critical']
const SEV_COLORS = { minor:'bg-yellow-50 text-yellow-700 border-yellow-200', moderate:'bg-orange-50 text-orange-700 border-orange-200', major:'bg-red-50 text-red-700 border-red-200', critical:'bg-red-100 text-red-800 border-red-300' }

const EMPTY = { studentId:'', incidentDate: new Date().toISOString().split('T')[0], incidentType:'misconduct', severity:'minor', description:'', actionTaken:'', resolved:false, parentNotified:false, notes:'' }

export default function DisciplinePage() {
  const { user, orgId } = useAuth()

  const [records,  setRecords]  = useState([])
  const [students, setStudents] = useState([])

  const [filterStudent,  setFilterStudent]  = useState('')
  const [filterSeverity, setFilterSeverity] = useState('')
  const [filterResolved, setFilterResolved] = useState('')
  const [search,         setSearch]         = useState('')

  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [msg,       setMsg]       = useState('')

  const load = async () => {
    const [rr, sr] = await Promise.all([
      window.api.dara.getDisciplineRecords({ orgId,
        studentId: filterStudent||undefined,
        severity:  filterSeverity||undefined,
        resolved:  filterResolved !== '' ? filterResolved === '1' : undefined,
      }),
      window.api.students.getAll({ orgId }),
    ])
    if (rr.success) setRecords(rr.data)
    if (sr.success) setStudents(sr.data)
  }

  useEffect(() => { if (orgId) load() }, [orgId, filterStudent, filterSeverity, filterResolved])

  const openCreate = () => { setEditing(null); setForm(EMPTY); setMsg(''); setShowModal(true) }
  const openEdit   = (r) => {
    setEditing(r)
    setForm({ studentId: r.student_id, incidentDate: r.incident_date, incidentType: r.incident_type, severity: r.severity, description: r.description, actionTaken: r.action_taken||'', resolved: !!r.resolved, parentNotified: !!r.parent_notified, notes: r.notes||'' })
    setMsg(''); setShowModal(true)
  }

  const save = async () => {
    if (!form.studentId || !form.description) { setMsg('Student and description are required'); return }
    setSaving(true)
    const payload = { orgId, studentId: form.studentId, incidentDate: form.incidentDate, incidentType: form.incidentType, severity: form.severity, description: form.description, actionTaken: form.actionTaken||null, resolved: form.resolved, parentNotified: form.parentNotified, notes: form.notes||null }
    const r = editing
      ? await window.api.dara.updateDisciplineRecord({ ...payload, id: editing.id })
      : await window.api.dara.createDisciplineRecord(payload)
    setSaving(false)
    if (r.success) { setShowModal(false); load() } else setMsg(r.message)
  }

  const del = async (id) => {
    if (!confirm('Delete this discipline record?')) return
    await window.api.dara.deleteDisciplineRecord({ id, orgId })
    load()
  }

  const quickResolve = async (r) => {
    await window.api.dara.updateDisciplineRecord({ ...r, orgId, studentId: r.student_id, incidentDate: r.incident_date, incidentType: r.incident_type, resolved: true, resolvedDate: new Date().toISOString().split('T')[0] })
    load()
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  const filtered = records.filter(r =>
    !search || r.student_name?.toLowerCase().includes(search.toLowerCase()) || r.description?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total:    records.length,
    open:     records.filter(r => !r.resolved).length,
    resolved: records.filter(r =>  r.resolved).length,
    critical: records.filter(r => r.severity === 'critical' || r.severity === 'major').length,
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Discipline Records" subtitle="Track student incidents and disciplinary actions" icon={ShieldAlert}/>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Total Records', value: stats.total, color:'blue' },
          { label:'Open Cases',    value: stats.open,  color:'orange' },
          { label:'Resolved',      value: stats.resolved, color:'green' },
          { label:'Major/Critical', value: stats.critical, color:'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card p-4 text-center">
            <p className={`text-2xl font-bold text-${color}-600 dark:text-${color}-400`}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input className="input pl-8 w-44" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)}/>
          </div>
          <select className="input w-44" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
          <select className="input w-32" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
            <option value="">All Severity</option>
            {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
          </select>
          <select className="input w-32" value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
            <option value="">All Status</option>
            <option value="0">Open</option>
            <option value="1">Resolved</option>
          </select>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Add Record
        </button>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead><tr className="border-b border-gray-100 dark:border-gray-800">
            {['Student','Date','Type','Severity','Description','Action','Status',''].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr></thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {filtered.length === 0
              ? <tr><td colSpan={8} className="py-12 text-center text-gray-400 text-sm">No discipline records found</td></tr>
              : filtered.map(r => (
                <tr key={r.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 ${r.resolved ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm">{r.student_name}</p>
                    <p className="text-xs text-gray-400">{r.student_no}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{r.incident_date}</td>
                  <td className="px-4 py-3 text-sm capitalize text-gray-600">{r.incident_type?.replace(/_/g,' ')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-lg border capitalize ${SEV_COLORS[r.severity]||''}`}>
                      {r.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm max-w-xs truncate">{r.description}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{r.action_taken || '—'}</td>
                  <td className="px-4 py-3">
                    {r.resolved
                      ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle size={12}/> Resolved</span>
                      : <span className="text-xs text-orange-600 font-medium">Open</span>
                    }
                    {r.parent_notified ? <span className="text-xs text-blue-500 block">Parent notified</span> : null}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {!r.resolved && (
                        <button onClick={() => quickResolve(r)} className="btn-icon text-green-600" title="Mark Resolved">
                          <CheckCircle size={14}/>
                        </button>
                      )}
                      <button onClick={() => openEdit(r)} className="btn-icon"><Edit2 size={14}/></button>
                      <button onClick={() => del(r.id)} className="btn-icon text-red-500"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Discipline Record' : 'Add Discipline Record'} width="max-w-lg">
        {msg && <div className="p-3 mb-4 bg-red-50 text-red-700 rounded-xl text-sm">{msg}</div>}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Student <span className="text-red-500">*</span></label>
              <select className="input" value={form.studentId} onChange={set('studentId')}>
                <option value="">— Select Student —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incident Date</label>
              <input type="date" className="input" value={form.incidentDate} onChange={set('incidentDate')}/>
            </div>
            <div>
              <label className="label">Severity</label>
              <select className="input" value={form.severity} onChange={set('severity')}>
                {SEVERITIES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Incident Type</label>
              <select className="input" value={form.incidentType} onChange={set('incidentType')}>
                {INCIDENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description <span className="text-red-500">*</span></label>
            <textarea className="input" rows={3} value={form.description} onChange={set('description')} placeholder="Describe the incident…"/>
          </div>
          <div>
            <label className="label">Action Taken</label>
            <textarea className="input" rows={2} value={form.actionTaken} onChange={set('actionTaken')} placeholder="What action was taken?"/>
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.resolved} onChange={set('resolved')} className="rounded"/>
              Resolved
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={form.parentNotified} onChange={set('parentNotified')} className="rounded"/>
              Parent Notified
            </label>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={form.notes} onChange={set('notes')} placeholder="Additional notes"/>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary">
            {saving ? 'Saving…' : (editing ? 'Update' : 'Add Record')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
