import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ProjectImportUpload } from '@components/workflow/ProjectImportUpload'
import { BulkAssignContractors } from '@components/workflow/BulkAssignContractors'
import { BlueprintUpload } from '@components/workflow/BlueprintUpload'
import type { WorkType } from '@types'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

const WORK_TYPES_FOR_BLUEPRINT: WorkType[] = ['electrical', 'plumbing', 'plaster', 'screed', 'paint']

export const ProjectSetup: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) return null

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg-mobile font-bold">Настройка объекта</h1>
      </div>
      <div className="p-4 space-y-4">
        <ProjectImportUpload objectId={id} />
        <BulkAssignContractors objectId={id} />
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <h3 className="text-base-mobile font-semibold text-gray-900">Чертежи по видам работ</h3>
          <p className="text-sm-mobile text-gray-500">Привязка PDF/изображений к категории работ</p>
          {WORK_TYPES_FOR_BLUEPRINT.map((wt) => (
            <BlueprintUpload key={wt} objectId={id} workType={wt} label={`Чертёж: ${WORK_TYPE_LABELS[wt]}`} />
          ))}
        </div>
      </div>
    </div>
  )
}
