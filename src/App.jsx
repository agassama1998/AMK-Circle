import React, { lazy, Suspense, Component } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'

// ─── Lazy pages ──────────────────────────────────────────────────────────────
const Login              = lazy(() => import('./pages/Login'))
const Dashboard          = lazy(() => import('./pages/Dashboard'))
const SuperDashboard     = lazy(() => import('./pages/super-admin/SuperDashboard'))
const OrganizationsPage  = lazy(() => import('./pages/super-admin/OrganizationsPage'))
const SuperAuditLogs     = lazy(() => import('./pages/super-admin/SuperAuditLogs'))
const MasjidPage         = lazy(() => import('./pages/masjid/MasjidPage'))
const StudentsPage       = lazy(() => import('./pages/school/StudentsPage'))
const TeachersPage       = lazy(() => import('./pages/school/TeachersPage'))
const ClassesPage        = lazy(() => import('./pages/school/ClassesPage'))
const AttendancePage     = lazy(() => import('./pages/school/AttendancePage'))
const ParentsPage        = lazy(() => import('./pages/school/ParentsPage'))
const SubjectsPage       = lazy(() => import('./pages/school/SubjectsPage'))
const ExamsPage          = lazy(() => import('./pages/school/ExamsPage'))
const HifzPage           = lazy(() => import('./pages/dara/HifzPage'))
const BoardingPage       = lazy(() => import('./pages/dara/BoardingPage'))
const FinancePage        = lazy(() => import('./pages/finance/FinancePage'))
const ExpensesPage       = lazy(() => import('./pages/finance/ExpensesPage'))
const SalariesPage       = lazy(() => import('./pages/finance/SalariesPage'))
const ReportsPage        = lazy(() => import('./pages/reports/ReportsPage'))
const UsersPage          = lazy(() => import('./pages/UsersPage'))
const SettingsPage       = lazy(() => import('./pages/settings/SettingsPage'))
// ─── Read-only portals ───────────────────────────────────────────────────────
const StudentDashboard   = lazy(() => import('./pages/student/StudentDashboard'))
const ParentDashboard    = lazy(() => import('./pages/parent/ParentDashboard'))

// ─── Error boundary ───────────────────────────────────────────────────────────
// Catches any uncaught render errors in the tree and shows a readable message
// instead of a blank/black screen.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-8 bg-gray-50 dark:bg-gray-950">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg w-full text-center">
            <p className="text-red-700 font-semibold mb-2">Something went wrong</p>
            <p className="text-red-500 text-sm font-mono break-all">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.reload() }}
              className="mt-4 px-4 py-2 rounded-xl bg-red-600 text-white text-sm hover:bg-red-700"
            >
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ─── Route guards ─────────────────────────────────────────────────────────────

/**
 * Blocks unauthenticated access and role mismatches.
 * If `roles` is provided, the user's role must be in that list.
 * If `denyRoles` is provided, those roles are redirected away (e.g. parent/student
 * cannot reach admin pages even if they are authenticated).
 */
function Protected({ children, roles, denyRoles }) {
  const { user, isStudent, isParent } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles     && !roles.includes(user.role))     return <Navigate to="/" replace />
  if (denyRoles &&  denyRoles.includes(user.role)) {
    if (isStudent) return <Navigate to="/student" replace />
    if (isParent)  return <Navigate to="/parent"  replace />
    return <Navigate to="/" replace />
  }
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

// ─── Root redirect — send each role to its home page ─────────────────────────
function RootRedirect() {
  const { user, isSuperAdmin, isStudent, isParent } = useAuth()
  if (!user)        return <Navigate to="/login"     replace />
  if (isSuperAdmin) return <Navigate to="/super"     replace />
  if (isStudent)    return <Navigate to="/student"   replace />
  if (isParent)     return <Navigate to="/parent"    replace />
  return              <Navigate to="/dashboard"  replace />
}

// Roles that should NEVER access the admin org-level pages
const READ_ONLY_ROLES = ['parent', 'student']

export default function App() {
  const { user } = useAuth()

  return (
    <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <RootRedirect /> : <Login />} />

        {/* ── Super Admin ───────────────────────────────────────────────────── */}
        <Route path="/super" element={
          <Protected roles={['super_admin']}>
            <Layout superAdmin />
          </Protected>
        }>
          <Route index                  element={<SuperDashboard />} />
          <Route path="organizations"   element={<OrganizationsPage />} />
          <Route path="audit-logs"      element={<SuperAuditLogs />} />
        </Route>

        {/* ── Student Portal (read-only) ────────────────────────────────────── */}
        <Route path="/student" element={
          <Protected roles={['student']}>
            <Layout />
          </Protected>
        }>
          <Route index element={<StudentDashboard />} />
          {/* Sub-routes share the same dashboard; the sidebar nav links to anchors */}
          <Route path="attendance"    element={<StudentDashboard />} />
          <Route path="grades"        element={<StudentDashboard />} />
          <Route path="hifz"          element={<StudentDashboard />} />
          <Route path="fees"          element={<StudentDashboard />} />
          <Route path="announcements" element={<StudentDashboard />} />
        </Route>

        {/* ── Parent Portal (read-only) ─────────────────────────────────────── */}
        <Route path="/parent" element={
          <Protected roles={['parent']}>
            <Layout />
          </Protected>
        }>
          <Route index element={<ParentDashboard />} />
          <Route path="attendance"    element={<ParentDashboard />} />
          <Route path="grades"        element={<ParentDashboard />} />
          <Route path="hifz"          element={<ParentDashboard />} />
          <Route path="payments"      element={<ParentDashboard />} />
          <Route path="announcements" element={<ParentDashboard />} />
        </Route>

        {/* ── Org-level routes (staff only — parent/student blocked) ─────────── */}
        <Route path="/" element={
          <Protected denyRoles={READ_ONLY_ROLES}>
            <Layout />
          </Protected>
        }>
          <Route index                    element={<RootRedirect />} />
          <Route path="dashboard"         element={<Dashboard />} />
          <Route path="masjid"            element={<MasjidPage />} />
          <Route path="school/students"    element={<StudentsPage />} />
          <Route path="school/teachers"    element={<TeachersPage />} />
          <Route path="school/classes"     element={<ClassesPage />} />
          <Route path="school/attendance"  element={<AttendancePage />} />
          <Route path="school/parents"     element={<ParentsPage />} />
          <Route path="school/subjects"    element={<SubjectsPage />} />
          <Route path="school/exams"       element={<ExamsPage />} />
          <Route path="dara/hifz"          element={<HifzPage />} />
          <Route path="dara/boarding"      element={<BoardingPage />} />
          <Route path="finance"            element={<FinancePage />} />
          <Route path="finance/expenses"   element={<ExpensesPage />} />
          <Route path="finance/salaries"   element={<SalariesPage />} />
          <Route path="reports"            element={<ReportsPage />} />
          <Route path="users"              element={
            <Protected roles={['organization_admin', 'super_admin', 'principal']}>
              <UsersPage />
            </Protected>
          } />
          <Route path="settings"           element={
            <Protected roles={['organization_admin', 'super_admin']}>
              <SettingsPage />
            </Protected>
          } />
        </Route>

        {/* Fallback: redirect to role-appropriate home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
    </ErrorBoundary>
  )
}
