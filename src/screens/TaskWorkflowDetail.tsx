import React, { useState } from 'react'

import { useParams, useNavigate } from 'react-router-dom'

import { ArrowLeft, Flame, AlertTriangle } from 'lucide-react'

import { WORK_TYPE_LABELS } from '@api/hierarchy'

import { STATUS_LABELS, STATUS_COLORS } from '@api/clientView'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { useUserStore } from '@store/userStore'

import { useObjectStore } from '@store/objectStore'

import { returnFromWorkflow } from '@utils/workflowNavigation'

import { resolveWorkerIdForUser, getCurrentUserKey } from '@utils/notificationFilter'

import { canAccessTask } from '@utils/sideJob'

import { NotificationBell } from '@components/NotificationBell'

import { BlueprintAlertBanner } from '@components/workflow/BlueprintAlertBanner'

import { BlueprintUpload } from '@components/workflow/BlueprintUpload'

import { TaskChat } from '@components/workflow/TaskChat'

import { TaskHistoryTab } from '@components/workflow/TaskHistoryTab'

import { RedoModal } from '@components/workflow/RedoModal'

import { TaskAssigneePanel } from '@components/workflow/TaskAssigneePanel'
import { BrigadeProgressPanel } from '@components/brigade/BrigadeProgressPanel'
import { WorkerReportPanel } from '@components/paymentAct/WorkerReportPanel'
import { WorkerVolumeCalculator } from '@components/calculator/WorkerVolumeCalculator'
import { ForemanCalculatorReviewPanel } from '@components/calculator/ForemanCalculatorReviewPanel'
import { PaymentActEditorPanel, PaymentActReviewPanel } from '@components/paymentAct/PaymentActPanels'
import { usePaymentActStore } from '@store/paymentActStore'
import { showWorkerReportForTask } from '@utils/paymentSettingsHelpers'

import { TaskWorkPhotosPanel } from '@components/workflow/TaskWorkPhotosPanel'

import { TaskDetailsPanel } from '@components/workflow/TaskDetailsPanel'

import { TaskActionsPanel } from '@components/workflow/TaskActionsPanel'

import { TaskPayrollPanel } from '@components/payroll/TaskPayrollPanel'

import { MaterialTaskPanel } from '@components/materials/MaterialTaskPanel'
import { TaskDocumentsPanel } from '@components/documents/TaskDocumentsPanel'

import { TaskDowntimePanel } from '@components/attendance/TaskDowntimePanel'

import { AcceptanceReviewPanel } from '@components/quality/AcceptanceReviewPanel'

import { WarrantyPanel } from '@components/quality/WarrantyPanel'

import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'

import { useMaterialStore } from '@store/materialStore'

import { useAttendanceStore } from '@store/attendanceStore'

import { DOWNTIME_REASONS } from '@/types/attendance'

import { isTaskOverdue, isTaskDueToday } from '@utils/taskDeadlines'

import { apartmentKey } from '@/types/projectWorkflow'

import { taskHasSubWorksList } from '@utils/subWorkProgress'

import { SubWorkListPanel } from '@components/workflow/SubWorkListPanel'



