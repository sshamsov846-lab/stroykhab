import React, { useState } from 'react'
import toast from 'react-hot-toast'
import { MessageSquare, CheckCircle2 } from 'lucide-react'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'

interface Props {
  objectId: string
}

export const ObjectRemarksPanel: React.FC<Props> = ({ objectId }) => {
  const openRemarks = useQualityAcceptanceStore((s) => s.getOpenRemarksForObject(objectId))
  const resolveRemark = useQualityAcceptanceStore((s) => s.resolveRemark)
  const addRemark = useQualityAcceptanceStore((s) => s.addRemark)
  const [text, setText] = useState('')

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-center gap-2">
        <MessageSquare size={18} className="text-amber-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">
          Замечания {openRemarks.length > 0 && `(${openRemarks.length})`}
        </p>
      </div>

      {openRemarks.length === 0 ? (
        <p className="text-xs-mobile text-gray-500">Открытых замечаний нет</p>
      ) : (
        <div className="space-y-2">
          {openRemarks.map((r) => (
            <div key={r.id} className="bg-amber-50 border border-amber-100 rounded-xl p-3">
              <p className="text-xs-mobile font-medium text-amber-900">{r.workLabel}</p>
              <p className="text-sm-mobile text-amber-800 mt-1">{r.text}</p>
              <p className="text-[10px] text-amber-600 mt-1">
                {r.authorName} · {new Date(r.createdAt).toLocaleDateString('ru-RU')}
              </p>
              <button
                type="button"
                onClick={() => {
                  resolveRemark(r.id)
                  toast.success('Замечание закрыто')
                }}
                className="mt-2 text-xs-mobile text-emerald-700 font-medium flex items-center gap-1"
              >
                <CheckCircle2 size={14} /> Исправлено
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-gray-100 pt-3">
        <p className="text-xs-mobile text-gray-500 mb-2">Добавить замечание по объекту</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="Что доделать по мелочи…"
          className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile resize-none"
        />
        <button
          type="button"
          disabled={!text.trim()}
          onClick={() => {
            addRemark({
              objectId,
              taskId: 'object',
              workLabel: 'Общее по объекту',
              text: text.trim(),
              authorName: 'Прораб',
            })
            setText('')
            toast.success('Замечание добавлено')
          }}
          className="mt-2 w-full py-2 rounded-xl bg-amber-100 text-amber-900 text-sm-mobile font-medium disabled:opacity-50"
        >
          Добавить замечание
        </button>
      </div>
    </div>
  )
}
