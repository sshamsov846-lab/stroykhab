import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { NotificationBell } from '@components/NotificationBell'
import { useUserStore } from '@store/userStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface Props {
  title: string
  subtitle?: string
}

export const SubcontractorHeader: React.FC<Props> = ({ title, subtitle }) => {
  const navigate = useNavigate()
  const contractorId = useUserStore((s) => s.contractorId)
  const org = useProjectWorkflowStore((s) => s.contractors.find((c) => c.id === contractorId))

  return (
    <div className="bg-primary-600 text-white px-4 pt-4 pb-5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <p className="text-sm-mobile text-primary-100">Кабинет организации</p>
          <h1 className="text-xl-mobile font-bold truncate">{title}</h1>
          {(subtitle || org?.name) && (
            <p className="text-sm-mobile text-primary-100 mt-0.5 truncate">
              {subtitle ?? org?.name}
            </p>
          )}
        </div>
        <div className="flex gap-1 shrink-0">
          <NotificationBell variant="onPrimary" />
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30"
            aria-label="Настройки"
          >
            <Settings size={20} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  )
}
