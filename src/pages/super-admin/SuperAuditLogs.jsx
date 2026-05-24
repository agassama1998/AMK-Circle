import React, { useState, useEffect } from 'react'
import PageHeader from '../../components/ui/PageHeader'
import { ClipboardList, Search } from 'lucide-react'

const ACTION_COLORS = {
  LOGIN:'badge-green', LOGOUT:'badge-gray', CREATE_STUDENT:'badge-blue', UPDATE_STUDENT:'badge-gold',
  DEACTIVATE_STUDENT:'badge-red', CREATE_TEACHER:'badge-blue', CREATE_PAYMENT:'badge-purple',
  CREATE_ORG:'badge-green', UPDATE_ORG:'badge-gold', DELETE_PAYMENT:'badge-red',
  UPDATE_PRAYER_TIMES:'badge-blue', CHANGE_PASSWORD:'badge-gold', RESET_PASSWORD:'badge-red',
}

export default function SuperAuditLogs() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  const [action, setAction]   = useState('')

  const load = async () => {
    setLoading(true)
    const r = await window.api.reports.getAuditLogs({ orgId: null, action: action || undefined, limit: 200 })
    if (r.success) setLogs(r.data)
    setLoading(false)
  }

  useEffect(() => { load() }, [action])

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Audit Logs" subtitle="Platform-wide activity log" icon={ClipboardList} />

      <div className="flex gap-3">
        <select className="input w-auto" value={action} onChange={e => setAction(e.target.value)}>
          <option value="">All Actions</option>
          {['LOGIN','LOGOUT','CREATE_STUDENT','UPDATE_STUDENT','CREATE_PAYMENT','CREATE_ORG','UPDATE_ORG'].map(a =>
            <option key={a} value={a}>{a}</option>
          )}
        </select>
        <button onClick={load} className="btn-secondary">Refresh</button>
      </div>

      <div className="card overflow-hidden">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                {['Timestamp','User','Action','Table','Record','Details'].map(h => <th key={h} className="th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="td text-center py-12"><div className="spinner mx-auto" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="td text-center text-gray-400 py-12">No audit logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="tr">
                  <td className="td text-xs text-gray-500 font-mono whitespace-nowrap">{log.created_at?.slice(0,19)}</td>
                  <td className="td text-sm font-medium">{log.username || '—'}</td>
                  <td className="td">
                    <span className={`badge ${ACTION_COLORS[log.action] || 'badge-gray'} text-xs`}>{log.action}</span>
                  </td>
                  <td className="td text-xs text-gray-500 capitalize">{log.table_name?.replace('_',' ') || '—'}</td>
                  <td className="td text-xs text-gray-500">#{log.record_id || '—'}</td>
                  <td className="td text-xs text-gray-400 max-w-xs truncate">{log.details || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
