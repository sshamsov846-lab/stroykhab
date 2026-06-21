import React, { useMemo } from 'react'
import { useBrigadeStore } from '@store/brigadeStore'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface Props {
  taskId: string
  brigadeId: string
}

export const BrigadeProgressPanel: React.FC<Props> = ({ taskId, brigadeId }) => {
  const contributions = useBrigadeStore((s) => s.getContributionsForTask(taskId))
  const brigade = useBrigadeStore((s) => s.getBrigade(brigadeId))
  const task = useProjectWorkflowStore((s) => s.tasks[taskId])
  const brigadeAssignments = useObjectStore((s) => s.brigadeTaskAssignments)

  const totalInScope = useMemo(() => {
    if (!task) return 1
    const tasks = useProjectWorkflowStore.getState().tasks
    const count = Object.entries(brigadeAssignments).filter(([tid, bid]) => {
      if (bid !== brigadeId) return false
      const t = tasks[tid]
      return t && t.objectId === task.objectId && t.workType === task.workType
    }).length
    return count || 1
  }, [task, brigadeId, brigadeAssignments])

  const byWorker = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>()
    for (const c of contributions) {
      const cur = map.get(c.workerUserKey) ?? { name: c.workerName, count: 0 }
      cur.count++
      map.set(c.workerUserKey, cur)
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [contributions])

  const doneCount = new Set(contributions.map((c) => c.apartmentLabel)).size

  if (!brigade) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">Прогресс: {brigade.name}</p>
      <div className="flex items-center justify-between text-sm-mobile">
        <span className="text-gray-600">Отчётов в чате</span>
        <span className="font-bold text-primary-600">{doneCount} / ~{totalInScope} кв.</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-primary-500 rounded-full"
          style={{ width: `${Math.min(100, (doneCount / totalInScope) * 100)}%` }}
        />
      </div>
      <p className="text-xs-mobile text-gray-500">Вклад каждого мастера:</p>
      {byWorker.length === 0 ? (
        <p className="text-xs-mobile text-gray-400">Пока нет фото-отчётов в чате</p>
      ) : (
        byWorker.map((w) => (
          <div key={w.name} className="flex justify-between text-sm-mobile">
            <span>{w.name}</span>
            <span className="font-medium text-emerald-600">{w.count} ✓</span>
          </div>
        ))
      )}
    </div>
  )
}
