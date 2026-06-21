import React, { useEffect, useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import { MapPin, Mic, MicOff, ChevronRight, Wallet, Flame, AlertTriangle, Calculator } from 'lucide-react'

import { useTelegram } from '@hooks/useTelegram'

import { useVoiceInput } from '@hooks/useVoiceInput'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { useObjectStore } from '@store/objectStore'

import { useUserStore } from '@store/userStore'

import { WORK_TYPE_LABELS } from '@api/hierarchy'

import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'

import { resolveWorkerIdForUser, getCurrentUserKey } from '@utils/notificationFilter'

import { canAccessTask } from '@utils/sideJob'

import { NotificationBell } from '@components/NotificationBell'

import { useWorkerPayrollStore } from '@store/workerPayrollStore'

import { calcAccountDebt, formatMoney } from '@utils/workerPayrollCalc'

import { zoneWorkLabel, isZoneTask } from '@utils/zoneHelpers'

import { useMaterialStore } from '@store/materialStore'

import { useAttendanceStore } from '@store/attendanceStore'

import { WorkerCheckInPanel } from '@components/attendance/WorkerCheckInPanel'

import { DOWNTIME_REASONS } from '@/types/attendance'

import { isTaskOverdue, isTaskDueToday } from '@utils/taskDeadlines'

import { getObjects } from '@api/supabase'

import type { ProjectTask } from '@/types/projectWorkflow'



function taskTitle(task: ProjectTask): string {

  if (task.isSideJob && task.title) return task.title

  if (isZoneTask(task)) {

    return `${zoneWorkLabel(task)} — ${task.apartmentNumber}`

  }

  return `${WORK_TYPE_LABELS[task.workType]} — кв. ${task.apartmentNumber}`

}



export const WorkerDashboard: React.FC = () => {

  const navigate = useNavigate()

  const { haptic } = useTelegram()

  const { isRecording, startRecording, stopRecording } = useVoiceInput()

  const fullName = useUserStore((s) => s.fullName)

  const workflowTasks = useProjectWorkflowStore((s) => Object.values(s.tasks))

  const canStart = useProjectWorkflowStore((s) => s.canStartTask)

  const getBlockingReason = useProjectWorkflowStore((s) => s.getBlockingReason)

  const teamMembers = useObjectStore((s) => s.teamMembers)

  const workerAssignments = useObjectStore((s) => s.workerTaskAssignments)

  const contractorWorkerAssignments = useObjectStore((s) => s.contractorWorkerAssignments)

  const contractorWorkers = useObjectStore((s) => s.contractorWorkers)

  const myWorkerId = resolveWorkerIdForUser(fullName || '')

  const [objectNames, setObjectNames] = useState<Record<string, string>>({})



  useEffect(() => {

    getObjects().then((objs) => {

      const map: Record<string, string> = {}

      for (const o of objs || []) map[o.id] = o.name

      setObjectNames(map)

    })

  }, [])



  const brigadeId = useUserStore((s) => s.brigadeId)
  const brigadeAssignments = useObjectStore((s) => s.brigadeTaskAssignments)

  const myTasks = workflowTasks.filter((t) => {

    if (t.status === 'done') return false

    if (!canAccessTask(t, 'worker', { workerId: myWorkerId, userKey: getCurrentUserKey() })) return false

    if (brigadeId && brigadeAssignments[t.id] === brigadeId) return true

    const assigned = contractorWorkerAssignments[t.id] || workerAssignments[t.id]

    if (!assigned || !myWorkerId) return false

    return assigned === myWorkerId

  })



  const myObjects = useMemo(() => {

    const seen = new Map<string, string>()

    for (const t of myTasks) {

      if (!seen.has(t.objectId)) {

        seen.set(t.objectId, objectNames[t.objectId] || t.section || 'Объект')

      }

    }

    return [...seen.entries()].map(([id, name]) => ({ id, name }))

  }, [myTasks, objectNames])



  const myWorker = teamMembers.find((m) => m.id === myWorkerId)

    || Object.values(contractorWorkers).flat().find((m) => m.id === myWorkerId)



  const getActiveWaitForTask = useMaterialStore((s) => s.getActiveWaitForTask)

  const getActiveDowntime = useAttendanceStore((s) => s.getActiveDowntime)

  const myAccount = useWorkerPayrollStore((s) => (myWorkerId ? s.accounts[myWorkerId] : undefined))

  const myDebt = myAccount ? calcAccountDebt(myAccount) : 0



  return (

    <div className="pb-24">

      <div className="px-4 pt-4 pb-2 flex items-start justify-between gap-2">

        <div>

          <h1 className="text-2xl-mobile font-bold text-gray-900">Мои задачи</h1>

          <p className="text-sm-mobile text-gray-500">

            {myTasks.length} активных

            {myWorker ? ` · ${myWorker.name}` : ''}

          </p>

          {!myWorkerId && workflowTasks.some((t) => workerAssignments[t.id] || contractorWorkerAssignments[t.id]) && (

            <p className="text-xs-mobile text-amber-700 mt-1">Попросите прораба или подрядчика назначить вас на задачи</p>

          )}

        </div>

        <NotificationBell />

      </div>



      {myWorkerId && myWorker && (

        <WorkerCheckInPanel

          workerId={myWorkerId}

          workerName={myWorker.name}

          objects={myObjects}

        />

      )}



      {myWorkerId && (

        <button

          type="button"

          onClick={() => { haptic('light'); navigate('/worker/money') }}

          className="mx-4 mb-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left active:scale-[0.99]"

        >

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">

              <Wallet size={20} className="text-primary-600" />

            </div>

            <div>

              <p className="text-sm-mobile font-semibold text-gray-900">Мои деньги</p>

              <p className="text-xs-mobile text-gray-500">Счёт мастера</p>

            </div>

          </div>

          <div className="text-right">

            <p className={`text-base-mobile font-bold ${myDebt > 0 ? 'text-amber-700' : 'text-gray-600'}`}>

              {formatMoney(myDebt)}

            </p>

            <p className="text-[10px] text-gray-400">долг</p>

          </div>

        </button>

      )}



      {myWorkerId && (

        <button

          type="button"

          onClick={() => { haptic('light'); navigate('/worker/calculators') }}

          className="mx-4 mb-4 w-[calc(100%-2rem)] bg-white rounded-2xl p-4 border border-gray-100 flex items-center justify-between text-left active:scale-[0.99]"

        >

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">

              <Calculator size={20} className="text-primary-600" />

            </div>

            <div>

              <p className="text-sm-mobile font-semibold text-gray-900">История расчётов</p>

              <p className="text-xs-mobile text-gray-500">Архив калькуляторов · Excel</p>

            </div>

          </div>

          <ChevronRight size={18} className="text-gray-300" />

        </button>

      )}



      <div className="px-4 space-y-3">

        {myTasks.length === 0 ? (

          <p className="text-sm-mobile text-gray-500 text-center py-12">

            Нет назначенных задач. Прораб или организация назначит работу на объекте.

          </p>

        ) : (

          myTasks.map((task) => {

            const blockReason = getBlockingReason(task.id)

            const materialWait = getActiveWaitForTask(task.id)

            const downtime = getActiveDowntime(task.id)

            const overdue = isTaskOverdue(task)

            const dueToday = isTaskDueToday(task)

            const paused = materialWait || downtime

            return (

              <div key={task.id} className={`bg-white rounded-xl p-4 border-2 ${

                paused ? 'border-red-300 bg-red-50/30' : overdue ? 'border-red-200 bg-red-50/20' : dueToday ? 'border-orange-200 bg-orange-50/20' : 'border-gray-100'

              }`}>

                <div className="flex items-start justify-between mb-2">

                  <div className="flex-1">

                    <div className="flex items-center gap-1.5">

                      {dueToday && <Flame size={16} className="text-orange-500 shrink-0" />}

                      {overdue && !dueToday && <AlertTriangle size={16} className="text-red-500 shrink-0" />}

                      <h4 className="text-base-mobile font-semibold text-gray-900">{taskTitle(task)}</h4>

                    </div>

                    <p className="text-sm-mobile text-gray-500">

                      {task.isSideJob ? '🔧 Подработка' : task.section}

                    </p>

                    {!task.isSideJob && (

                      <div className="flex items-center gap-1 text-xs-mobile text-gray-400 mt-1">

                        <MapPin size={12} />

                        {task.house}, под. {task.entrance}, эт. {task.floor}

                      </div>

                    )}

                    {task.dueDate && (

                      <p className={`text-xs-mobile mt-1 ${overdue ? 'text-red-600 font-medium' : dueToday ? 'text-orange-600 font-medium' : 'text-gray-400'}`}>

                        Срок: {new Date(task.dueDate).toLocaleDateString('ru-RU')}

                        {overdue && ' · просрочено'}

                        {dueToday && !overdue && ' · горит сегодня'}

                      </p>

                    )}

                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-xs-mobile ${STATUS_COLORS[task.status]}`}>

                    {STATUS_LABELS[task.status]}

                  </span>

                </div>



                {materialWait && (

                  <p className="text-xs-mobile text-red-700 bg-red-100 px-2 py-1 rounded-lg mb-2 font-medium">

                    ⏸ Жду материал

                  </p>

                )}

                {downtime && !materialWait && (

                  <p className="text-xs-mobile text-red-700 bg-red-100 px-2 py-1 rounded-lg mb-2 font-medium">

                    ⏸ {DOWNTIME_REASONS[downtime.reason]}

                    {downtime.reasonText ? `: ${downtime.reasonText}` : ''}

                  </p>

                )}

                {blockReason && (

                  <p className="text-xs-mobile text-amber-700 bg-amber-50 px-2 py-1 rounded-lg mb-2">⏳ {blockReason}</p>

                )}



                <button

                  type="button"

                  onClick={() => { haptic('light'); navigate(`/workflow/${task.id}`) }}

                  disabled={!canStart(task.id) && task.status === 'pending'}

                  className="w-full flex items-center justify-between text-primary-600 text-sm-mobile font-medium py-2 disabled:opacity-50"

                >

                  Открыть задачу (чертёж, чат)

                  <ChevronRight size={18} />

                </button>

              </div>

            )

          })

        )}

      </div>



      <button

        type="button"

        onClick={isRecording ? stopRecording : startRecording}

        className={`fixed bottom-20 right-4 w-16 h-16 rounded-full flex items-center justify-center shadow-lg z-50 ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-primary-600 text-white'}`}

        aria-label={isRecording ? 'Остановить запись' : 'Голосовая заметка'}

      >

        {isRecording ? <MicOff size={28} /> : <Mic size={28} />}

      </button>

    </div>

  )

}

