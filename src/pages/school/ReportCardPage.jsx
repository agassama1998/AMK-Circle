import React, { useState, useEffect, useRef } from 'react'
import { FileText, Download, Printer, Search, ChevronDown } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import PageHeader from '../../components/ui/PageHeader'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const GRADE_COLOR = { A:'text-green-600','A+':'text-green-700',B:'text-blue-600','B+':'text-blue-700',C:'text-yellow-600',D:'text-orange-600',F:'text-red-600' }

export default function ReportCardPage() {
  const { orgId } = useAuth()
  const [classes,   setClasses]   = useState([])
  const [students,  setStudents]  = useState([])
  const [exams,     setExams]     = useState([])
  const [grades,    setGrades]    = useState([])   // flat array { exam_id, student_id, marks_obtained, grade_letter }
  const [orgInfo,   setOrgInfo]   = useState(null)

  const [selClass,   setSelClass]   = useState('')
  const [selStudent, setSelStudent] = useState('')
  const [search,     setSearch]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [expanded,   setExpanded]   = useState({})

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      window.api.classes.getAll({ orgId }),
      window.api.settings.getOrg({ orgId }),
    ]).then(([cr, or]) => {
      if (cr.success) setClasses(cr.data)
      if (or.success) setOrgInfo(or.data)
    })
  }, [orgId])

  useEffect(() => {
    if (!orgId || !selClass) { setStudents([]); setExams([]); setGrades([]); return }
    setLoading(true)
    Promise.all([
      window.api.students.getAll({ orgId, classId: selClass }),
      window.api.exams.getAll({ orgId, classId: selClass }),
    ]).then(async ([sr, er]) => {
      const studs = sr.success ? sr.data : []
      const examList = er.success ? er.data : []
      setStudents(studs)
      setExams(examList)

      // Load grades for each exam
      const allGrades = []
      for (const ex of examList) {
        const gr = await window.api.exams.getGrades({ orgId, examId: ex.id })
        if (gr.success) allGrades.push(...gr.data)
      }
      setGrades(allGrades)
      setLoading(false)
    })
  }, [orgId, selClass])

  const filteredStudents = students.filter(s =>
    (!selStudent || String(s.id) === String(selStudent)) &&
    (!search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.student_id.toLowerCase().includes(search.toLowerCase()))
  )

  const getStudentGrade = (studentId, examId) =>
    grades.find(g => String(g.student_id) === String(studentId) && String(g.exam_id) === String(examId))

  const calcAvg = (studentId) => {
    const relevant = grades.filter(g => String(g.student_id) === String(studentId) && g.marks_obtained != null)
    if (relevant.length === 0) return null
    const total = relevant.reduce((sum, g) => {
      const exam = exams.find(e => String(e.id) === String(g.exam_id))
      const pct = exam ? (g.marks_obtained / exam.total_marks) * 100 : g.marks_obtained
      return sum + pct
    }, 0)
    return Math.round(total / relevant.length)
  }

  const overallGrade = (avg) => {
    if (avg === null) return '—'
    if (avg >= 90) return 'A+'
    if (avg >= 80) return 'A'
    if (avg >= 70) return 'B+'
    if (avg >= 60) return 'B'
    if (avg >= 50) return 'C'
    if (avg >= 40) return 'D'
    return 'F'
  }

  const exportPDF = (student) => {
    const doc = new jsPDF()
    const org  = orgInfo?.name || 'AMK Circle'
    const cls  = classes.find(c => String(c.id) === String(selClass))

    doc.setFillColor(21, 128, 61)
    doc.rect(0, 0, 210, 28, 'F')
    doc.setTextColor(255,255,255)
    doc.setFontSize(14); doc.setFont('helvetica','bold')
    doc.text(org, 105, 12, { align: 'center' })
    doc.setFontSize(10); doc.setFont('helvetica','normal')
    doc.text('STUDENT REPORT CARD', 105, 20, { align: 'center' })

    doc.setTextColor(0,0,0)
    doc.setFontSize(11)
    doc.text(`Student: ${student.full_name}`, 14, 38)
    doc.text(`ID: ${student.student_id}`, 14, 46)
    doc.text(`Class: ${cls?.name || '—'}`, 14, 54)
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 140, 38)

    const avg = calcAvg(student.id)
    const grade = overallGrade(avg)
    doc.setFontSize(18); doc.setFont('helvetica','bold')
    doc.setTextColor(21, 128, 61)
    doc.text(`${grade}`, 170, 54)
    doc.setFontSize(9); doc.setFont('helvetica','normal')
    doc.setTextColor(100,100,100)
    doc.text(`Overall: ${avg !== null ? avg + '%' : 'N/A'}`, 157, 61)

    doc.setTextColor(0,0,0)
    const rows = exams.map(ex => {
      const g = getStudentGrade(student.id, ex.id)
      const pct = g?.marks_obtained != null ? Math.round((g.marks_obtained / ex.total_marks) * 100) : null
      return [ex.name, ex.exam_type, ex.exam_date || '—', g ? `${g.marks_obtained}/${ex.total_marks}` : 'N/A', pct !== null ? `${pct}%` : '—', g?.grade_letter || '—', g?.remarks || '']
    })

    autoTable(doc, {
      startY: 70,
      head: [['Exam','Type','Date','Marks','%','Grade','Remarks']],
      body: rows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [21,128,61] },
    })

    const y = doc.lastAutoTable.finalY + 20
    doc.setFontSize(9); doc.setTextColor(100,100,100)
    doc.text('Teacher Signature: _______________________', 14, y + 10)
    doc.text('Principal Signature: _______________________', 120, y + 10)

    doc.save(`report-card-${student.student_id}.pdf`)
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Report Cards" subtitle="Generate and view student academic report cards" icon={FileText}/>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <select className="input w-52" value={selClass} onChange={e => { setSelClass(e.target.value); setSelStudent('') }}>
          <option value="">— Select Class —</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {students.length > 0 && (
          <select className="input w-52" value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
          </select>
        )}
        <div className="relative flex-1 min-w-48">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
          <input className="input pl-8" placeholder="Search student…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {!selClass && (
        <div className="card p-12 text-center text-gray-400">
          <FileText size={40} className="mx-auto mb-3 opacity-30"/>
          <p>Select a class to view report cards</p>
        </div>
      )}

      {loading && <div className="card p-8 text-center text-gray-400"><div className="spinner mx-auto"/></div>}

      {selClass && !loading && (
        <div className="space-y-4">
          {/* Exam headers summary */}
          {exams.length > 0 && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Exams in this class ({exams.length})</p>
              <div className="flex flex-wrap gap-2">
                {exams.map(ex => (
                  <span key={ex.id} className="badge bg-primary-50 text-primary-700 border border-primary-100 text-xs px-2 py-1 rounded-lg">
                    {ex.name} <span className="text-gray-400">· {ex.total_marks}pts</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {filteredStudents.length === 0
            ? <div className="card p-8 text-center text-gray-400 text-sm">No students found</div>
            : filteredStudents.map(student => {
              const avg = calcAvg(student.id)
              const grade = overallGrade(avg)
              const isOpen = expanded[student.id]
              return (
                <div key={student.id} className="card overflow-hidden">
                  {/* Student header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    onClick={() => setExpanded(e => ({ ...e, [student.id]: !e[student.id] }))}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <span className="font-bold text-primary-700 dark:text-primary-400 text-sm">{student.full_name.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{student.full_name}</p>
                        <p className="text-xs text-gray-400">{student.student_id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-lg font-bold ${GRADE_COLOR[grade] || 'text-gray-700'}`}>{grade}</p>
                        <p className="text-xs text-gray-400">{avg !== null ? `${avg}% avg` : 'No grades'}</p>
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); exportPDF(student) }}
                        className="btn-secondary flex items-center gap-1.5 text-xs py-1.5 px-3"
                        title="Export PDF"
                      >
                        <Download size={13}/> PDF
                      </button>
                      <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}/>
                    </div>
                  </div>

                  {/* Grades table */}
                  {isOpen && (
                    <div className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="bg-gray-50 dark:bg-gray-800/50">
                          {['Exam','Type','Date','Marks','%','Grade','Remarks'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                          ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                          {exams.length === 0
                            ? <tr><td colSpan={7} className="py-6 text-center text-gray-400 text-sm">No exams recorded</td></tr>
                            : exams.map(ex => {
                              const g = getStudentGrade(student.id, ex.id)
                              const pct = g?.marks_obtained != null ? Math.round((g.marks_obtained / ex.total_marks) * 100) : null
                              return (
                                <tr key={ex.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                                  <td className="px-4 py-2.5 font-medium text-sm">{ex.name}</td>
                                  <td className="px-4 py-2.5 text-xs text-gray-500 capitalize">{ex.exam_type}</td>
                                  <td className="px-4 py-2.5 text-xs text-gray-500">{ex.exam_date || '—'}</td>
                                  <td className="px-4 py-2.5 text-sm">
                                    {g ? `${g.marks_obtained} / ${ex.total_marks}` : <span className="text-gray-300">N/A</span>}
                                  </td>
                                  <td className="px-4 py-2.5 text-sm font-medium">
                                    {pct !== null ? `${pct}%` : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <span className={`font-bold text-sm ${GRADE_COLOR[g?.grade_letter] || 'text-gray-500'}`}>
                                      {g?.grade_letter || '—'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-gray-400">{g?.remarks || '—'}</td>
                                </tr>
                              )
                            })
                          }
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })
          }
        </div>
      )}
    </div>
  )
}
