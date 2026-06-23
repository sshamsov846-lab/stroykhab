import React, { Suspense, lazy, useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore, type AppRole } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useDirectoryStore } from '@store/directoryStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { initCrossTabStorageSync } from '@utils/crossTabStorageSync'
import { rebuildInviteRegistryFromStores } from '@utils/inviteCodeRegistry'
import { syncOrganizationRegistryFromStores } from '@utils/objectChain'
import { syncDirectoryFromApp } from '@utils/directorySync'
import { syncUsersFromAuth, useUsersStore } from '@store/usersStore'
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

/** Ждём rehydrate Zustand перед роутингом */
const AppBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const finish = () => {
      if (cancelled) return
      useUserStore.getState().recoverAccounts()
      syncUsersFromAuth(useUserStore.getState().accounts)
      syncDirectoryFromApp()
      syncOrganizationRegistryFromStores()
      useUserStore.getState().hydrateSession()
      setReady(true)
    }

    const timeout = window.setTimeout(finish, 3000)

    void Promise.all([
      useUserStore.persist.rehydrate(),
      useUsersStore.persist.rehydrate(),
      useDirectoryStore.persist.rehydrate(),
      usePersonProfileStore.persist.rehydrate(),
      useOrganizationStore.persist.rehydrate(),
      useProjectWorkflowStore.persist.rehydrate(),
    ])
      .then(() => {
        window.clearTimeout(timeout)
        finish()
      })
      .catch(() => {
        window.clearTimeout(timeout)
        finish()
      })

    return () => {
      cancelled = true
      window.clearTimeout(timeout)
    }
  }, [])

  if (!ready) return <PageLoader />
  return <>{children}</>
}

