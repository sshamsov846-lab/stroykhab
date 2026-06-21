import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { STATUS_LABELS, STATUS_COLORS } from '@api/clientView'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { resolveWorkerIdForUser } from '@utils/notificationFilter'
import { canAccessTask } from '@utils/sideJob'
import { NotificationBell } from '@components/NotificationBell'
import { BlueprintAlertBanner } from '@components/workflow/BlueprintAlertBanner'
import { TaskChat } from '@components/workflow/TaskChat'
import { SubWorkPhotosPanel } from '@components/workflow/SubWorkPhotosPanel'
import { SubWorkBeforeClosePhotosPanel } from '@components/workflow/SubWorkBeforeClosePhotosPanel'
import { SubWorkActionsPanel } from '@components/workflow/SubWorkActionsPanel'
import { AcceptanceReviewPanel } from '@components/quality/AcceptanceReviewPanel'
import { WarrantyPanel } from '@components/quality/WarrantyPanel'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'
import { SubWorkHistoryTab } from '@components/workflow/SubWorkHistoryTab'
import { subWorkChatTaskId } from '@/types/subWorks'

export const SubWorkWorkflowDetail: React.FC = () => {
  const { taskId, subWorkId } = useParams<{ taskId: string; subWorkId: string }>()
  const navigate = useNavigate()
  const role = useUserStore((s) => s.role)
  const fullName = useUserStore((s) => s.fullName)
  const contractorId = useUserStore((s) => s.contractorId)
  const task = useProjectWorkflowStore((s) => (taskId ? s.tasks[taskId] : undefined))
  const ensureTaskSubWorks = useProjectWorkflowStore((s) => s.ensureTaskSubWorks)
  const subWorks = useProjectWorkflowStore((s) => (taskId ? s.getTaskSubWorks(taskId) : []))
  const sub = subWorks.find((s) => s.id === subWorkId)
  const currentWorkerId = useObjectStore(
    (s) => (taskId ? s.workerTaskAssignments[taskId] || s.contractorWorkerAssignments[taskId] : undefined),
  )
  const myWorkerId = resolveWorkerIdForUser(fullName || '')
  const acceptSubWork = useProjectWorkflowStore((s) => s.acceptSubWork)
  const redoSubWork = useProjectWorkflowStore((s) => s.redoSubWork)
  const [tab, setTab] = useState<'task' | 'history'>('task')

  useEffect(() => {
    if (taskId) ensureTaskSubWorks(taskId)
  }, [taskId, ensureTaskSubWorks])

  if (!task || !taskId || !subWorkId || !sub) {
    return <div className="p-4 text-gray-500">Под-работа не найдена</div>
  }

  if (!canAccessTask(task, role, { workerId: myWorkerId })) {
    return <div className="p-4 text-gray-500">Нет доступа к этой задаче</div>
  }

  if (role === 'subcontractor' && task.contractorId !== contractorId) {
    return <div className="p-4 text-gray-500">Эта задача не назначена вашей организации</div>
  }

  const isForeman = role === 'foreman'
  const isClient = role === 'client'
  const isSubcontractor = role === 'subcontractor' && task.contractorId === contractorId
  const isWorker = role === 'worker'
  const isAssignedWorker = isWorker && !!currentWorkerId && myWorkerId === currentWorkerId
  const canEditPhotos = isAssignedWorker && (sub.status === 'in_progress' || sub.status === 'rejected')
  const canViewPhotos = isForeman || isSubcontractor || isClient
  const chatTaskId = subWorkChatTaskId(taskId, subWorkId)
  const authorName = fullName || (isForeman ? 'Прораб' : 'Заказчик')
  const acceptancePhotos = sub.isHiddenWork ? (sub.beforeClosePhotos ?? []) : sub.workPhotos
  const existingAct = useQualityAcceptanceStore((s) => s.getActForTask(taskId, subWorkId))

  const handleBack = () => {
    navigate(`/workflow/${taskId}`)
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100" aria-label="Назад">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs-mobile text-primary-600 truncate">
            кв. {task.apartmentNumber} → {WORK_TYPE_LABELS[task.workType]} → {sub.label}
          </p>
          <h1 className="text-lg-mobile font-bold truncate">{sub.label}</h1>
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
          <SubWorkHistoryTab taskId={taskId} subWorkId={subWorkId} />
        ) : (
          <>
            <BlueprintAlertBanner taskId={taskId} />

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <div className="flex items-center justify-between gap-2">
                <span className={`px-3 py-1 rounded-full text-sm-mobile font-medium ${STATUS_COLORS[sub.status]}`}>
                  {STATUS_LABELS[sub.status]}
                </span>
                {sub.isHiddenWork && (
                  <span className="px-2 py-0.5 rounded-full text-xs-mobile font-medium bg-amber-100 text-amber-800">
                    Скрытая работа
                  </span>
                )}
              </div>
              {sub.description && (
                <p className="text-sm-mobile text-gray-700 mt-3">{sub.description}</p>
              )}
              {sub.defectComment && (
                <div className="mt-3 p-3 bg-red-50 rounded-xl">
                  <p className="text-sm-mobile font-medium text-red-800">Причина переделки</p>
                  <p className="text-sm-mobile text-red-700 mt-1">{sub.defectComment}</p>
                </div>
              )}
            </div>

            {sub.isHiddenWork && (canEditPhotos || canViewPhotos) && (
              <SubWorkBeforeClosePhotosPanel
                taskId={taskId}
                subWorkId={subWorkId}
                canEdit={canEditPhotos}
                required={canEditPhotos && (sub.status === 'in_progress' || sub.status === 'rejected')}
                hiddenCoveredBy={sub.hiddenCoveredBy}
              />
            )}

            {!sub.isHiddenWork && (canEditPhotos || canViewPhotos) && (
              <SubWorkPhotosPanel
                taskId={taskId}
                subWorkId={subWorkId}
                canEdit={canEditPhotos}
                required={canEditPhotos && sub.status === 'in_progress'}
              />
            )}

            <SubWorkActionsPanel
              taskId={taskId}
              subWorkId={subWorkId}
              status={sub.status}
              isAssignedWorker={isAssignedWorker}
            />

            {(isForeman || isClient) && (sub.status === 'review' || existingAct) && (
              <AcceptanceReviewPanel
                taskId={taskId}
                subWorkId={subWorkId}
                objectId={task.objectId}
                workType={task.workType}
                workLabel={sub.label}
                apartmentNumber={task.apartmentNumber}
                photos={acceptancePhotos}
                isForeman={isForeman}
                isClient={isClient}
                authorName={authorName}
                hiddenWorkBlocked={sub.isHiddenWork && !(sub.beforeClosePhotos?.length ?? 0)}
                onAccept={(payload) =>
                  acceptSubWork(
                    taskId,
                    subWorkId,
                    { role: isForeman ? 'foreman' : 'client', name: authorName },
                    payload,
                  )
                }
                onRedo={(reason) =>
                  redoSubWork(taskId, subWorkId, reason, {
                    role: isForeman ? 'foreman' : 'client',
                    name: authorName,
                  })
                }
              />
            )}

            {existingAct && sub.status === 'done' && (
              <WarrantyPanel
                actId={existingAct.id}
                objectId={task.objectId}
                taskId={taskId}
                workLabel={sub.label}
              />
            )}

            <TaskChat taskId={chatTaskId} />
          </>
        )}
      </div>
    </div>
  )
}
