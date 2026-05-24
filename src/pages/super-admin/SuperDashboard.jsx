import React, { useState, useEffect } from 'react'
import StatsCard from '../../components/ui/StatsCard'
import { Building2, Users, GraduationCap, UserCheck, Wallet, Heart, BarChart3, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function fmt(n) { return new Intl.NumberFormat('en-US', { style:'currency', currency:'USD', maximumFractionDigits:0 }).format(n||0) }

export default function SuperDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    window.api.reports.getSuperStats().then(r => {
      if (r.success) setStats(r.data)
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex justify-center min-h-64"><div className="spinner mt-20" /></div>

  const s = stats || {}

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="page-title">Platform Overview</h1>
        <p className="page-sub">AMK Circle — Super Administration Panel</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatsCard icon={Building2}   label="Organizations"    value={s.totalOrgs}      color="primary" />
        <StatsCard icon={Users}       label="Total Users"      value={s.totalUsers}     color="blue" />
        <StatsCard icon={GraduationCap} label="Total Students" value={s.totalStudents}  color="purple" />
        <StatsCard icon={UserCheck}   label="Total Teachers"   value={s.totalTeachers}  color="green" />
        <StatsCard icon={Wallet}      label="Total Revenue"    value={fmt(s.totalRevenue)}   color="gold" />
        <StatsCard icon={Heart}       label="Total Donations"  value={fmt(s.totalDonations)} color="red" />
      </div>

      {/* Revenue trend */}
      <div className="card p-5">
        <h3 className="section-title mb-4">Platform Revenue — Last 6 Months</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={s.monthlyTrend || []} margin={{ top:4,right:4,left:0,bottom:0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v>=1000?v/1000+'k':v}`} />
            <Tooltip formatter={(v) => fmt(v)} />
            <Bar dataKey="income" name="Revenue" fill="#15803d" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Organizations table */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700/50">
          <h3 className="section-title">Organizations</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Organization','Type','Location','Students','Teachers','Revenue','Status'].map(h =>
                  <th key={h} className="th">{h}</th>
                )}
              </tr>
            </thead>
            <tbody>
              {(s.orgBreakdown || []).map((org, i) => (
                <tr key={i} className="tr">
                  <td className="td font-semibold">{org.name}</td>
                  <td className="td text-gray-500 text-xs">{org.org_type}</td>
                  <td className="td text-gray-500 text-xs">{[org.city, org.state].filter(Boolean).join(', ')}</td>
                  <td className="td">{org.students}</td>
                  <td className="td">{org.teachers}</td>
                  <td className="td font-medium text-primary-700 dark:text-primary-400">{fmt(org.revenue)}</td>
                  <td className="td">
                    <span className={`badge capitalize ${org.is_active ? 'badge-green' : 'badge-red'}`}>
                      {org.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