function RoleGate({
  allow,
  children,
}: {
  allow: AppRole | AppRole[]
  children: React.ReactNode
}) {
  const role = useUserStore((s) => s.role)
  const allowed = Array.isArray(allow) ? allow : [allow]
  if (!allowed.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}

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

  useEffect(() => {
    initCrossTabStorageSync()
    syncOrganizationRegistryFromStores()
    rebuildInviteRegistryFromStores(
      loadInvitesFromDisk(),
      loadObjectMetaFromDisk(),
      buildObjectNameMap(useObjectStore.getState().userObjects, loadUserObjectsFromDisk()),
    )
  }, [])

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
          <Route path="/notifications" element={<RequireAuth><AppNotifications /></RequireAuth>} />
          <Route path="/connect" element={<RequireAuth><ConnectToObject /></RequireAuth>} />
          <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
          <Route path="/export" element={<RequireAuth><ExportDataPage /></RequireAuth>} />
          <Route path="/materials" element={<RequireAuth><MaterialsPage /></RequireAuth>} />

          {/* Заказчик */}
          <Route path="/objects" element={<RequireAuth><RoleGate allow="client"><ClientObjects /></RoleGate></RequireAuth>} />
          <Route path="/finances" element={<RequireAuth><RoleGate allow="client"><ClientFinances /></RoleGate></RequireAuth>} />
          <Route path="/finances/foremen" element={<RequireAuth><RoleGate allow="client"><OrgForemanPayroll /></RoleGate></RequireAuth>} />
          <Route path="/client/object/new" element={<RequireAuth><RoleGate allow="client"><ClientObjectWizard /></RoleGate></RequireAuth>} />
          <Route path="/client/:id" element={<RequireAuth><ClientView /></RequireAuth>} />

          {/* Объекты — вложенные маршруты выше :id */}
          <Route path="/object/new" element={<RequireAuth><NewObject /></RequireAuth>} />
          <Route path="/object/:id/setup" element={<RequireAuth><ProjectSetup /></RequireAuth>} />
          <Route path="/object/:id/task/new" element={<RequireAuth><CreateTask /></RequireAuth>} />
          <Route path="/object/:id/expense/new" element={<RequireAuth><CreateExpense /></RequireAuth>} />
          <Route path="/object/:id/acceptance-acts" element={<RequireAuth><AcceptanceActsPage /></RequireAuth>} />
          <Route path="/object/:id/payment-acts" element={<RequireAuth><PaymentActsPage /></RequireAuth>} />
          <Route path="/object/:id/hidden-works" element={<RequireAuth><HiddenWorksArchive /></RequireAuth>} />
          <Route path="/object/:id/documents" element={<RequireAuth><ObjectDocumentsPage /></RequireAuth>} />
          <Route path="/object/:id" element={<RequireAuth><ObjectDetail /></RequireAuth>} />

          {/* Workflow */}
          <Route path="/workflow/:taskId/sub/:subWorkId" element={<RequireAuth><SubWorkWorkflowDetail /></RequireAuth>} />
          <Route path="/workflow/:taskId" element={<RequireAuth><TaskWorkflowDetail /></RequireAuth>} />
          <Route path="/task/:id" element={<RequireAuth><TaskDetail /></RequireAuth>} />

          {/* Прораб + мастер — задачи */}
          <Route path="/worker" element={<RequireAuth><RoleGate allow={['foreman', 'worker']}><WorkerDashboard /></RoleGate></RequireAuth>} />
          <Route path="/worker/money" element={<RequireAuth><RoleGate allow="worker"><WorkerMoney /></RoleGate></RequireAuth>} />
          <Route path="/worker/calculators" element={<RequireAuth><RoleGate allow="worker"><WorkerCalculatorHistory /></RoleGate></RequireAuth>} />

          {/* Прораб */}
          <Route path="/team" element={<RequireAuth><RoleGate allow="foreman"><Team /></RoleGate></RequireAuth>} />
          <Route path="/payroll" element={<RequireAuth><RoleGate allow="foreman"><ForemanPayroll /></RoleGate></RequireAuth>} />
          <Route path="/payroll/:workerId" element={<RequireAuth><RoleGate allow="foreman"><WorkerAccountPage /></RoleGate></RequireAuth>} />
          <Route path="/rates" element={<RequireAuth><RoleGate allow="foreman"><ForemanRates /></RoleGate></RequireAuth>} />
          <Route path="/foreman/calculator-reports" element={<RequireAuth><RoleGate allow="foreman"><ForemanCalculatorReports /></RoleGate></RequireAuth>} />
          <Route path="/side-job/new" element={<RequireAuth><RoleGate allow="foreman"><CreateSideJob /></RoleGate></RequireAuth>} />
          <Route path="/side-job/:id" element={<RequireAuth><RoleGate allow="foreman"><SideJobDetail /></RoleGate></RequireAuth>} />
          <Route path="/timesheet" element={<RequireAuth><RoleGate allow="foreman"><TimesheetPage /></RoleGate></RequireAuth>} />

          {/* Организация */}
          <Route path="/subcontractor/team" element={<RequireAuth><RoleGate allow="subcontractor"><SubcontractorTeam /></RoleGate></RequireAuth>} />
          <Route path="/subcontractor/team/:memberType/:memberId" element={<RequireAuth><RoleGate allow="subcontractor"><OrgTeamMemberDetail /></RoleGate></RequireAuth>} />
          <Route path="/subcontractor/tasks" element={<RequireAuth><RoleGate allow="subcontractor"><SubcontractorTasks /></RoleGate></RequireAuth>} />
          <Route path="/subcontractor/payroll" element={<RequireAuth><RoleGate allow="subcontractor"><SubcontractorPayroll /></RoleGate></RequireAuth>} />
          <Route path="/subcontractor/payroll/:workerId" element={<RequireAuth><RoleGate allow="subcontractor"><WorkerAccountPage /></RoleGate></RequireAuth>} />

          {/* Прораб + организация */}
          <Route path="/payment-settings" element={<RequireAuth><RoleGate allow={['foreman', 'subcontractor']}><PaymentSettingsPage /></RoleGate></RequireAuth>} />

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
    <AppBootstrap>
      <AppContent />
    </AppBootstrap>
  </BrowserRouter>
)
