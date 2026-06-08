import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Save, Settings, Building2, Key, Database, Shield } from 'lucide-react'
import PageHeader from '../../components/ui/PageHeader'

const TABS = [
  { label: 'Organization', icon: Building2 },
  { label: 'App Settings', icon: Settings },
  { label: 'Security',     icon: Shield },
  { label: 'Backup',       icon: Database },
]

export default function SettingsPage() {
  const { user, orgId, updateUser } = useAuth()
  const [tab, setTab] = useState(0)

  // Org settings
  const [orgForm, setOrgForm] = useState({ name:'', orgType:'Islamic Community Center', address:'', city:'', state:'', country:'USA', email:'', phone:'', website:'', timezone:'America/Chicago', primaryColor:'#15803d', secondaryColor:'#d97706' })
  const [appForm, setAppForm] = useState({ academicYear:'', currency:'USD', currencySymbol:'$', dateFormat:'MM/DD/YYYY', autoReceipt:true, receiptPrefix:'RCP' })
  const [pwForm,  setPwForm]  = useState({ current:'', newPass:'', confirm:'' })
  const [msg, setMsg] = useState({ tab: -1, text: '', type: 'success' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!orgId) return
    Promise.all([
      window.api.settings.getOrg({ orgId }),
      window.api.settings.getOrgSettings({ orgId }),
    ]).then(([or, sr]) => {
      if (or.success && or.data) {
        setOrgForm({ name:or.data.name||'', orgType:or.data.org_type||'', address:or.data.address||'', city:or.data.city||'', state:or.data.state||'', country:or.data.country||'USA', email:or.data.email||'', phone:or.data.phone||'', website:or.data.website||'', timezone:or.data.timezone||'America/Chicago', primaryColor:or.data.primary_color||'#15803d', secondaryColor:or.data.secondary_color||'#d97706' })
      }
      if (sr.success && sr.data) {
        setAppForm({ academicYear:sr.data.academic_year||'', currency:sr.data.currency||'USD', currencySymbol:sr.data.currency_symbol||'$', dateFormat:sr.data.date_format||'MM/DD/YYYY', autoReceipt:!!sr.data.auto_receipt, receiptPrefix:sr.data.receipt_prefix||'RCP' })
      }
    })
  }, [orgId])

  const notify = (tabIdx, text, type='success') => {
    setMsg({ tab: tabIdx, text, type })
    setTimeout(() => setMsg({ tab:-1, text:'', type:'success' }), 4000)
  }

  const saveOrg = async () => {
    setSaving(true)
    const r = await window.api.settings.updateOrg({ orgId, ...orgForm })
    setSaving(false)
    if (r.success) notify(0, 'Organization updated successfully')
    else notify(0, r.message, 'error')
  }

  const saveApp = async () => {
    setSaving(true)
    const r = await window.api.settings.updateOrgSettings({ orgId, ...appForm })
    setSaving(false)
    if (r.success) notify(1, 'Settings saved')
    else notify(1, r.message, 'error')
  }

  const changePass = async () => {
    if (!pwForm.current || !pwForm.newPass) { notify(2, 'All fields required', 'error'); return }
    if (pwForm.newPass !== pwForm.confirm)  { notify(2, 'Passwords do not match', 'error'); return }
    if (pwForm.newPass.length < 8)          { notify(2, 'Min 8 characters', 'error'); return }
    setSaving(true)
    const token = sessionStorage.getItem('amk_token')
    const r = await window.api.auth.changePassword({ token, currentPassword: pwForm.current, newPassword: pwForm.newPass })
    setSaving(false)
    if (r.success) { notify(2, 'Password changed'); setPwForm({ current:'', newPass:'', confirm:'' }) }
    else notify(2, r.message, 'error')
  }

  const backup  = async () => { const r = await window.api.db.backup();  if (r.success) alert('Backup saved to ' + r.path) }
  const restore = async () => { if (confirm('Restore database? The app will restart.')) await window.api.db.restore() }

  const setOrg = k => e => setOrgForm(f => ({ ...f, [k]: e.target.value }))
  const setApp = k => e => setAppForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))
  const setPw  = k => e => setPwForm(f => ({ ...f, [k]: e.target.value }))

  const Alert = ({ tabIdx, text, type }) => {
    if (msg.tab !== tabIdx || !msg.text) return null
    return (
      <div className={`p-3 rounded-xl text-sm mb-4 ${type==='error' ? 'bg-red-50 text-red-700 dark:bg-red-900/20' : 'bg-green-50 text-green-700 dark:bg-green-900/20'}`}>
        {text}
      </div>
    )
  }

  const ORG_TYPES = ['Islamic Community Center','Masjid','Dara (Quran Boarding School)','College','School','Islamic Institute','Hybrid Institution']

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Settings" subtitle="Organization and application configuration" icon={Settings} />

      <div className="tab-bar">
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={label} onClick={() => setTab(i)} className={`tab-btn flex items-center gap-1.5 ${tab===i?'active':''}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* ─── Organization ─────────────────────────────────────────────────── */}
      {tab === 0 && (
        <div className="card p-6 space-y-5">
          <h3 className="section-title">Organization Profile</h3>
          <Alert tabIdx={0} text={msg.text} type={msg.type} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className="label">Organization Name</label><input className="input" value={orgForm.name} onChange={setOrg('name')} /></div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={orgForm.orgType} onChange={setOrg('orgType')}>
                {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div><label className="label">Email</label><input type="email" className="input" value={orgForm.email} onChange={setOrg('email')} /></div>
            <div><label className="label">Phone</label><input className="input" value={orgForm.phone} onChange={setOrg('phone')} /></div>
            <div><label className="label">Website</label><input className="input" value={orgForm.website} onChange={setOrg('website')} /></div>
            <div><label className="label">Address</label><input className="input" value={orgForm.address} onChange={setOrg('address')} /></div>
            <div><label className="label">City</label><input className="input" value={orgForm.city} onChange={setOrg('city')} /></div>
            <div><label className="label">State</label><input className="input" value={orgForm.state} onChange={setOrg('state')} /></div>
            <div><label className="label">Country</label><input className="input" value={orgForm.country} onChange={setOrg('country')} /></div>
            <div>
              <label className="label">Timezone</label>
              <select className="input" value={orgForm.timezone} onChange={setOrg('timezone')}>
                {['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Toronto','Europe/London','Asia/Riyadh','Asia/Dubai'].map(t =>
                  <option key={t} value={t}>{t}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Brand Color</label>
              <div className="flex gap-2">
                <input type="color" className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" value={orgForm.primaryColor} onChange={setOrg('primaryColor')} />
                <input className="input flex-1" value={orgForm.primaryColor} onChange={setOrg('primaryColor')} />
              </div>
            </div>
            <div>
              <label className="label">Accent Color</label>
              <div className="flex gap-2">
                <input type="color" className="h-9 w-14 rounded-lg border border-gray-200 cursor-pointer" value={orgForm.secondaryColor} onChange={setOrg('secondaryColor')} />
                <input className="input flex-1" value={orgForm.secondaryColor} onChange={setOrg('secondaryColor')} />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveOrg} disabled={saving} className="btn-primary"><Save size={16} /> Save Changes</button>
          </div>
        </div>
      )}

      {/* ─── App Settings ─────────────────────────────────────────────────── */}
      {tab === 1 && (
        <div className="card p-6 space-y-5 max-w-xl">
          <h3 className="section-title">Application Settings</h3>
          <Alert tabIdx={1} text={msg.text} type={msg.type} />
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Academic Year</label><input className="input" value={appForm.academicYear} onChange={setApp('academicYear')} placeholder="2024-2025" /></div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={appForm.currency} onChange={setApp('currency')}>
                <optgroup label="Global">
                  {['USD','EUR','GBP','SAR','AED','MYR','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
                <optgroup label="Africa">
                  {[
                    'DZD','AOA','BWP','BIF','CVE','XAF','KMF','CDF','DJF',
                    'EGP','ERN','SZL','ETB','GMD','GHS','GNF','KES','LSL',
                    'LRD','LYD','MGA','MWK','MRU','MUR','MAD','MZN','NAD',
                    'NGN','RWF','STN','SCR','SLE','SOS','ZAR','SSP','SDG',
                    'TZS','TND','UGX','XOF','ZMW','ZWL'
                  ].map(c => <option key={c} value={c}>{c}</option>)}
                </optgroup>
              </select>
            </div>
            <div><label className="label">Currency Symbol</label><input className="input" value={appForm.currencySymbol} onChange={setApp('currencySymbol')} /></div>
            <div><label className="label">Receipt Prefix</label><input className="input" value={appForm.receiptPrefix} onChange={setApp('receiptPrefix')} placeholder="IECC" /></div>
            <div>
              <label className="label">Date Format</label>
              <select className="input" value={appForm.dateFormat} onChange={setApp('dateFormat')}>
                {['MM/DD/YYYY','DD/MM/YYYY','YYYY-MM-DD'].map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-3 pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={appForm.autoReceipt} onChange={setApp('autoReceipt')} className="rounded" />
                <span className="text-sm">Auto-generate receipt numbers</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end">
            <button onClick={saveApp} disabled={saving} className="btn-primary"><Save size={16} /> Save Settings</button>
          </div>
        </div>
      )}

      {/* ─── Security ─────────────────────────────────────────────────────── */}
      {tab === 2 && (
        <div className="card p-6 max-w-md">
          <h3 className="section-title mb-4">Change Password</h3>
          <Alert tabIdx={2} text={msg.text} type={msg.type} />
          <div className="space-y-3">
            <div><label className="label">Current Password</label><input type="password" className="input" value={pwForm.current} onChange={setPw('current')} /></div>
            <div><label className="label">New Password</label><input type="password" className="input" value={pwForm.newPass} onChange={setPw('newPass')} placeholder="Min 8 characters" /></div>
            <div><label className="label">Confirm New Password</label><input type="password" className="input" value={pwForm.confirm} onChange={setPw('confirm')} /></div>
            <button onClick={changePass} disabled={saving} className="btn-primary w-full justify-center mt-2">
              <Key size={16} /> {saving ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Backup ───────────────────────────────────────────────────────── */}
      {tab === 3 && (
        <div className="card p-6 max-w-md space-y-4">
          <h3 className="section-title">Database Backup & Restore</h3>
          <div className="p-4 rounded-xl bg-primary-50 dark:bg-primary-900/20 text-sm text-primary-800 dark:text-primary-300">
            <p className="font-semibold mb-1">⚠️ Important</p>
            <p>Regular backups protect your organization's data. We recommend daily backups.</p>
          </div>
          <div className="space-y-3">
            <button onClick={backup} className="btn-primary w-full justify-center">
              <Database size={16} /> Backup Database
            </button>
            <button onClick={restore} className="btn-danger w-full justify-center">
              <Database size={16} /> Restore from Backup
            </button>
          </div>
          <p className="text-xs text-gray-400">Restoring will restart the application and replace all current data with the backup.</p>
        </div>
      )}
    </div>
  )
}