export const TaskWorkflowDetail: React.FC = () => {

  const { taskId } = useParams<{ taskId: string }>()

  const navigate = useNavigate()

  const role = useUserStore((s) => s.role)

  const fullName = useUserStore((s) => s.fullName)

  const contractorId = useUserStore((s) => s.contractorId)

  const task = useProjectWorkflowStore((s) => (taskId ? s.tasks[taskId] : undefined))

  const submitRedo = useProjectWorkflowStore((s) => s.submitRedo)

  const getBlueprint = useProjectWorkflowStore((s) => s.getBlueprintForTask)

  const getBlockingReason = useProjectWorkflowStore((s) => s.getBlockingReason)

  const teamMembers = useObjectStore((s) => s.teamMembers)

  const contractorWorkers = useObjectStore((s) => s.getContractorWorkers(contractorId))

  const currentWorkerId = useObjectStore(

    (s) => (taskId ? s.workerTaskAssignments[taskId] || s.contractorWorkerAssignments[taskId] : undefined),

  )

  const assignedBrigadeId = useObjectStore((s) => (taskId ? s.brigadeTaskAssignments[taskId] : undefined))

  const userBrigadeId = useUserStore((s) => s.brigadeId)

  const myWorkerId = resolveWorkerIdForUser(fullName || '')



  const [redoOpen, setRedoOpen] = useState(false)

  const [tab, setTab] = useState<'task' | 'history'>('task')



  if (!task || !taskId) {

    return <div className="p-4 text-gray-500">Задача не найдена</div>

  }



  const accessCtx = { workerId: myWorkerId, userKey: getCurrentUserKey() }

  if (!canAccessTask(task, role, accessCtx)) {

    return <div className="p-4 text-gray-500">Нет доступа к этой задаче</div>

  }



  if (role === 'subcontractor' && task.contractorId !== contractorId) {

    return <div className="p-4 text-gray-500">Эта задача не назначена вашей организации</div>

  }



  const blockReason = getBlockingReason(taskId)

  const blueprint = getBlueprint(taskId)

  const aptKey = apartmentKey(task.section, task.house, task.entrance, task.floor, task.apartmentNumber)

  const isForeman = role === 'foreman'

  const isClient = role === 'client'

  const acceptTaskWithChecklist = useProjectWorkflowStore((s) => s.acceptTaskWithChecklist)

  const isSubcontractor = role === 'subcontractor' && task.contractorId === contractorId

  const isWorker = role === 'worker'

  const isBrigadeMemberAssigned =
    isWorker && !!assignedBrigadeId && !!userBrigadeId && userBrigadeId === assignedBrigadeId

  const isAssignedWorker =
    isWorker &&
    ((!!currentWorkerId && myWorkerId === currentWorkerId) || isBrigadeMemberAssigned)

  const canAssignForeman = isForeman && !task.contractorId

  const canAssignSub = isSubcontractor

  const showBlueprint = (isWorker || isSubcontractor || isForeman) && blueprint

  const redoWorkers = isForeman

    ? teamMembers.map((m) => ({ id: m.id, name: m.name }))

    : contractorWorkers.map((w) => ({ id: w.id, name: w.name }))



  const canEditPhotos = isAssignedWorker && (task.status === 'in_progress' || task.status === 'rejected')

  const canViewPhotosForeman = isForeman || isSubcontractor

  const taskHasSubWorks = taskHasSubWorksList(task)

  const materialWaitActive = useMaterialStore((s) => !!s.getActiveWaitForTask(taskId))

  const activeDowntime = useAttendanceStore((s) => (taskId ? s.getActiveDowntime(taskId) : undefined))

  const overdue = isTaskOverdue(task)

  const dueToday = isTaskDueToday(task)

  const downtimeLabel = activeDowntime
    ? DOWNTIME_REASONS[activeDowntime.reason] + (activeDowntime.reasonText ? `: ${activeDowntime.reasonText}` : '')
    : undefined

  const existingAct = useQualityAcceptanceStore((s) => (taskId ? s.getActForTask(taskId) : undefined))

  const taskPaymentAct = usePaymentActStore((s) => s.getActsForTask(taskId)[0])

  const authorName = fullName || (isForeman ? 'Прораб' : isClient ? 'Заказчик' : 'Мастер')



  const handleBack = () => {

    if (task.objectId) {

      returnFromWorkflow(navigate, task.objectId)

    } else {

      navigate(-1)

    }

  }



  return (

    <div className="pb-24 min-h-screen bg-gray-50">

      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">

        <button type="button" onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="Назад">

          <ArrowLeft size={24} />

        </button>

        <div className="flex-1 min-w-0">

          <p className="text-xs-mobile text-primary-600">{WORK_TYPE_LABELS[task.workType]}</p>

          <h1 className="text-lg-mobile font-bold truncate flex items-center gap-1.5">
            {dueToday && <Flame size={18} className="text-orange-500 shrink-0" />}
            {overdue && !dueToday && <AlertTriangle size={18} className="text-red-500 shrink-0" />}
            {task.title}
          </h1>

          <p className="text-xs-mobile text-gray-500 truncate">

            {task.section} · {task.house} · под. {task.entrance} · эт. {task.floor} · кв. {task.apartmentNumber}

          </p>

        </div>

        <NotificationBell />

      </div>



      <div className="bg-white border-b px-4 flex gap-1">

        <button

          type="button"

          onClick={() => setTab('task')}

          className={`flex-1 py-3 text-sm-mobile font-medium border-b-2 transition-colors ${

            tab === 'task' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'

          }`}

        >

          Задача

        </button>

        <button

          type="button"

          onClick={() => setTab('history')}

          className={`flex-1 py-3 text-sm-mobile font-medium border-b-2 transition-colors ${

            tab === 'history' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'

          }`}

        >

          История

        </button>

      </div>



      <div className="p-4 space-y-4">

        {tab === 'history' ? (

          <TaskHistoryTab taskId={taskId} />

        ) : taskHasSubWorks ? (

          <SubWorkListPanel

            taskId={taskId}

            workTypeLabel={WORK_TYPE_LABELS[task.workType]}

            onSelect={(subWorkId) => navigate(`/workflow/${taskId}/sub/${subWorkId}`)}

          />

        ) : (

          <>

            <BlueprintAlertBanner taskId={taskId} />



            <div className="bg-white rounded-2xl p-4 border border-gray-100">

              <div className="flex items-center justify-between">

                <span className={`px-3 py-1 rounded-full text-sm-mobile font-medium ${STATUS_COLORS[task.status]}`}>

                  {STATUS_LABELS[task.status]}

                </span>

              </div>



              {blockReason && task.status === 'pending' && (

                <div className="mt-3 p-3 bg-gray-100 rounded-xl text-sm-mobile text-gray-600">

                  ⏳ {blockReason}

                </div>

              )}



              {task.defectComment && (

                <div className="mt-3 p-3 bg-red-50 rounded-xl">

                  <p className="text-sm-mobile font-medium text-red-800">Комментарий прораба</p>

                  <p className="text-sm-mobile text-red-700 mt-1">{task.defectComment}</p>

                  {task.defectPhotoUrl && (

                    <img src={task.defectPhotoUrl} alt="" className="mt-2 rounded-lg max-h-40 object-cover w-full" />

                  )}

                </div>

              )}

            </div>



            <TaskAssigneePanel

              taskId={taskId}

              objectId={task.objectId}

              workType={task.workType}

              entrance={task.entrance}

              floor={task.floor}

              isSideJob={task.isSideJob}

              contractorId={task.contractorId}

              contractorName={task.contractorName}

              canAssign={canAssignForeman || canAssignSub}

            />

            {assignedBrigadeId && (
              <BrigadeProgressPanel taskId={taskId} brigadeId={assignedBrigadeId} />
            )}



            <TaskDetailsPanel taskId={taskId} canEdit={isForeman || isSubcontractor} />



            {(role === 'client' || isForeman) && (

              <BlueprintUpload

                objectId={task.objectId}

                workType={task.workType}

                apartmentKey={aptKey}

                taskId={taskId}

              />

            )}



            {showBlueprint && (

              <div className="bg-white rounded-2xl p-4 border border-gray-100">

                <p className="text-sm-mobile font-medium text-gray-900 mb-2">Чертёж для вашей задачи</p>

                {blueprint.mimeType.startsWith('image/') ? (

                  <img src={blueprint.fileUrl} alt="" className="rounded-xl w-full max-h-64 object-contain bg-gray-50" />

                ) : (

                  <a href={blueprint.fileUrl} target="_blank" rel="noreferrer" className="text-primary-600 text-sm-mobile underline">

                    Открыть {blueprint.fileName}

                  </a>

                )}

              </div>

            )}



            {(canEditPhotos || canViewPhotosForeman) && (

              <TaskWorkPhotosPanel

                taskId={taskId}

                canEdit={canEditPhotos}

                required={canEditPhotos && task.status === 'in_progress'}

              />

            )}



            <TaskPayrollPanel taskId={taskId} contractorId={task.contractorId} taskStatus={task.status} />

            {isAssignedWorker && (task.status === 'in_progress' || task.status === 'review' || task.status === 'done') && myWorkerId && (
              <WorkerVolumeCalculator
                taskId={taskId}
                objectId={task.objectId}
                workerId={myWorkerId}
                workerName={fullName || 'Мастер'}
              />
            )}

            {isAssignedWorker && showWorkerReportForTask(taskId) && (task.status === 'in_progress' || task.status === 'review' || task.status === 'done') && (
              <WorkerReportPanel taskId={taskId} canSubmit />
            )}

            {isForeman && (
              <ForemanCalculatorReviewPanel taskId={taskId} />
            )}

            {isForeman && taskPaymentAct && (
              <PaymentActEditorPanel act={taskPaymentAct} />
            )}

            {isSubcontractor && taskPaymentAct && (
              <PaymentActReviewPanel act={taskPaymentAct} role="subcontractor" />
            )}

            {isClient && taskPaymentAct && (
              <PaymentActReviewPanel act={taskPaymentAct} role="client" />
            )}



            <MaterialTaskPanel

              taskId={taskId}

              objectId={task.objectId}

              taskTitle={task.title}

              isAssignedWorker={isAssignedWorker}

              isForeman={isForeman}

              workerId={myWorkerId}

              workerName={fullName || 'Мастер'}

            />

            <TaskDocumentsPanel objectId={task.objectId} taskId={taskId} />



            <TaskDowntimePanel

              taskId={taskId}

              objectId={task.objectId}

              taskTitle={task.title}

              isAssignedWorker={isAssignedWorker}

              isForeman={isForeman}

              workerId={myWorkerId}

              workerName={fullName || 'Мастер'}

            />



            <TaskActionsPanel

              taskId={taskId}

              status={task.status}

              isAssignedWorker={isAssignedWorker}

              isForeman={isForeman}

              materialWaitActive={materialWaitActive}

              downtimeActive={!!activeDowntime}

              downtimeLabel={downtimeLabel}

            />



            {(isForeman || isClient) && (task.status === 'review' || existingAct) && (
              <AcceptanceReviewPanel
                taskId={taskId}
                objectId={task.objectId}
                workType={task.workType}
                workLabel={task.title}
                apartmentNumber={task.apartmentNumber}
                photos={task.workPhotos ?? []}
                isForeman={isForeman}
                isClient={isClient}
                authorName={authorName}
                onAccept={(payload) =>
                  acceptTaskWithChecklist(taskId, {
                    role: isForeman ? 'foreman' : 'client',
                    name: authorName,
                  }, payload)
                }
                onRedo={(reason) => submitRedo(taskId, '', reason, { reason: 'own_fault' })}
              />
            )}

            {existingAct && task.status === 'done' && (
              <WarrantyPanel
                actId={existingAct.id}
                objectId={task.objectId}
                taskId={taskId}
                workLabel={task.title}
              />
            )}



            <TaskChat taskId={taskId} />

          </>

        )}

      </div>



      <RedoModal

        open={redoOpen}

        taskTitle={task.title}

        workers={redoWorkers}

        currentWorkerId={currentWorkerId}

        onClose={() => setRedoOpen(false)}

        onSubmit={(photo, comment, options) => submitRedo(taskId, photo, comment, options)}

      />

    </div>

  )

}


