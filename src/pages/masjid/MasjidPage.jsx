import React, { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { Save, Plus, Edit2, Trash2, X, Clock, Calendar, Megaphone, BookOpen, Users } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import PageHeader from '../../components/ui/PageHeader'

const TABS = [
  { label: 'Prayer Times', icon: Clock },
  { label: 'Events',       icon: Calendar },
  { label: 'Announcements',icon: Megaphone },
  { label: "Khutbah",      icon: BookOpen },
  { label: 'Volunteers',   icon: Users },
]

const PRAYERS = [
  { key:'fajr', iqamah:'fajr_iqamah', label:'Fajr' },
  { key:'sunrise', label:'Sunrise' },
  { key:'dhuhr', iqamah:'dhuhr_iqamah', label:'Dhuhr' },
  { key:'asr', iqamah:'asr_iqamah', label:'Asr' },
  { key:'maghrib', iqamah:'maghrib_iqamah', label:'Maghrib' },
  { key:'isha', iqamah:'isha_iqamah', label:"Isha'" },
  { key:'jumu_ah', iqamah:'jumu_ah_iqamah', label:"Jumu'ah" },
]

function fmt12(t) {
  if (!t) return '—'
  const [h,m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`
}

// ─── Prayer Times Tab ─────────────────────────────────────────────────────────
function PrayerTimesTab({ orgId }) {
  const [times, setTimes] = useState({})
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    window.api.masjid.getPrayerTimes({ orgId }).then(r => { if (r.success) setTimes(r.data || {}) })
  }, [orgId])

  const save = async () => {
    setSaving(true)
    const r = await window.api.masjid.updatePrayerTimes({
      orgId, ...times,
      fajrIqamah: times.fajr_iqamah, dhuhrIqamah: times.dhuhr_iqamah, asrIqamah: times.asr_iqamah,
      maghribIqamah: times.maghrib_iqamah, ishaIqamah: times.isha_iqamah,
      jumuah: times.jumu_ah, jumuahIqamah: times.jumu_ah_iqamah,
      effectiveDate: times.effective_date
    })
    setSaving(false)
    setMsg(r.success ? 'Prayer times saved!' : r.message)
    setTimeout(() => setMsg(''), 3000)
  }

  const set = k => e => setTimes(t => ({ ...t, [k]: e.target.value }))

  return (
    <div className="space-y-6">
      {/* Display cards */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {PRAYERS.map(({ key, label }) => (
          <div key={key} className="card p-4 text-center border-b-4 border-primary-600">
            <p className="text-xs text-gray-400 mb-1 font-medium">{label}</p>
            <p className="text-base font-bold text-primary-700 dark:text-primary-400">{fmt12(times[key])}</p>
            {times[`${key.replace('jumu_ah','jumu_ah')}_iqamah`] && (
              <p className="text-[10px] text-gold-600 mt-0.5">
                Iqamah: {fmt12(times[`${key}_iqamah`])}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Edit form */}
      <div className="card p-6">
        <h3 className="section-title mb-5">Edit Prayer Schedule</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {PRAYERS.map(({ key, iqamah, label }) => (
            <div key={key} className="space-y-2">
              <div>
                <label className="label">{label} Adhan</label>
                <input type="time" className="input" value={times[key] || ''} onChange={set(key)} />
              </div>
              {iqamah && (
                <div>
                  <label className="label">{label} Iqamah</label>
                  <input type="time" className="input" value={times[iqamah] || ''} onChange={set(iqamah)} />
                </div>
              )}
            </div>
          ))}
          <div>
            <label className="label">Effective Date</label>
            <input type="date" className="input" value={times.effective_date || ''} onChange={set('effective_date')} />
          </div>
        </div>
        <div className="flex items-center gap-4 mt-5">
          {msg && <p className="text-sm text-green-600">{msg}</p>}
          <button onClick={save} disabled={saving} className="btn-primary ml-auto">
            <Save size={16} /> {saving ? 'Saving...' : 'Save Prayer Times'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Generic CRUD list ────────────────────────────────────────────────────────
function CrudList({ items, onEdit, onDelete, renderItem, emptyMsg, header }) {
  return (
    <div>
      {header}
      <div className="space-y-3">
        {items.length === 0
          ? <div className="card empty-state">{emptyMsg}</div>
          : items.map(item => (
              <div key={item.id} className="card p-4 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">{renderItem(item)}</div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onEdit(item)} className="btn-icon"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(item.id)} className="btn-icon text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  )
}

// ─── Events Tab ───────────────────────────────────────────────────────────────
function EventsTab({ orgId }) {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:'', description:'', date:'', time:'', location:'', category:'general', status:'upcoming' })
  const [msg, setMsg] = useState('')

  const load = () => window.api.masjid.getEvents({ orgId }).then(r => r.success && setEvents(r.data))
  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm({ title:'', description:'', date:'', time:'', location:'', category:'general', status:'upcoming' }); setShowForm(true); setMsg('') }
  const openEdit = (ev) => { setEditing(ev); setForm({ ...ev }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.title || !form.date) { setMsg('Title and date are required'); return }
    const data = { orgId, ...form }
    const r = editing ? await window.api.masjid.updateEvent({ ...data, id: editing.id }) : await window.api.masjid.createEvent(data)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Delete this event?')) { await window.api.masjid.deleteEvent({ id, orgId }); load() } }

  const STATUS_COLOR = { upcoming:'badge-blue', ongoing:'badge-green', completed:'badge-gray', cancelled:'badge-red' }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <CrudList
        items={events}
        onEdit={openEdit}
        onDelete={del}
        emptyMsg="No events found. Add one!"
        header={
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title">Events ({events.length})</h3>
            <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14} /> Add Event</button>
          </div>
        }
        renderItem={(ev) => (
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-gray-900 dark:text-white">{ev.title}</span>
              <span className={`badge ${STATUS_COLOR[ev.status] || 'badge-gray'} capitalize`}>{ev.status}</span>
              <span className="badge badge-gold capitalize">{ev.category}</span>
            </div>
            {ev.description && <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{ev.description}</p>}
            <div className="flex gap-3 mt-1 text-xs text-gray-400">
              <span>📅 {ev.date}</span>
              {ev.time && <span>🕐 {ev.time}</span>}
              {ev.location && <span>📍 {ev.location}</span>}
            </div>
          </div>
        )}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Event' : 'New Event'}
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary"><Save size={15} /> Save</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description||''} onChange={set('description')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
            <div><label className="label">Time</label><input type="time" className="input" value={form.time||''} onChange={set('time')} /></div>
          </div>
          <div><label className="label">Location</label><input className="input" value={form.location||''} onChange={set('location')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={set('category')}>
                {['general','lecture','fundraiser','youth','women','eid','ramadan','community','academic','other'].map(c =>
                  <option key={c} value={c} className="capitalize">{c}</option>
                )}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={set('status')}>
                {['upcoming','ongoing','completed','cancelled'].map(s =>
                  <option key={s} value={s} className="capitalize">{s}</option>
                )}
              </select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Announcements Tab ────────────────────────────────────────────────────────
function AnnouncementsTab({ orgId }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:'', content:'', type:'general', published: true, date:'' })
  const [msg, setMsg] = useState('')

  const load = () => window.api.masjid.getAnnouncements({ orgId }).then(r => r.success && setItems(r.data))
  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm({ title:'', content:'', type:'general', published: true, date:'' }); setShowForm(true); setMsg('') }
  const openEdit = (a) => { setEditing(a); setForm({ ...a, published: !!a.published }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.title || !form.content) { setMsg('Title and content are required'); return }
    const data = { orgId, ...form }
    const r = editing ? await window.api.masjid.updateAnnouncement({ ...data, id: editing.id }) : await window.api.masjid.createAnnouncement(data)
    if (r.success) { setShowForm(false); load() } else setMsg(r.message)
  }

  const del = async (id) => { if (confirm('Delete this announcement?')) { await window.api.masjid.deleteAnnouncement({ id, orgId }); load() } }

  const TYPE_COLOR = { general:'badge-gray', urgent:'badge-red', jumu_ah:'badge-green', ramadan:'badge-gold', event:'badge-blue' }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <CrudList
        items={items} onEdit={openEdit} onDelete={del} emptyMsg="No announcements yet."
        header={
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title">Announcements ({items.length})</h3>
            <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14} /> Add</button>
          </div>
        }
        renderItem={(a) => (
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`badge ${TYPE_COLOR[a.type] || 'badge-gray'} capitalize`}>{a.type?.replace('_',"'")}</span>
              {!a.published && <span className="badge badge-gold">Draft</span>}
              {a.date && <span className="text-xs text-gray-400">{a.date}</span>}
            </div>
            <p className="font-semibold text-gray-900 dark:text-white">{a.title}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{a.content}</p>
          </div>
        )}
      />

      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Announcement' : 'New Announcement'}
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary"><Save size={15} /> Save</button>
        </>}
      >
        {msg && <p className="text-sm text-red-500 mb-3">{msg}</p>}
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div><label className="label">Content *</label><textarea className="input h-28 resize-none" value={form.content} onChange={set('content')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={set('type')}>
                {['general','urgent','jumu_ah','ramadan','event'].map(t => <option key={t} value={t} className="capitalize">{t.replace('_',"'")}</option>)}
              </select>
            </div>
            <div><label className="label">Date</label><input type="date" className="input" value={form.date||''} onChange={set('date')} /></div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input type="checkbox" checked={!!form.published} onChange={e => setForm(f => ({ ...f, published: e.target.checked }))} className="rounded" />
            <span>Published (visible to all)</span>
          </label>
        </div>
      </Modal>
    </div>
  )
}

// ─── Khutbah Tab ─────────────────────────────────────────────────────────────
function KhutbahTab({ orgId }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title:'', speaker:'', date:'', language:'English', topic:'', description:'', notes:'' })

  const load = () => window.api.masjid.getKhutbah({ orgId }).then(r => r.success && setItems(r.data))
  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm({ title:'', speaker:'', date:'', language:'English', topic:'', description:'', notes:'' }); setShowForm(true) }
  const openEdit = (k) => { setEditing(k); setForm({ ...k }); setShowForm(true) }

  const save = async () => {
    if (!form.title || !form.date) return
    const data = { orgId, ...form }
    const r = editing ? await window.api.masjid.updateKhutbah({ ...data, id: editing.id }) : await window.api.masjid.createKhutbah(data)
    if (r.success) { setShowForm(false); load() }
  }

  const del = async (id) => { if (confirm('Delete this khutbah?')) { await window.api.masjid.deleteKhutbah({ id, orgId }); load() } }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <CrudList
        items={items} onEdit={openEdit} onDelete={del} emptyMsg="No khutbah records yet."
        header={
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title">Khutbah Archive ({items.length})</h3>
            <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14} /> Add Khutbah</button>
          </div>
        }
        renderItem={(k) => (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{k.title}</p>
            <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              {k.speaker && <span>🎤 {k.speaker}</span>}
              <span>📅 {k.date}</span>
              {k.language && <span>🌐 {k.language}</span>}
              {k.topic && <span>📌 {k.topic}</span>}
            </div>
          </div>
        )}
      />
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Khutbah' : 'New Khutbah'}
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary"><Save size={15}/> Save</button>
        </>}
      >
        <div className="space-y-3">
          <div><label className="label">Title *</label><input className="input" value={form.title} onChange={set('title')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Speaker</label><input className="input" value={form.speaker} onChange={set('speaker')} /></div>
            <div><label className="label">Date *</label><input type="date" className="input" value={form.date} onChange={set('date')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Language</label><input className="input" value={form.language} onChange={set('language')} /></div>
            <div><label className="label">Topic</label><input className="input" value={form.topic} onChange={set('topic')} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input h-20 resize-none" value={form.description} onChange={set('description')} /></div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Volunteers Tab ───────────────────────────────────────────────────────────
function VolunteersTab({ orgId }) {
  const [items, setItems] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ fullName:'', email:'', phone:'', skills:'', availability:'', status:'active', notes:'' })

  const load = () => window.api.masjid.getVolunteers({ orgId }).then(r => r.success && setItems(r.data))
  useEffect(() => { load() }, [orgId])

  const openNew  = () => { setEditing(null); setForm({ fullName:'', email:'', phone:'', skills:'', availability:'', status:'active', notes:'' }); setShowForm(true) }
  const openEdit = (v) => { setEditing(v); setForm({ fullName: v.full_name, email:v.email||'', phone:v.phone||'', skills:v.skills||'', availability:v.availability||'', status:v.status, notes:v.notes||'' }); setShowForm(true) }

  const save = async () => {
    if (!form.fullName) return
    const data = { orgId, ...form }
    const r = editing ? await window.api.masjid.updateVolunteer({ ...data, id: editing.id }) : await window.api.masjid.createVolunteer(data)
    if (r.success) { setShowForm(false); load() }
  }

  const del = async (id) => { if (confirm('Remove volunteer?')) { await window.api.masjid.deleteVolunteer({ id, orgId }); load() } }
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div>
      <CrudList
        items={items} onEdit={openEdit} onDelete={del} emptyMsg="No volunteers registered."
        header={
          <div className="flex justify-between items-center mb-4">
            <h3 className="section-title">Volunteers ({items.length})</h3>
            <button onClick={openNew} className="btn-primary btn-sm"><Plus size={14} /> Add Volunteer</button>
          </div>
        }
        renderItem={(v) => (
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">{v.full_name}</p>
            <div className="flex gap-3 mt-1 text-xs text-gray-500 flex-wrap">
              {v.phone && <span>📞 {v.phone}</span>}
              {v.email && <span>✉️ {v.email}</span>}
              {v.skills && <span>🛠 {v.skills}</span>}
              {v.availability && <span>🗓 {v.availability}</span>}
            </div>
          </div>
        )}
      />
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit Volunteer' : 'New Volunteer'}
        footer={<>
          <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
          <button onClick={save} className="btn-primary"><Save size={15}/> Save</button>
        </>}
      >
        <div className="space-y-3">
          <div><label className="label">Full Name *</label><input className="input" value={form.fullName} onChange={set('fullName')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={set('phone')} /></div>
            <div><label className="label">Email</label><input className="input" value={form.email} onChange={set('email')} /></div>
          </div>
          <div><label className="label">Skills</label><input className="input" placeholder="e.g. IT, fundraising, teaching" value={form.skills} onChange={set('skills')} /></div>
          <div><label className="label">Availability</label><input className="input" placeholder="e.g. Weekends, Friday evenings" value={form.availability} onChange={set('availability')} /></div>
        </div>
      </Modal>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function MasjidPage() {
  const { orgId } = useAuth()
  const [tab, setTab] = useState(0)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHeader title="Masjid Management" subtitle="Prayer times, events, announcements & more" />

      <div className="tab-bar">
        {TABS.map(({ label, icon: Icon }, i) => (
          <button key={label} onClick={() => setTab(i)} className={`tab-btn flex items-center gap-1.5 ${tab===i ? 'active' : ''}`}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      <div>
        {tab === 0 && <PrayerTimesTab orgId={orgId} />}
        {tab === 1 && <EventsTab orgId={orgId} />}
        {tab === 2 && <AnnouncementsTab orgId={orgId} />}
        {tab === 3 && <KhutbahTab orgId={orgId} />}
        {tab === 4 && <VolunteersTab orgId={orgId} />}
      </div>
    </div>
  )
}
