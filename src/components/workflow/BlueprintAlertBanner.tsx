import React from 'react'
import { AlertTriangle } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface BlueprintAlertBannerProps {
  taskId: string
}

export const BlueprintAlertBanner: React.FC<BlueprintAlertBannerProps> = ({ taskId }) => {
  const needsAck = useProjectWorkflowStore((s) => s.needsBlueprintAck(taskId))
  const blueprint = useProjectWorkflowStore((s) => s.getBlueprintForTask(taskId))
  const acknowledge = useProjectWorkflowStore((s) => s.acknowledgeBlueprint)

  if (!needsAck || !blueprint) return null

  return (
    <div className="bg-red-600 text-white rounded-2xl p-4 shadow-lg border-2 border-red-700 animate-pulse">
      <div className="flex items-start gap-3">
        <AlertTriangle size={24} className="shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-base-mobile font-bold">Внимание! Проект изменён!</p>
          <p className="text-sm-mobile text-red-100 mt-1">
            Загружена новая версия чертежа (v{blueprint.version}). Ознакомьтесь перед продолжением работ.
          </p>
          <BigButton
            variant="secondary"
            size="md"
            className="mt-3 !bg-white !text-red-700"
            onClick={() => acknowledge(taskId)}
          >
            Я ознакомился с обновлённым планом
          </BigButton>
        </div>
      </div>
    </div>
  )
}
