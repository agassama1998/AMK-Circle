import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Plus, Search, Edit2, Trash2, Save, DollarSign } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const CATEGORIES = ['utilities','supplies','maintenance','salaries','rent','insurance','marketing','food','transport','other']
const EMPTY = { category:'utilities', description:'', amount:'', date: new Date().toISOString().split('T')[0], vendor:'', receiptRef:'', status:'approved', notes:'' }

export default function ExpensesPage() {
  const { orgId } = useAuth()
  const { currencySymbol } = useSettings()
  const [expenses, setExpenses] = useState([])
  const [search,   setSearch]   = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await window.api.finance.getExpenses({ orgId, search, category: filterCat })
    if (r.success) setExpenses(r.data)
    setLoading(false)
  }, [orgId, search, filterCat])

  useEffect(() => { load() }, [load])

  const openNew  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (e) => { setEditing(e); setForm({ category:e.category, description:e.description, amount:e.amount, date:e.date, vendor:e.vendor||'', receiptRef:e.receipt_ref||'', status:e.status, notes:e.notes||'' }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.description || !form.amount) { setMsg('Description and amount are required'); return }
    setSaving(true)
    const data = { orgId, ...form, amount: parseFloat(form.amount) }
    const r = editing ? await window.api.finance.updateExpense({ ...data, id: editing.id }) : await window.api.finance.createExpense(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Delete this expense?')) { await window.api.finance.deleteExpense({ id, orgId }); load() } }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  const totalAmount = expenses.reduce((s, e) => s + (e.amount || 0), 0)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Expenses" subtitle={`${expenses.length} records · Total: ${currencySymbol}${totalAmount.toLocaleString()}`} icon={DollarSign}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Add Expense</button>}
      />

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search expenses..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Date','Category','Description','Amount','Vendor','Receipt Ref','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="td py-10 text-center"><div className="spinner mx-auto" /></td></tr>
              : expenses.length === 0 ? <tr><td colSpan={8} className="td py-10 text-center text-gray-400">No expenses found</td></tr>
              : expenses.map(e => (
                <tr key={e.id} className="tr">
                  <td className="td text-sm text-gray-500">{e.date}</td>
                  <td className="td"><span className="badge badge-gray capitalize">{e.category}</span></td>
                  <td className="td font-medium">{e.description}</td>
                  <td className="td font-bold text-red-600">{currencySymbol}{Number(e.amount).toLocaleString()}</td>
                  <td className="td text-sm text-gray-500">{e.vendor || '—'}</td>
                  <td className="td text-xs font-mono text-gray-400">{e.receipt_ref || '—'}</td>
                  <td className="td"><span className={`badge capitalize ${e.status==='approved'?'badge-green':'badge-gold'}`}>{e.status}</span></td>
                  <td className="td">
                    <div className="flex gap-1">
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Expense' : 'Add Expense'} size="md"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} /> Save</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="space-y-3">
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={set('category')}>
              {CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
            </select>
          </div>
          <div><label className="label">Description *</label><input className="input" value={form.description} onChange={set('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Amount ({currencySymbol}) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={set('amount')} /></div>
            <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Vendor</label><input className="input" value={form.vendor} onChange={set('vendor')} /></div>
            <div><label className="label">Receipt Ref</label><input className="input" value={form.receiptRef} onChange={set('receiptRef')} /></div>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {['approved','pending','rejected'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
