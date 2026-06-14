import React, { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Plus, Search, Edit2, Trash2, Save, Wallet, Printer } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'
import StatsCard from '../../components/ui/StatsCard'
import { generateReceipt } from '../../utils/pdf'

const PAYMENT_TYPES = ['tuition','donation','zakat','sadaqah','boarding','registration','exam_fee','books','other']
const PAYMENT_METHODS = ['cash','check','card','bank_transfer','online','zelle','paypal']
const EMPTY = { personName:'', personEmail:'', personPhone:'', personAddress:'', studentId:'', amount:'', paymentType:'tuition', paymentMethod:'cash', status:'paid', description:'', notes:'', date: new Date().toISOString().split('T')[0] }

const TYPE_COLOR = { tuition:'badge-blue', donation:'badge-green', zakat:'badge-gold', sadaqah:'badge-green', boarding:'badge-purple', registration:'badge-blue', exam_fee:'badge-blue', books:'badge-gray', other:'badge-gray' }

export default function FinancePage() {
  const { orgId, user } = useAuth()
  const { currencySymbol, fmtCurrencyInt, receiptPrefix } = useSettings()
  const [payments, setPayments] = useState([])
  const [students, setStudents] = useState([])
  const [summary,  setSummary]  = useState(null)
  const [search,   setSearch]   = useState('')
  const [filterType,   setFilterType]   = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading,  setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing,  setEditing]  = useState(null)
  const [form,     setForm]     = useState(EMPTY)
  const [nextReceipt, setNextReceipt] = useState('')
  const [saving,   setSaving]   = useState(false)
  const [msg,      setMsg]      = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, sr, sm] = await Promise.all([
      window.api.finance.getPayments({ orgId, search, type: filterType, status: filterStatus }),
      window.api.students.getAll({ orgId, status:'active' }),
      window.api.finance.getSummary({ orgId }),
    ])
    if (pr.success) setPayments(pr.data)
    if (sr.success) setStudents(sr.data)
    if (sm.success) setSummary(sm.data)
    setLoading(false)
  }, [orgId, search, filterType, filterStatus])

  useEffect(() => { load() }, [load])

  const openNew = async () => {
    setEditing(null)
    const rn = await window.api.finance.getNextReceiptNumber({ orgId })
    setNextReceipt(rn.receiptNumber || '')
    setForm({ ...EMPTY, receiptNumber: rn.receiptNumber })
    setShowForm(true)
    setMsg('')
  }

  const openEdit = (p) => {
    setEditing(p)
    setForm({ personName:p.person_name, personEmail:p.person_email||'', personPhone:p.person_phone||'', personAddress:p.person_address||'', studentId:p.student_id||'', amount:p.amount, paymentType:p.payment_type, paymentMethod:p.payment_method, status:p.status, description:p.description||'', notes:p.notes||'', date:p.date, receiptNumber:p.receipt_number })
    setShowForm(true)
    setMsg('')
  }

  const save = async () => {
    if (!form.personName || !form.amount || !form.paymentType) { setMsg('Name, amount and type are required'); return }
    setSaving(true)
    const data = { orgId, processedBy: user?.id, ...form, studentId: form.studentId || null, amount: parseFloat(form.amount) }
    const r = editing
      ? await window.api.finance.updatePayment({ ...data, id: editing.id })
      : await window.api.finance.createPayment(data)
    setSaving(false)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Delete this payment?')) { await window.api.finance.deletePayment({ id, orgId }); load() } }

  const printReceipt = async (p) => {
    try {
      const orgR = await window.api.settings.getOrg({ orgId })
      const org  = { ...(orgR.success ? orgR.data : null), currency_symbol: currencySymbol, receipt_prefix: receiptPrefix }
      await generateReceipt(p, org)
    } catch (e) { alert('Could not generate receipt: ' + e.message) }
  }

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Payments & Finance" subtitle="Tuition, donations, zakat & all income" icon={Wallet}
        actions={<button onClick={openNew} className="btn-primary"><Plus size={16} /> Record Payment</button>}
      />

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard icon={Wallet} label="Total Income"   value={fmtCurrencyInt(summary.totalIncome)}   color="primary" />
          <StatsCard icon={Wallet} label="Donations"      value={fmtCurrencyInt(summary.totalIncome - (summary.byType?.find(t=>t.payment_type==='tuition')?.total||0))} color="gold" />
          <StatsCard icon={Wallet} label="Tuition"        value={fmtCurrencyInt(summary.byType?.find(t=>t.payment_type==='tuition')?.total||0)} color="blue" />
          <StatsCard icon={Wallet} label="Net Balance"    value={fmtCurrencyInt(summary.totalIncome - summary.totalExpense)} color="green" />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search name, receipt..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {PAYMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
        </select>
        <select className="input w-auto" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="refunded">Refunded</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>{['Receipt','Date','Person','Student','Type','Method','Amount','Status','Actions'].map(h => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={9} className="td py-12 text-center"><div className="spinner mx-auto" /></td></tr>
              : payments.length === 0 ? <tr><td colSpan={9} className="td py-12 text-center text-gray-400">No payments found</td></tr>
              : payments.map(p => (
                <tr key={p.id} className="tr">
                  <td className="td font-mono text-xs text-gray-500">{p.receipt_number}</td>
                  <td className="td text-sm text-gray-500">{p.date}</td>
                  <td className="td">
                    <div className="font-medium">{p.person_name}</div>
                    {p.person_phone && <div className="text-xs text-gray-400">{p.person_phone}</div>}
                  </td>
                  <td className="td text-sm text-gray-500">{p.student_name || '—'}</td>
                  <td className="td"><span className={`badge capitalize ${TYPE_COLOR[p.payment_type] || 'badge-gray'}`}>{p.payment_type}</span></td>
                  <td className="td capitalize text-sm text-gray-500">{p.payment_method}</td>
                  <td className="td font-bold text-primary-700 dark:text-primary-400">{currencySymbol}{Number(p.amount).toLocaleString()}</td>
                  <td className="td"><span className={`badge capitalize ${p.status==='paid'?'badge-green':p.status==='pending'?'badge-gold':'badge-gray'}`}>{p.status}</span></td>
                  <td className="td">
                    <div className="flex gap-1">
                      <button onClick={() => printReceipt(p)} className="btn-icon text-blue-500 hover:text-blue-700" title="Print Receipt"><Printer size={14} /></button>
                      <button onClick={() => openEdit(p)} className="btn-icon" title="Edit"><Edit2 size={14} /></button>
                      <button onClick={() => del(p.id)} className="btn-icon text-red-400 hover:text-red-600" title="Delete"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Form Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Payment' : 'Record Payment'} size="lg"
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-primary"><Save size={16} />{saving ? 'Saving...' : 'Save Payment'}</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Receipt # ({receiptPrefix}-)</label>
            <input className="input font-mono" value={form.receiptNumber || nextReceipt} readOnly={!editing} onChange={set('receiptNumber')} />
          </div>
          <div><label className="label">Date</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
          <div className="sm:col-span-2"><label className="label">Payer Name *</label><input className="input" value={form.personName} onChange={set('personName')} /></div>
          <div><label className="label">Phone</label><input className="input" value={form.personPhone} onChange={set('personPhone')} /></div>
          <div><label className="label">Email</label><input type="email" className="input" value={form.personEmail} onChange={set('personEmail')} /></div>
          <div className="sm:col-span-2"><label className="label">Address</label><input className="input" value={form.personAddress} onChange={set('personAddress')} /></div>
          <div>
            <label className="label">Student (optional)</label>
            <select className="input" value={form.studentId} onChange={set('studentId')}>
              <option value="">No student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.student_id})</option>)}
            </select>
          </div>
          <div><label className="label">Amount ({currencySymbol}) *</label><input type="number" step="0.01" className="input" value={form.amount} onChange={set('amount')} /></div>
          <div>
            <label className="label">Payment Type *</label>
            <select className="input" value={form.paymentType} onChange={set('paymentType')}>
              {PAYMENT_TYPES.map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Method</label>
            <select className="input" value={form.paymentMethod} onChange={set('paymentMethod')}>
              {PAYMENT_METHODS.map(m => <option key={m} value={m} className="capitalize">{m.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Status</label>
            <select className="input" value={form.status} onChange={set('status')}>
              {['paid','pending','refunded'].map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2"><label className="label">Description</label><input className="input" value={form.description} onChange={set('description')} /></div>
          <div className="sm:col-span-2"><label className="label">Notes</label><textarea className="input h-16 resize-none" value={form.notes} onChange={set('notes')} /></div>
        </div>
      </Modal>
    </div>
  )
}
