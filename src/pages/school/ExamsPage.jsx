import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Trash2, Save, ClipboardCheck, ArrowLeft, CheckCircle } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const EMPTY_EXAM = { name:'', classId:'', subjectId:'', examDate:'', totalMarks:'100', passingMarks:'50', examType:'written', status:'scheduled' }
const EXAM_TYPES = ['written','oral','practical','mcq','project']
const STATUSES   = ['scheduled','ongoing','completed','cancelled']

const GRADE_COLORS = { 'A+':'text-emerald-600','A':'text-emerald-600','A-':'text-emerald-500','B+':'text-blue-600','B':'text-blue-500','B-':'text-blue-400','C+':'text-yellow-600','C':'text-yellow-500','C-':'text-yellow-400','D':'text-orange-500','F':'text-red-500','' :'text-gray-400' }

export default function ExamsPage() {
  const { orgId } = useAuth()
  const [tab, setTab]             = useState('exams') // 'exams' | 'grades'
  const [exams, setExams]         = useState([])
  const [classes, setClasses]     = useState([])
  const [subjects, setSubjects]   = useState([])
  const [filterClass, setFilter]  = useState('')
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [form, setForm]           = useState(EMPTY_EXAM)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  // Grades state
  const [selectedExam, setSelectedExam]   = useState(null)
  const [gradeRows, setGradeRows]         = useState([])
  const [gradeExam, setGradeExam]         = useState(null)
  const [loadingGrades, setLoadingGrades] = useState(false)
  const [gradeSaved, setGradeSaved]       = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [eRes, cRes, sRes] = await Promise.all([
      window.api.exams.getAll({ orgId, classId: filterClass || undefined }),
      window.api.classes.getAll({ orgId }),
      window.api.subjects.getAll({ orgId }),
    ])
    if (eRes.success) setExams(eRes.data)
    if (cRes.success) setClasses(cRes.data)
    if (sRes.success) setSubjects(sRes.data)
    setLoading(false)
  }, [orgId, filterClass])

  useEffect(() => { load() }, [load])

  const openGrades = async (exam) => {
    setSelectedExam(exam); setTab('grades'); setGradeSaved(false)
    setLoadingGrades(true)
    const r = await window.api.exams.getGrades({ examId: exam.id, orgId })
    if (r.success) { setGradeRows(r.data); setGradeExam(r.exam) }
    setLoadingGrades(false)
  }

  const updateGradeRow = (idx, field, value) => {
    setGradeRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  const saveGrades = async () => {
    setSaving(true)
    const r = await window.api.exams.bulkSaveGrades({ orgId, examId: selectedExam.id, grades: gradeRows })
    setSaving(false)
    if (r.success) { setGradeSaved(true); load() }
    else setMsg(r.message)
  }

  const openNew  = () => { setEditing(null); setForm(EMPTY_EXAM); setShowForm(true); setMsg('') }
  const openEdit = (e) => {
    setEditing(e)
    setForm({ name: e.name, classId: e.class_id||'', subjectId: e.subject_id||'', examDate: e.exam_date||'', totalMarks: e.total_marks||100, passingMarks: e.passing_marks||50, examType: e.exam_type||'written', status: e.status||'scheduled' })
    setShowForm(true); setMsg('')
  }

  const saveExam = async () => {
    if (!form.name.trim()) { setMsg('Exam name is required'); return }
    setSaving(true)
    const data = { orgId, ...form, classId: form.classId||null, subjectId: form.subjectId||null }
    const r = editing
      ? await window.api.exams.update({ ...data, id: editing.id })
      : await window.api.exams.create(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => {
    if (!confirm('Delete this exam and all its grades?')) return
    const r = await window.api.exams.delete({ id, orgId })
    if (r.success) load()
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  // Auto-filter subjects by selected class in form
  const formSubjects = form.classId ? subjects.filter(s => String(s.class_id) === String(form.classId)) : subjects

  const pct = (marks, total) => total > 0 ? Math.round((marks / total) * 100) : 0

  return (
    <div className="space-y-5 animate-fade-in">
      {tab === 'exams' ? (
        <>
          <PageHeader
            title="Exams"
            subtitle={`${exams.length} exams`}
            icon={ClipboardCheck}
            actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Create Exam</button>}
          />

          <div className="flex gap-3 items-center">
            <select className="input max-w-xs" value={filterClass} onChange={e => setFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>{['Exam Name','Type','Class','Subject','Date','Marks','Passing','Grades','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={10} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
                  ) : exams.length === 0 ? (
                    <tr><td colSpan={10} className="td py-12 text-center text-gray-400">No exams yet. Create one to get started.</td></tr>
                  ) : exams.map(e => (
                    <tr key={e.id} className="tr">
                      <td className="td font-semibold">{e.name}</td>
                      <td className="td capitalize text-sm text-gray-500">{e.exam_type}</td>
                      <td className="td text-sm">{e.class_name || '—'}</td>
                      <td className="td text-sm text-gray-500">{e.subject_name || '—'}</td>
                      <td className="td text-sm">{e.exam_date || '—'}</td>
                      <td className="td text-sm font-medium">{e.total_marks}</td>
                      <td className="td text-sm text-gray-500">{e.passing_marks}</td>
                      <td className="td text-center text-sm">{e.grades_entered || 0}</td>
                      <td className="td">
                        <span className={`badge capitalize ${e.status==='completed'?'badge-green':e.status==='ongoing'?'badge-blue':e.status==='cancelled'?'badge-red':'badge-gray'}`}>{e.status}</span>
                      </td>
                      <td className="td">
                        <div className="flex gap-1">
                          <button onClick={() => openGrades(e)} className="btn-icon text-blue-500 hover:text-blue-700" title="Enter Grades"><ClipboardCheck size={14} /></button>
                          <button onClick={() => openEdit(e)} className="btn-icon"><Edit2 size={14} /></button>
                          <button onClick={() => del(e.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        // ── Grades entry view ────────────────────────────────────────────────
        <>
          <div className="flex items-center gap-3">
            <button onClick={() => { setTab('exams'); setSelectedExam(null); setGradeSaved(false) }} className="btn-secondary flex items-center gap-2">
              <ArrowLeft size={16} /> Back to Exams
            </button>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedExam?.name}</h2>
              <p className="text-sm text-gray-500">{selectedExam?.class_name || 'No class'} · Total: {selectedExam?.total_marks} marks · Passing: {selectedExam?.passing_marks}</p>
            </div>
          </div>

          {gradeSaved && (
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl px-4 py-3 text-sm font-medium">
              <CheckCircle size={16} /> Grades saved successfully
            </div>
          )}

          {msg && <p className="text-sm text-red-500">{msg}</p>}

          <div className="card overflow-hidden">
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="th">Student ID</th>
                    <th className="th">Student Name</th>
                    <th className="th">Marks Obtained <span className="text-gray-400 font-normal">/ {selectedExam?.total_marks}</span></th>
                    <th className="th">Grade</th>
                    <th className="th">% Score</th>
                    <th className="th">Result</th>
                    <th className="th">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingGrades ? (
                    <tr><td colSpan={7} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
                  ) : gradeRows.length === 0 ? (
                    <tr><td colSpan={7} className="td py-12 text-center text-gray-400">No students in this class. Assign students to the class first.</td></tr>
                  ) : gradeRows.map((row, idx) => {
                    const marks = Number(row.marks_obtained)
                    const total = Number(selectedExam?.total_marks || 100)
                    const passing = Number(selectedExam?.passing_marks || 50)
                    const scored = row.marks_obtained !== '' && row.marks_obtained !== null
                    const passed = scored && marks >= passing
                    const score  = scored ? pct(marks, total) : null
                    return (
                      <tr key={row.student_id} className="tr">
                        <td className="td font-mono text-xs text-gray-500">{row.student_code}</td>
                        <td className="td font-medium">{row.student_name}</td>
                        <td className="td w-32">
                          <input
                            type="number" min="0" max={selectedExam?.total_marks}
                            className="input text-center py-1 px-2"
                            value={row.marks_obtained}
                            onChange={e => updateGradeRow(idx, 'marks_obtained', e.target.value)}
                            placeholder="—"
                          />
                        </td>
                        <td className={`td font-bold text-lg ${GRADE_COLORS[row.grade_letter] || 'text-gray-400'}`}>
                          {row.grade_letter || (scored ? '—' : '')}
                        </td>
                        <td className="td text-sm text-gray-500">
                          {score !== null ? `${score}%` : '—'}
                        </td>
                        <td className="td">
                          {scored ? (
                            <span className={`badge ${passed ? 'badge-green' : 'badge-red'}`}>{passed ? 'Pass' : 'Fail'}</span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="td w-40">
                          <input
                            className="input py-1 px-2 text-sm"
                            value={row.remarks}
                            onChange={e => updateGradeRow(idx, 'remarks', e.target.value)}
                            placeholder="Optional"
                          />
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {gradeRows.length > 0 && (
              <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                <button onClick={saveGrades} disabled={saving} className="btn-primary">
                  <Save size={16} />{saving ? 'Saving...' : 'Save All Grades'}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {/* Exam form modal */}
      <Modal
        open={showForm} onClose={() => setShowForm(false)}
        title={editing ? 'Edit Exam' : 'Create Exam'}
        size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveExam} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Exam Name *</label>
            <input className="input" value={form.name} onChange={set('name')} placeholder="e.g. Mid-Term Exam, Final Quran Test" />
          </div>
          <div>
            <label className="label">Class</label>
            <select className="input" value={form.classId} onChange={e => { set('classId')(e); setForm(f => ({ ...f, subjectId: '' })) }}>
              <option value="">— All / No class —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Subject</label>
            <select className="input" value={form.subjectId} onChange={set('subjectId')}>
              <option value="">— No subject —</option>
              {formSubjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Exam Date</label>
            <input type="date" className="input" value={form.examDate} onChange={set('examDate')} />
          </div>
          <div>
            <label className="label">Exam Type</label>
            <select className="input" value={form.examType} onChange={set('examType')}>
              {EXAM_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Total Marks</label>
            <input type="number" className="input" value={form.totalMarks} onChange={set('totalMarks')} min="1" />
          </div>
          <div>
            <label className="label">Passing Marks</label>
            <input type="number" className="input" value={form.passingMarks} onChange={set('passingMarks')} min="0" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
