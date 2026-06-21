import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Printer, Download, ClipboardCheck } from 'lucide-react'
import { getObjectById } from '@api/supabase'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'
import { printAcceptanceAct, downloadAcceptanceActHtml } from '@utils/acceptanceActPdf'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

export const AcceptanceActsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const acts = useQualityAcceptanceStore((s) => (id ? s.getActsForObject(id) : []))
  const [objectName, setObjectName] = React.useState('')

  React.useEffect(() => {
    if (!id) return
    getObjectById(id).then((obj) => {
      if (obj) setObjectName(obj.name)
    })
  }, [id])

  if (!id) return <div className="p-4 text-gray-500">Объект не найден</div>

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(`/object/${id}`)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <div>
          <h1 className="text-lg-mobile font-bold">Акты приёмки</h1>
          <p className="text-xs-mobile text-gray-500">{objectName || 'Объект'}</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {acts.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 border border-gray-100 text-center">
            <ClipboardCheck size={36} className="mx-auto text-gray-300 mb-2" />
            <p className="text-sm-mobile text-gray-600">Актов пока нет</p>
            <p className="text-xs-mobile text-gray-400 mt-1">Формируются при приёмке с чек-листом</p>
          </div>
        ) : (
          acts.map((act) => (
            <div key={act.id} className="bg-white rounded-xl p-4 border border-gray-100">
              <p className="text-sm-mobile font-semibold text-gray-900">{act.workLabel}</p>
              <p className="text-xs-mobile text-gray-500 mt-0.5">
                {WORK_TYPE_LABELS[act.workType]} · {act.apartmentNumber}
              </p>
              <p className="text-xs-mobile text-gray-400 mt-1">
                {new Date(act.acceptedAt).toLocaleString('ru-RU')} · {act.acceptedBy}
              </p>
              <p className="text-xs-mobile text-emerald-700 mt-1">
                Гарантия до {new Date(act.warrantyUntil).toLocaleDateString('ru-RU')}
              </p>
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={() => printAcceptanceAct(act)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl bg-primary-50 text-primary-800 text-xs-mobile font-medium"
                >
                  <Printer size={14} /> PDF
                </button>
                <button
                  type="button"
                  onClick={() => downloadAcceptanceActHtml(act)}
                  className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700"
                  aria-label="Скачать"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
