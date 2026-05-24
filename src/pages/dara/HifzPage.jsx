import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Search, Save, BookMarked, Star, Trophy } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const MILESTONE_TYPES = ['juz_complete','half_complete','full_complete','page_goal','surah_complete','exam_pass']
const GRADES = ['Excellent','Very Good','Good','Satisfactory','Needs Improvement']

export default function HifzPage() {
  const { orgId } = useAuth()
  const [progress, setProgress] = useState([])
  const [classes,  setClasses]  = useState([])
  const [teachers, setTeachers] = useState([])
  const [search,   setSearch]   = useState('')
  const [classId,  setClassId]  = useState('')
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)
  const [milestones, setMilestones] = useState([])
  const [showModal, setShowModal]   = useState(false)
  const [form, setForm] = useState({ milestoneType:'juz_complete', juzNumber:'', surahName:'', pagesCompleted:'', completedDate: new Date().toISOString().split('T')[0], verifiedBy:'', grade:'', notes:'' })

  const load = async () => {
    setLoading(true)
    const [pr, cl, te] = await Promise.all([
      window.api.dara.getHifzProgress({ orgId, classId: classId||undefined, search: search||undefined }),
      window.api.classes.getAll({ orgId }),
      window.api.teachers.getAll({ orgId, status: 'active' }),
    ])
    if (pr.success) setProgress(pr.data)
    if (cl.success) setClasses(cl.data)
    if (te.success) setTeachers(te.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId, search, classId])

  const openStudent = async (s) => {
    setSelected(s)
    const r = await window.api.dara.getMilestones({ orgId, studentId: s.id })
    if (r.success) setMilestones(r.data)
  }

  const saveMilestone = async () => {
    if (!form.milestoneType || !form.completedDate) return
    const r = await window.api.dara.addMilestone({ orgId, studentId: selected.id, ...form, verifiedBy: form.verifiedBy || null, pagesCompleted: form.pagesCompleted || null, juzNumber: form.juzNumber || null })
    if (r.success) {
      const m = await window.api.dara.getMilestones({ orgId, studentId: selected.id })
      if (m.success) setMilestones(m.data)
      setShowModal(false)
      load()
    }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const MILESTONE_LABELS = { juz_complete:'Juz Complete', half_complete:'Half Quran', full_complete:'Full Quran', page_goal:'Page Goal', surah_complete:'Surah Complete', exam_pass:'Exam Passed' }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Hifz Progress Tracker" subtitle="Quran memorization tracking & milestones" icon={BookMarked} />

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={classId} onChange={e => setClassId(e.target.value)}>
          <option value="">All Classes</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Progress cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12"><div className="spinner mx-auto" /></div>
        ) : progress.length === 0 ? (
          <div className="col-span-3 empty-state card">No students found</div>
        ) : progress.map(s => (
          <button key={s.id} onClick={() => openStudent(s)} className="card p-5 text-left hover:shadow-card-hover transition-all">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{s.full_name}</p>
                {s.arabic_name && <p className="text-xs text-gray-400 font-arabic">{s.arabic_name}</p>}
                <p className="text-xs text-gray-400 mt-0.5">{s.class_name || 'No Class'}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary-700 dark:text-primary-400">{s.percent_complete || 0}%</p>
                <p className="text-xs text-gray-400">complete</p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="mb-3">
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary-600 to-gold-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, s.percent_complete || 0)}%` }} />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>📖 {s.pages_memorized || 0} / 604 pages</span>
              <span className="flex items-center gap-1">
                <Trophy size={12} className="text-gold-500" />
                {s.milestones_completed || 0} milestones
              </span>
              <span>🗓 {s.total_sessions || 0} sessions</span>
            </div>
          </button>
        ))}
      </div>

      {/* Student Detail Modal */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={`${selected.full_name} — Hifz Record`} size="lg">
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Overall Progress</span>
              <span className="font-bold text-primary-700">{selected.percent_complete || 0}%</span>
            </div>
            <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary-600 to-gold-500 rounded-full"
                style={{ width: `${Math.min(100, selected.percent_complete || 0)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>{selected.pages_memorized || 0} pages memorized</span>
              <span>{604 - (selected.pages_memorized || 0)} remaining</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-3">
            <h4 className="section-title">Milestones ({milestones.length})</h4>
            <button onClick={() => setShowModal(true)} className="btn-primary btn-sm"><Plus size={13} /> Add Milestone</button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {milestones.map(m => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                <div className="w-8 h-8 bg-gold-100 dark:bg-gold-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Star size={14} className="text-gold-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize">{MILESTONE_LABELS[m.milestone_type] || m.milestone_type}</p>
                  <p className="text-xs text-gray-400">
                    {m.completed_date} · {m.verified_by_name || 'Self'} {m.grade ? `· ${m.grade}` : ''}
                  </p>
                </div>
                {m.juz_number && <span className="badge badge-blue text-xs">Juz {m.juz_number}</span>}
                {m.pages_completed && <span className="text-xs text-gray-400">{m.pages_completed} pages</span>}
              </div>
            ))}
            {!milestones.length && <p className="text-gray-400 text-sm text-center py-6">No milestones recorded yet</p>}
          </div>
        </Modal>
      )}

      {/* Add Milestone Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Milestone"
        footer={<>
          <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveMilestone} className="btn-primary"><Save size={15} /> Save</button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Milestone Type *</label>
            <select className="input" value={form.milestoneType} onChange={set('milestoneType')}>
              {Object.entries(MILESTONE_LABELS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Juz Number</label><input type="number" min="1" max="30" className="input" value={form.juzNumber} onChange={set('juzNumber')} /></div>
            <div><label className="label">Pages Completed</label><input type="number" className="input" value={form.pagesCompleted} onChange={set('pagesCompleted')} /></div>
          </div>
          <div><label className="label">Surah Name</label><input className="input" value={form.surahName} onChange={set('surahName')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Completed Date</label><input type="date" className="input" value={form.completedDate} onChange={set('completedDate')} /></div>
            <div>
              <label className="label">Grade</label>
              <select className="input" value={form.grade} onChange={set('grade')}>
                <option value="">Select</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Verified By</label>
            <select className="input" value={form.verifiedBy} onChange={set('verifiedBy')}>
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
