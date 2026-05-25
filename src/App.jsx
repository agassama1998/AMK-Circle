import React, { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// ─── Lazy pages ──────────────────────────────────────────────────────────────
const Login            = lazy(() => import('./pages/Login'))
const Dashboard        = lazy(() => import('./pages/Dashboard'))
const SuperDashboard   = lazy(() => import('./pages/super-admin/SuperDashboard'))
const OrganizationsPage= lazy(() => import('./pages/super-admin/OrganizationsPage'))
const SuperAuditLogs   = lazy(() => import('./pages/super-admin/SuperAuditLogs'))
const MasjidPage       = lazy(() => import('./pages/masjid/MasjidPage'))
const StudentsPage     = lazy(() => import('./pages/school/StudentsPage'))
const TeachersPage     = lazy(() => import('./pages/school/TeachersPage'))
const ClassesPage      = lazy(() => import('./pages/school/ClassesPage'))
const AttendancePage   = lazy(() => import('./pages/school/AttendancePage'))
const ParentsPage      = lazy(() => import('./pages/school/ParentsPage'))
const SubjectsPage     = lazy(() => import('./pages/school/SubjectsPage'))
const ExamsPage        = lazy(() => import('./pages/school/ExamsPage'))
const HifzPage         = lazy(() => import('./pages/dara/HifzPage'))
const BoardingPage     = lazy(() => import('./pages/dara/BoardingPage'))
const FinancePage      = lazy(() => import('./pages/finance/FinancePage'))
const ExpensesPage     = lazy(() => import('./pages/finance/ExpensesPage'))
const SalariesPage     = lazy(() => import('./pages/finance/SalariesPage'))
const ReportsPage      = lazy(() => import('./pages/reports/ReportsPage'))
const UsersPage        = lazy(() => import('./pages/UsersPage'))
const SettingsPage     = lazy(() => import('./pages/settings/SettingsPage'))

// ─── Route guards ─────────────────────────────────────────────────────────────
function Protected({ children, roles }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />
  return children
}

// ─── Loading fallback ─────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-64">
      <div className="spinner" />
    </div>
  )
}

export default function App() {
  const { user, isSuperAdmin } = useAuth()

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />

        {/* Super Admin */}
        <Route path="/super" element={
          <Protected roles={['super_admin']}>
            <Layout superAdmin />
          </Protected>
        }>
          <Route index       element={<SuperDashboard />} />
          <Route path="organizations" element={<OrganizationsPage />} />
          <Route path="audit-logs"    element={<SuperAuditLogs />} />
        </Route>

        {/* Org routes */}
        <Route path="/" element={
          <Protected>
            <Layout />
          </Protected>
        }>
          <Route index element={
            isSuperAdmin ? <Navigate to="/super" replace /> : <Dashboard />
          } />
          <Route path="masjid"          element={<MasjidPage />} />
          <Route path="school/students" element={<StudentsPage />} />
          <Route path="school/teachers" element={<TeachersPage />} />
          <Route path="school/classes"  element={<ClassesPage />} />
          <Route path="school/attendance" element={<AttendancePage />} />
          <Route path="school/parents"   element={<ParentsPage />} />
          <Route path="school/subjects"  element={<SubjectsPage />} />
          <Route path="school/exams"     element={<ExamsPage />} />
          <Route path="dara/hifz"       element={<HifzPage />} />
          <Route path="dara/boarding"   element={<BoardingPage />} />
          <Route path="finance"         element={<FinancePage />} />
          <Route path="finance/expenses" element={<ExpensesPage />} />
          <Route path="finance/salaries" element={<SalariesPage />} />
          <Route path="reports"         element={<ReportsPage />} />
          <Route path="users"           element={
            <Protected roles={['organization_admin','super_admin','principal']}>
              <UsersPage />
            </Protected>
          } />
          <Route path="settings"        element={
            <Protected roles={['organization_admin','super_admin']}>
              <SettingsPage />
            </Protected>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
