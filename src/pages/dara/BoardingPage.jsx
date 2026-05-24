import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Plus, Edit2, Save, Bed } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

export default function BoardingPage() {
  const { orgId } = useAuth()
  const [tab, setTab] = useState(0)
  const [dorms,       setDorms]       = useState([])
  const [assignments, setAssignments] = useState([])
  const [students,    setStudents]    = useState([])
  const [teachers,    setTeachers]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showDorm,    setShowDorm]    = useState(false)
  const [showAssign,  setShowAssign]  = useState(false)
  const [editDorm,    setEditDorm]    = useState(null)
  const [dormForm,    setDormForm]    = useState({ name:'', capacity:10, supervisorId:'', gender:'male', floor:'', notes:'' })
  const [assignForm,  setAssignForm]  = useState({ studentId:'', dormitoryId:'', roomNumber:'', bedNumber:'', checkInDate: new Date().toISOString().split('T')[0], boardingFee:'', mealPlan:'full', notes:'' })

  const load = async () => {
    setLoading(true)
    const [dr, ar, sr, tr] = await Promise.all([
      window.api.dara.getDormitories({ orgId }),
      window.api.dara.getAssignments({ orgId }),
      window.api.students.getAll({ orgId, status:'active' }),
      window.api.teachers.getAll({ orgId, status:'active' }),
    ])
    if (dr.success) setDorms(dr.data)
    if (ar.success) setAssignments(ar.data)
    if (sr.success) setStudents(sr.data)
    if (tr.success) setTeachers(tr.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId])

  const saveDorm = async () => {
    if (!dormForm.name) return
    const data = { orgId, ...dormForm, supervisorId: dormForm.supervisorId || null }
    const r = editDorm ? await window.api.dara.updateDormitory({ ...data, id: editDorm.id }) : await window.api.dara.createDormitory(data)
    if (r.success) { setShowDorm(false); load() }
  }

  const saveAssignment = async () => {
    if (!assignForm.studentId) return
    const r = await window.api.dara.assignBoarding({ orgId, ...assignForm, dormitoryId: assignForm.dormitoryId || null, boardingFee: parseFloat(assignForm.boardingFee)||0 })
    if (r.success) { setShowAssign(false); load() }
  }

  const setD = k => e => setDormForm(f => ({ ...f, [k]: e.target.value }))
  const setA = k => e => setAssignForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Boarding Management" subtitle="Dormitories and student assignments" icon={Bed}
        actions={
          <div className="flex gap-2">
            <button onClick={() => { setEditDorm(null); setDormForm({ name:'', capacity:10, supervisorId:'', gender:'male', floor:'', notes:'' }); setShowDorm(true) }} className="btn-secondary"><Plus size={15} /> Dormitory</button>
            <button onClick={() => { setAssignForm({ studentId:'', dormitoryId:'', roomNumber:'', bedNumber:'', checkInDate: new Date().toISOString().split('T')[0], boardingFee:'', mealPlan:'full', notes:'' }); setShowAssign(true) }} className="btn-primary"><Plus size={15} /> Assign Student</button>
          </div>
        }
      />

      <div className="tab-bar">
        <button className={`tab-btn ${tab===0?'active':''}`} onClick={() => setTab(0)}>Dormitories ({dorms.length})</button>
        <button className={`tab-btn ${tab===1?'active':''}`} onClick={() => setTab(1)}>Assignments ({assignments.length})</button>
      </div>

      {tab === 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? <div className="col-span-3 text-center py-10"><div className="spinner mx-auto" /></div>
          : dorms.length === 0 ? <div className="col-span-3 empty-state card">No dormitories yet.</div>
          : dorms.map(d => (
            <div key={d.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-gray-400 capitalize">{d.gender} · Floor: {d.floor || '—'}</p>
                </div>
                <button onClick={() => { setEditDorm(d); setDormForm({ name:d.name, capacity:d.capacity, supervisorId:d.supervisor_id||'', gender:d.gender, floor:d.floor||'', notes:d.notes||'' }); setShowDorm(true) }} className="btn-icon"><Edit2 size={14} /></button>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-500">Occupied</span>
                <span className="font-bold text-primary-700">{d.occupied || 0} / {d.capacity}</span>
              </div>
              <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-primary-500 rounded-full" style={{ width: `${Math.min(100,(d.occupied||0)*100/d.capacity)}%` }} />
              </div>
              {d.supervisor_name && <p className="text-xs text-gray-400 mt-2">👤 Supervisor: {d.supervisor_name}</p>}
            </div>
          ))}
        </div>
      )}

      {tab === 1 && (
        <div className="card overflow-hidden">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>{['Student','Gender','Dormitory','Room','Bed','Check-in','Fee','Meals','Status'].map(h => <th key={h} className="th">{h}</th>)}</tr>
              </thead>
              <tbody>
                {loading ? <tr><td colSpan={9} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
                : assignments.length === 0 ? <tr><td colSpan={9} className="td py-10 text-center text-gray-400">No assignments yet</td></tr>
                : assignments.map(a => (
                  <tr key={a.id} className="tr">
                    <td className="td">
                      <div className="font-medium">{a.student_name}</div>
                      <div className="text-xs text-gray-400">{a.student_no}</div>
                    </td>
                    <td className="td capitalize text-sm">{a.student_gender}</td>
                    <td className="td text-sm">{a.dormitory_name || '—'}</td>
                    <td className="td text-sm">{a.room_number || '—'}</td>
                    <td className="td text-sm">{a.bed_number || '—'}</td>
                    <td className="td text-sm text-gray-500">{a.check_in_date || '—'}</td>
                    <td className="td font-medium">{a.boarding_fee ? `$${a.boarding_fee}` : '—'}</td>
                    <td className="td capitalize text-sm">{a.meal_plan}</td>
                    <td className="td"><span className={`badge capitalize ${a.status==='active'?'badge-green':'badge-gray'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dormitory Modal */}
      <Modal open={showDorm} onClose={() => setShowDorm(false)} title={editDorm ? 'Edit Dormitory' : 'Add Dormitory'}
        footer={<>
          <button onClick={() => setShowDorm(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveDorm} className="btn-primary"><Save size={15} /> Save</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">Name *</label><input className="input" value={dormForm.name} onChange={setD('name')} /></div>
          <div><label className="label">Capacity</label><input type="number" className="input" value={dormForm.capacity} onChange={setD('capacity')} /></div>
          <div><label className="label">Gender</label><select className="input" value={dormForm.gender} onChange={setD('gender')}><option value="male">Male</option><option value="female">Female</option><option value="mixed">Mixed</option></select></div>
          <div><label className="label">Floor</label><input className="input" value={dormForm.floor} onChange={setD('floor')} /></div>
          <div>
            <label className="label">Supervisor</label>
            <select className="input" value={dormForm.supervisorId} onChange={setD('supervisorId')}>
              <option value="">None</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div className="col-span-2"><label className="label">Notes</label><textarea className="input h-16 resize-none" value={dormForm.notes} onChange={setD('notes')} /></div>
        </div>
      </Modal>

      {/* Assignment Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Student to Boarding"
        footer={<>
          <button onClick={() => setShowAssign(false)} className="btn-secondary">Cancel</button>
          <button onClick={saveAssignment} className="btn-primary"><Save size={15} /> Assign</button>
        </>}
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Student *</label>
            <select className="input" value={assignForm.studentId} onChange={setA('studentId')}>
              <option value="">Select student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Dormitory</label>
            <select className="input" value={assignForm.dormitoryId} onChange={setA('dormitoryId')}>
              <option value="">Select dorm</option>
              {dorms.map(d => <option key={d.id} value={d.id}>{d.name} ({d.gender})</option>)}
            </select>
          </div>
          <div><label className="label">Room Number</label><input className="input" value={assignForm.roomNumber} onChange={setA('roomNumber')} /></div>
          <div><label className="label">Bed Number</label><input className="input" value={assignForm.bedNumber} onChange={setA('bedNumber')} /></div>
          <div><label className="label">Check-in Date</label><input type="date" className="input" value={assignForm.checkInDate} onChange={setA('checkInDate')} /></div>
          <div><label className="label">Boarding Fee ($)</label><input type="number" className="input" value={assignForm.boardingFee} onChange={setA('boardingFee')} /></div>
          <div>
            <label className="label">Meal Plan</label>
            <select className="input" value={assignForm.mealPlan} onChange={setA('mealPlan')}>
              {['full','half','breakfast_only','none'].map(m => <option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
