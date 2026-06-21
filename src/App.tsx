import React, { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { initCrossTabStorageSync } from '@utils/crossTabStorageSync'
import { rebuildInviteRegistryFromStores } from '@utils/inviteCodeRegistry'
import { syncOrganizationRegistryFromStores } from '@utils/objectChain'
import {
  loadInvitesFromDisk,
  loadObjectMetaFromDisk,
  loadUserObjectsFromDisk,
  buildObjectNameMap,
} from '@utils/objectAccessStorage'
import { BottomNav } from '@components/BottomNav'

const RoleHome = lazy(() => import('@screens/RoleHome').then((m) => ({ default: m.RoleHome })))
const Register = lazy(() => import('@screens/Register').then((m) => ({ default: m.Register })))
const ObjectDetail = lazy(() => import('@screens/ObjectDetail').then((m) => ({ default: m.ObjectDetail })))
const WorkerDashboard = lazy(() => import('@screens/WorkerDashboard').then((m) => ({ default: m.WorkerDashboard })))
const ClientView = lazy(() => import('@screens/ClientView').then((m) => ({ default: m.ClientView })))
const NewObject = lazy(() => import('@screens/NewObject').then((m) => ({ default: m.NewObject })))
const CreateTask = lazy(() => import('@screens/CreateTask').then((m) => ({ default: m.CreateTask })))
const CreateExpense = lazy(() => import('@screens/CreateExpense').then((m) => ({ default: m.CreateExpense })))
const TaskDetail = lazy(() => import('@screens/TaskDetail').then((m) => ({ default: m.TaskDetail })))
const Team = lazy(() => import('@screens/Team').then((m) => ({ default: m.Team })))
const Settings = lazy(() => import('@screens/Settings').then((m) => ({ default: m.Settings })))
const ProjectSetup = lazy(() => import('@screens/ProjectSetup').then((m) => ({ default: m.ProjectSetup })))
const TaskWorkflowDetail = lazy(() => import('@screens/TaskWorkflowDetail').then((m) => ({ default: m.TaskWorkflowDetail })))
const SubWorkWorkflowDetail = lazy(() => import('@screens/SubWorkWorkflowDetail').then((m) => ({ default: m.SubWorkWorkflowDetail })))
const ClientObjects = lazy(() => import('@screens/client/ClientObjects').then((m) => ({ default: m.ClientObjects })))
const ClientFinances = lazy(() => import('@screens/client/ClientFinances').then((m) => ({ default: m.ClientFinances })))
const OrgForemanPayroll = lazy(() => import('@screens/client/OrgForemanPayroll').then((m) => ({ default: m.OrgForemanPayroll })))
const AppNotifications = lazy(() => import('@screens/AppNotifications').then((m) => ({ default: m.AppNotifications })))
const SubcontractorTeam = lazy(() => import('@screens/subcontractor/SubcontractorTeam').then((m) => ({ default: m.SubcontractorTeam })))
const OrgTeamMemberDetail = lazy(() => import('@screens/subcontractor/OrgTeamMemberDetail').then((m) => ({ default: m.OrgTeamMemberDetail })))
const SubcontractorTasks = lazy(() => import('@screens/subcontractor/SubcontractorTasks').then((m) => ({ default: m.SubcontractorTasks })))
const ForemanPayroll = lazy(() => import('@screens/payroll/ForemanPayroll').then((m) => ({ default: m.ForemanPayroll })))
const ForemanRates = lazy(() => import('@screens/payroll/ForemanRates').then((m) => ({ default: m.ForemanRates })))
const PaymentSettingsPage = lazy(() => import('@screens/payroll/PaymentSettingsPage').then((m) => ({ default: m.PaymentSettingsPage })))
const WorkerAccountPage = lazy(() => import('@screens/payroll/WorkerAccountPage').then((m) => ({ default: m.WorkerAccountPage })))
const WorkerMoney = lazy(() => import('@screens/worker/WorkerMoney').then((m) => ({ default: m.WorkerMoney })))
const SubcontractorPayroll = lazy(() => import('@screens/subcontractor/SubcontractorPayroll').then((m) => ({ default: m.SubcontractorPayroll })))
const ConnectToObject = lazy(() => import('@screens/ConnectToObject').then((m) => ({ default: m.ConnectToObject })))
const ClientObjectWizard = lazy(() => import('@screens/client/ClientObjectWizard').then((m) => ({ default: m.ClientObjectWizard })))
const CreateSideJob = lazy(() => import('@screens/foreman/CreateSideJob').then((m) => ({ default: m.CreateSideJob })))
const SideJobDetail = lazy(() => import('@screens/foreman/SideJobDetail').then((m) => ({ default: m.SideJobDetail })))
const AcceptanceActsPage = lazy(() => import('@screens/quality/AcceptanceActsPage').then((m) => ({ default: m.AcceptanceActsPage })))
const PaymentActsPage = lazy(() => import('@screens/paymentActs/PaymentActsPage').then((m) => ({ default: m.PaymentActsPage })))
const TimesheetPage = lazy(() => import('@screens/attendance/TimesheetPage').then((m) => ({ default: m.TimesheetPage })))
const HiddenWorksArchive = lazy(() => import('@screens/HiddenWorksArchive').then((m) => ({ default: m.HiddenWorksArchive })))
const MaterialsPage = lazy(() => import('@screens/materials/MaterialsPage').then((m) => ({ default: m.MaterialsPage })))
const ObjectDocumentsPage = lazy(() => import('@screens/object/ObjectDocumentsPage').then((m) => ({ default: m.ObjectDocumentsPage })))
const ExportDataPage = lazy(() => import('@screens/ExportDataPage').then((m) => ({ default: m.ExportDataPage })))
const WorkerCalculatorHistory = lazy(() => import('@screens/calculator/WorkerCalculatorHistory').then((m) => ({ default: m.WorkerCalculatorHistory })))
const ForemanCalculatorReports = lazy(() => import('@screens/calculator/ForemanCalculatorReports').then((m) => ({ default: m.ForemanCalculatorReports })))

const PageLoader = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <p className="text-gray-500 text-sm-mobile">Загрузка...</p>
  </div>
)

