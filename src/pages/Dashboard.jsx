import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import StatsCard from '../components/ui/StatsCard'
import { Users, UserCheck, BookOpen, Calendar, Wallet, Heart, TrendingUp, Clock, Star } from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#15803d','#d97706','#3b82f6','#8b5cf6','#ef4444','#06b6d4']

function formatCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0)
}

export default function Dashboard() {
  const { user, orgId } = useAuth()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [orgId])

  const loadStats = async () => {
    setLoading(true)
    const r = await window.api.reports.getDashboardStats({ orgId })
    if (r.success) setStats(r.data)
    setLoading(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64"><div className="spinner" /></div>
  )

  const s = stats || {}
  const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{today}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-primary-50 dark:bg-primary-900/20 rounded-2xl">
          <Star size={14} className="text-gold-500" fill="currentColor" />
          <span className="text-xs font-medium text-primary-700 dark:text-primary-400">Bismillah ir-Rahman ir-Raheem</span>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <StatsCard icon={Users}     label="Active Students" value={s.totalStudents || 0} sub="enrolled"         color="primary" />
        <StatsCard icon={UserCheck} label="Active Teachers" value={s.totalTeachers || 0} sub="staff members"   color="blue" />
        <StatsCard icon={BookOpen}  label="Classes"         value={s.totalClasses  || 0} sub="running"         color="purple" />
        <StatsCard icon={Calendar}  label="Upcoming Events" value={s.upcomingEvents || 0} sub="scheduled"      color="gold" />
        <StatsCard icon={Wallet}    label="Total Income"    value={formatCurrency(s.totalIncome)} sub="all time" color="green" />
        <StatsCard icon={Heart}     label="Donations"       value={formatCurrency(s.totalDonations)} sub="all types" color="gold" />
        <StatsCard icon={TrendingUp} label="Expenses"       value={formatCurrency(s.totalExpenses)} sub="all time"  color="red" />
        <StatsCard icon={Clock}     label="Present Today"   value={s.todayPresent || 0} sub="students"         color="primary" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Income vs Expense trend */}
        <div className="lg:col-span-2 card p-5">
          <h3 className="section-title mb-4">Income vs Expenses (6 Months)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={s.monthlyTrend || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#15803d" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#15803d" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2}/>
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v >= 1000 ? `${v/1000}k` : v}`} />
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend />
              <Area type="monotone" dataKey="income"  name="Income"  stroke="#15803d" fill="url(#incGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" fill="url(#expGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Payment breakdown */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Payment Breakdown</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={s.paymentByType || []} dataKey="total" nameKey="payment_type"
                cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                {(s.paymentByType || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => formatCurrency(v)} />
              <Legend iconSize={10} formatter={(v) => <span className="capitalize text-xs">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Attendance this week */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Attendance This Week</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={s.weekAtt || []} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="present" name="Present" fill="#15803d" radius={[4,4,0,0]} />
              <Bar dataKey="absent"  name="Absent"  fill="#ef4444" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent payments */}
        <div className="card p-5">
          <h3 className="section-title mb-4">Recent Payments</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {(s.recentPayments || []).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700/30 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.person_name}</p>
                  <p className="text-xs text-gray-400 capitalize">{p.payment_type} · {p.date}</p>
                </div>
                <span className="text-sm font-bold text-primary-700 dark:text-primary-400">
                  {formatCurrency(p.amount)}
                </span>
              </div>
            ))}
            {!s.recentPayments?.length && <p className="text-gray-400 text-sm text-center py-6">No recent payments</p>}
          </div>
        </div>
      </div>

      {/* Recent students */}
      <div className="card p-5">
        <h3 className="section-title mb-4">Recently Enrolled Students</h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                {['Student ID','Name','Class','Enrolled','Status'].map(h => <th key={h} className="th">{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {(s.recentStudents || []).map(st => (
                <tr key={st.id} className="tr">
                  <td className="td font-mono text-xs text-gray-500">{st.student_id}</td>
                  <td className="td font-medium">{st.full_name}</td>
                  <td className="td text-gray-500">{st.class_name || '—'}</td>
                  <td className="td text-gray-500">{st.enrolled_date || '—'}</td>
                  <td className="td">
                    <span className={`badge capitalize ${st.status === 'active' ? 'badge-green' : 'badge-gray'}`}>
                      {st.status}
                    </span>
                  </td>
                </tr>
              ))}
              {!s.recentStudents?.length && (
                <tr><td colSpan={5} className="td text-center text-gray-400 py-8">No students yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
