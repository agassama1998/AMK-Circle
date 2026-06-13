import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Plus, Save, Heart, Edit2 } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

export default function SalariesPage() {
  const { orgId } = useAuth()
  const { currencySymbol } = useSettings()
  const [salaries,  setSalaries]  = useState([])
  const [teachers,  setTeachers]  = useState([])
  const [filterMonth, setFilterMonth] = useState('')
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editing,   setEditing]   = useState(null)
  const [form,      setForm]      = useState({ teacherId:'', month: new Date().toISOString().slice(0,7), baseAmount:'', allowances:'', deductions:'', paymentDate: new Date().toISOString().split('T')[0], status:'paid', notes:'' })
  const [saving,    setSaving]    = useState(false)

  const load = async () => {
    setLoading(true)
    const [sr, tr] = await Promise.all([
      window.api.finance.getSalaries({ orgId, month: filterMonth||undefined }),
      window.api.teachers.getAll({ orgId, status:'active' }),
    ])
    if (sr.success) setSalaries(sr.data)
    if (tr.success) setTeachers(tr.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [orgId, filterMonth])

  const openNew  = () => { setEditing(null); setForm({ teacherId:'', month: new Date().toISOString().slice(0,7), baseAmount:'', allowances:'0', deductions:'0', paymentDate: new Date().toISOString().split('T')[0], status:'paid', notes:'' }); setShowForm(true) }
  const openEdit = (s) => { setEditing(s); setForm({ teacherId: s.teacher_id, month:s.month, baseAmount:s.base_amount, allowances:s.allowances, deductions:s.deductions, paymentDate:s.payment_date||'', status:s.status, notes:s.notes||'' }); setShowForm(true) }

  const save = async () => {
    if (!form.teacherId || !form.baseAmount) return
    setSaving(true)
    const data = { orgId, ...form, baseAmount:parseFloat(form.baseAmount), allowances:parseFloat(form.allowances)||0, deductions:parseFloat(form.deductions)||0 }
    const r = editing ? await window.api.finance.updateSalary({ ...data, id: editing.id }) : await window.api.finance.createSalary(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))
  const net = f => (parseFloat(f.baseAmount)||0) + (parseFloat(f.allowances)||0) - (parseFloat(f.deductions)||0)
  const total = salaries.reduce((s, r) => s + (r.net_amount||0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Salary Management" subtitle={`Total: ${currencySymbol}${total.toLocaleString()}`} icon={Heart}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Salary</button>}
      />

      <div className="flex gap-3">
        <input type="month" className="input w-auto" value={filterMonth} onChange={e => setFilterMonth(e.target.value)} />
        {filterMonth && <button onClick={() => setFilterMonth('')} className="btn-secondary">Clear</button>}
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Teacher','Month','Base','Allowances','Deductions','Net','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
              : salaries.length === 0 ? <tr><td colSpan={8} className="td py-10 text-center text-gray-400">No salary records</td></tr>
              : salaries.map(s => (
                <tr key={s.id} className="tr">
                  <td className="td">
                    <div className="font-medium">{s.teacher_name}</div>
                    <div className="text-xs text-gray-400">{s.employee_id} · {s.specialization}</div>
                  </td>
                  <td className="td font-mono text-sm">{s.month}</td>
                  <td className="td">{currencySymbol}{Number(s.base_amount).toLocaleString()}</td>
                  <td className="td text-green-600">+{currencySymbol}{Number(s.allowances||0).toLocaleString()}</td>
                  <td className="td text-red-500">-{currencySymbol}{Number(s.deductions||0).toLocaleString()}</td>
                  <td className="td font-bold text-primary-700 dark:text-primary-400">{currencySymbol}{Number(s.net_amount).toLocaleString()}</td>
                  <td className="td"><span className={`badge capitalize ${s.status==='paid'?'badge-green':'badge-gold'}`}>{s.status}</span></td>
                  <td className="td"><button onClick={() => openEdit(s)} className="btn-icon"><Edit2 size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Salary' : 'Add Salary Record'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> Save</button>
        </>}
      >
        <div className="space-y-3">
          <div>
            <label className="label">Teacher *</label>
            <select className="input" value={form.teacherId} onChange={set('teacherId')} disabled={!!editing}>
              <option value="">Select teacher</option>
              {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div><label className="label">Month *</label><input type="month" className="input" value={form.month} onChange={set('month')} disabled={!!editing} /></div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">Base ({currencySymbol}) *</label><input type="number" className="input" value={form.baseAmount} onChange={set('baseAmount')} /></div>
            <div><label className="label">Allowances</label><input type="number" className="input" value={form.allowances} onChange={set('allowances')} /></div>
            <div><label className="label">Deductions</label><input type="number" className="input" value={form.deductions} onChange={set('deductions')} /></div>
          </div>
          <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-center">
            <span className="text-sm text-gray-500">Net Amount: </span>
            <span className="text-xl font-bold text-primary-700">{currencySymbol}{net(form).toLocaleString()}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Payment Date</label><input type="date" className="input" value={form.paymentDate} onChange={set('paymentDate')} /></div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {['paid','pending','partial'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
