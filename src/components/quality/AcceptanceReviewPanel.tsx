import React, { useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { CheckCircle2, RotateCcw, Plus, ClipboardCheck, Printer, Download } from 'lucide-react'
import { BigButton } from '@components/BigButton'
import type { WorkType } from '@types'
import type { ChecklistItemResult } from '@/types/qualityChecklist'
import {
  resolveChecklistItems,
  buildEmptyChecklistResults,
  validateChecklistForAcceptance,
} from '@/types/qualityChecklist'
import { useQualityAcceptanceStore } from '@store/qualityAcceptanceStore'
import { printAcceptanceAct, downloadAcceptanceActHtml } from '@utils/acceptanceActPdf'
import type { AcceptanceAct } from '@store/qualityAcceptanceStore'
import { SubWorkRedoModal } from '@components/workflow/SubWorkRedoModal'

interface Props {
  taskId: string
  subWorkId?: string
  objectId: string
  objectName?: string
  workType: WorkType
  workLabel: string
  apartmentNumber: string
  photos: string[]
  isForeman: boolean
  isClient: boolean
  authorName: string
  onAccept: (payload: {
    checklist: ChecklistItemResult[]
    generalRemark?: string
    clientApproved?: boolean
  }) => { ok: boolean; error?: string; act?: AcceptanceAct }
  onRedo: (reason: string) => void
  hiddenWorkBlocked?: boolean
}

export const AcceptanceReviewPanel: React.FC<Props> = ({
  taskId,
  subWorkId,
  objectId,
  workType,
  workLabel,
  apartmentNumber: _apartmentNumber,
  isForeman,
  isClient,
  onAccept,
  onRedo,
  hiddenWorkBlocked,
}) => {
  const getExtraItems = useQualityAcceptanceStore((s) => s.getExtraChecklistItems)
  const addCustomItem = useQualityAcceptanceStore((s) => s.addCustomChecklistItem)
  const existingAct = useQualityAcceptanceStore((s) => s.getActForTask(taskId, subWorkId))
  const [lastAct, setLastAct] = useState<AcceptanceAct | undefined>()
  const checklistDefs = useMemo(
    () => resolveChecklistItems(workType, getExtraItems(objectId, workType)),
    [workType, objectId, getExtraItems],
  )

  const [checklist, setChecklist] = useState<ChecklistItemResult[]>(() =>
    buildEmptyChecklistResults(checklistDefs),
  )
  const [generalRemark, setGeneralRemark] = useState('')
  const [clientApproved, setClientApproved] = useState(false)
  const [newItemLabel, setNewItemLabel] = useState('')
  const [redoOpen, setRedoOpen] = useState(false)

  const act = lastAct || existingAct

  const toggleItem = (itemId: string) => {
    setChecklist((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, checked: !i.checked, note: i.checked ? i.note : undefined } : i)),
    )
  }

  const setItemNote = (itemId: string, note: string) => {
    setChecklist((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, note, checked: note.trim() ? false : i.checked } : i)),
    )
  }

  const handleAccept = () => {
    if (hiddenWorkBlocked) {
      toast.error('Нельзя принять без фото до закрытия')
      return
    }
    const err = validateChecklistForAcceptance(checklist)
    if (err) {
      toast.error(err)
      return
    }
    const result = onAccept({
      checklist,
      generalRemark: generalRemark.trim() || undefined,
      clientApproved: isClient ? true : clientApproved,
    })
    if (!result.ok) {
      toast.error(result.error || 'Не удалось принять')
      return
    }
    if (result.act) setLastAct(result.act)
    toast.success('Принято, акт сформирован')
  }

  React.useEffect(() => {
    if (!act) setChecklist(buildEmptyChecklistResults(checklistDefs))
  }, [checklistDefs.map((d) => d.id).join(','), act])

  if (act) {
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-700" />
          <p className="text-sm-mobile font-semibold text-emerald-900">Работа принята</p>
        </div>
        <p className="text-xs-mobile text-emerald-800">
          Гарантия до {new Date(act.warrantyUntil).toLocaleDateString('ru-RU')} ({act.warrantyMonths} мес.)
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => printAcceptanceAct(act)}
            className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 text-sm-mobile font-medium"
          >
            <Printer size={16} /> PDF / Печать
          </button>
          <button
            type="button"
            onClick={() => downloadAcceptanceActHtml(act)}
            className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800"
            aria-label="Скачать"
          >
            <Download size={16} />
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck size={18} className="text-primary-600" />
          <p className="text-sm-mobile font-semibold text-gray-900">Чек-лист качества</p>
        </div>
        <p className="text-xs-mobile text-gray-500">
          {workLabel} · отметьте все пункты или укажите замечание к каждому неотмеченному
        </p>

        <div className="space-y-2">
          {checklist.map((item) => (
            <div key={item.itemId} className="rounded-xl border border-gray-100 p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={() => toggleItem(item.itemId)}
                  className="mt-1 rounded text-primary-600"
                />
                <span className={`text-sm-mobile flex-1 ${item.checked ? 'text-gray-900' : 'text-gray-700'}`}>
                  {item.label}
                </span>
              </label>
              {!item.checked && (
                <input
                  type="text"
                  value={item.note ?? ''}
                  onChange={(e) => setItemNote(item.itemId, e.target.value)}
                  placeholder="Замечание по пункту…"
                  className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 text-xs-mobile"
                />
              )}
            </div>
          ))}
        </div>

        {(isForeman || isClient) && (
          <div className="flex gap-2">
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Добавить пункт чек-листа…"
              className="flex-1 px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
            />
            <button
              type="button"
              onClick={() => {
                if (!newItemLabel.trim()) return
                addCustomItem(objectId, workType, newItemLabel)
                setNewItemLabel('')
                toast.success('Пункт добавлен')
              }}
              className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700"
              aria-label="Добавить пункт"
            >
              <Plus size={18} />
            </button>
          </div>
        )}

        <div>
          <label className="text-xs-mobile font-medium text-gray-600">Общее замечание (необязательно)</label>
          <textarea
            value={generalRemark}
            onChange={(e) => setGeneralRemark(e.target.value)}
            rows={2}
            placeholder="Что доделать по мелочи, даже при приёмке…"
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile resize-none"
          />
        </div>

        {isForeman && (
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={clientApproved}
              onChange={(e) => setClientApproved(e.target.checked)}
              className="rounded text-primary-600"
            />
            <span className="text-sm-mobile text-gray-800">Согласовано с заказчиком</span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <BigButton variant="primary" size="lg" fullWidth icon={<CheckCircle2 size={18} />} onClick={handleAccept}>
          Принять с актом
        </BigButton>
        <BigButton variant="danger" size="lg" fullWidth icon={<RotateCcw size={18} />} onClick={() => setRedoOpen(true)}>
          Переделать
        </BigButton>
      </div>

      <SubWorkRedoModal
        open={redoOpen}
        onClose={() => setRedoOpen(false)}
        onSubmit={(reason) => {
          onRedo(reason)
          toast.success('Отправлено на переделку')
          setRedoOpen(false)
        }}
      />
    </>
  )
}