function RequireAuth({ children }: { children: React.ReactNode }) {
  const registered = useUserStore((s) => s.registered)
  const location = useLocation()
  if (!registered) {
    return <Navigate to="/register" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

const AppContent: React.FC = () => {
  const { tg, isDark } = useTelegram()
  const registered = useUserStore((s) => s.registered)
  const role = useUserStore((s) => s.role)
  const hydrateSession = useUserStore((s) => s.hydrateSession)

  useEffect(() => {
    initCrossTabStorageSync()
    hydrateSession()
    syncOrganizationRegistryFromStores()
    rebuildInviteRegistryFromStores(
      loadInvitesFromDisk(),
      loadObjectMetaFromDisk(),
      buildObjectNameMap(useObjectStore.getState().userObjects, loadUserObjectsFromDisk()),
    )
  }, [hydrateSession])

  useEffect(() => {
    if (!tg) return
    try {
      tg.setHeaderColor(isDark ? '#1a1a1a' : '#ffffff')
      tg.setBackgroundColor(isDark ? '#1a1a1a' : '#f3f4f6')
    } catch {
      /* вне Telegram */
    }
  }, [tg, isDark])

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/register" element={registered ? <Navigate to="/" replace /> : <Register />} />

          <Route path="/" element={<RequireAuth><RoleHome /></RequireAuth>} />
          <Route path="/objects" element={<RequireAuth>{role === 'client' ? <ClientObjects /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/finances" element={<RequireAuth>{role === 'client' ? <ClientFinances /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/finances/foremen" element={<RequireAuth>{role === 'client' ? <OrgForemanPayroll /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/notifications" element={<RequireAuth><AppNotifications /></RequireAuth>} />
          <Route path="/connect" element={<RequireAuth><ConnectToObject /></RequireAuth>} />
          <Route path="/client/object/new" element={<RequireAuth>{role === 'client' ? <ClientObjectWizard /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/object/new" element={<RequireAuth><NewObject /></RequireAuth>} />
          <Route path="/object/:id" element={<RequireAuth><ObjectDetail /></RequireAuth>} />
          <Route path="/object/:id/task/new" element={<RequireAuth><CreateTask /></RequireAuth>} />
          <Route path="/object/:id/expense/new" element={<RequireAuth><CreateExpense /></RequireAuth>} />
          <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />
          <Route path="/worker" element={<RequireAuth><WorkerDashboard /></RequireAuth>} />
          <Route path="/subcontractor/team" element={<RequireAuth>{role === 'subcontractor' ? <SubcontractorTeam /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/subcontractor/team/:memberType/:memberId" element={<RequireAuth>{role === 'subcontractor' ? <OrgTeamMemberDetail /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/subcontractor/tasks" element={<RequireAuth>{role === 'subcontractor' ? <SubcontractorTasks /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/worker/money" element={<RequireAuth>{role === 'worker' ? <WorkerMoney /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/worker/calculators" element={<RequireAuth>{role === 'worker' ? <WorkerCalculatorHistory /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/foreman/calculator-reports" element={<RequireAuth>{role === 'foreman' ? <ForemanCalculatorReports /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/payroll" element={<RequireAuth>{role === 'foreman' ? <ForemanPayroll /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/rates" element={<RequireAuth>{role === 'foreman' ? <ForemanRates /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/payment-settings" element={<RequireAuth>{role === 'foreman' || role === 'subcontractor' ? <PaymentSettingsPage /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/payroll/:workerId" element={<RequireAuth>{role === 'foreman' ? <WorkerAccountPage /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/subcontractor/payroll" element={<RequireAuth>{role === 'subcontractor' ? <SubcontractorPayroll /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/subcontractor/payroll/:workerId" element={<RequireAuth>{role === 'subcontractor' ? <WorkerAccountPage /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/team" element={<RequireAuth>{role === 'foreman' ? <Team /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/side-job/new" element={<RequireAuth>{role === 'foreman' ? <CreateSideJob /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/side-job/:id" element={<RequireAuth>{role === 'foreman' ? <SideJobDetail /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/timesheet" element={<RequireAuth>{role === 'foreman' ? <TimesheetPage /> : <Navigate to="/" replace />}</RequireAuth>} />
          <Route path="/object/:id/acceptance-acts" element={<RequireAuth><AcceptanceActsPage /></RequireAuth>} />
          <Route path="/object/:id/payment-acts" element={<RequireAuth><PaymentActsPage /></RequireAuth>} />
          <Route path="/object/:id/hidden-works" element={<RequireAuth><HiddenWorksArchive /></RequireAuth>} />
          <Route path="/object/:id/documents" element={<RequireAuth><ObjectDocumentsPage /></RequireAuth>} />
          <Route path="/object/:id/setup" element={<RequireAuth><ProjectSetup /></RequireAuth>} />
          <Route path="/workflow/:taskId/sub/:subWorkId" element={<RequireAuth><SubWorkWorkflowDetail /></RequireAuth>} />
          <Route path="/workflow/:taskId" element={<RequireAuth><TaskWorkflowDetail /></RequireAuth>} />
          <Route path="/materials" element={<RequireAuth><MaterialsPage /></RequireAuth>} />
          <Route path="/export" element={<RequireAuth><ExportDataPage /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/client/:id" element={<RequireAuth><ClientView /></RequireAuth>} />
          <Route path="*" element={<Navigate to={registered ? '/' : '/register'} replace />} />
        </Routes>
      </Suspense>
      <BottomNav />
      <Toaster
        position="top-center"
        toastOptions={{ duration: 3000, style: { borderRadius: '16px', padding: '16px', fontSize: '14px' } }}
      />
    </div>
  )
}

export const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
)
