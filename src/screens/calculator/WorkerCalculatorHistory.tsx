import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Calculator, ChevronRight, Download, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useUserStore } from '@store/userStore'
import { useWorkCalculatorStore } from '@store/workCalculatorStore'
import { resolveWorkerIdForUser } from '@utils/notificationFilter'
import { CALCULATOR_STATUS_LABELS, type CalculatorStatus } from '@/types/workCalculator'
import { formatMoney } from '@utils/workerPayrollCalc'
import { downloadCalculatorReportExcel } from '@utils/calculatorReportExcel'
import { CalculatorReportDetail } from '@components/calculator/CalculatorReportDetail'

const STATUS_FILTERS: { id: CalculatorStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Все' },
  { id: 'draft', label: 'Черновик' },
  { id: 'submitted', label: 'Отправлен' },
  { id: 'accepted', label: 'Принят' },
  { id: 'returned', label: 'На уточнении' },
]

export const WorkerCalculatorHistory: React.FC = () => {
  const navigate = useNavigate()
  const fullName = useUserStore((s) => s.fullName)
  const workerId = resolveWorkerIdForUser(fullName || '')
  const getCalculatorsForWorker = useWorkCalculatorStore((s) => s.getCalculatorsForWorker)

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<CalculatorStatus | 'all'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const items = useMemo(() => {
    let list = workerId ? getCalculatorsForWorker(workerId) : []
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter)
    const q = query.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          c.objectName.toLowerCase().includes(q)
          || c.zoneLabel.toLowerCase().includes(q)
          || c.workerName.toLowerCase().includes(q),
      )
    }
    return list
  }, [workerId, getCalculatorsForWorker, statusFilter, query])

  const selected = selectedId ? items.find((c) => c.id === selectedId) ?? useWorkCalculatorStore.getState().getCalculator(selectedId) : null

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white px-4 pt-6 pb-4 rounded-b-3xl">
        <button type="button" onClick={() => (selectedId ? setSelectedId(null) : navigate(-1))} className="flex items-center gap-1 text-primary-100 text-sm-mobile mb-2">
          <ArrowLeft size={16} />
          {selectedId ? 'К списку' : 'Назад'}
        </button>
        <h1 className="text-xl-mobile font-bold flex items-center gap-2">
          <Calculator size={22} />
          История расчётов
        </h1>
        <p className="text-sm-mobile text-primary-100 mt-1">Архив всех ваших калькуляторов</p>
      </div>

      <div className="px-4 py-4 space-y-3">
        {!selectedId && (
          <>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Поиск по объекту, зоне…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm-mobile bg-white"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {STATUS_FILTERS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setStatusFilter(f.id)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-xs-mobile font-medium ${
                    statusFilter === f.id ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}

        {selected ? (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <CalculatorReportDetail
              calc={selected}
              onDownload={() => toast.success('Excel сохранён')}
            />
            <button
              type="button"
              onClick={() => navigate(`/workflow/${selected.taskId}`)}
              className="w-full mt-3 text-primary-600 text-sm-mobile font-medium py-2"
            >
              Открыть задачу
            </button>
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-gray-500 text-sm-mobile py-12">Расчётов пока нет</p>
        ) : (
          items.map((calc) => (
            <button
              key={calc.id}
              type="button"
              onClick={() => setSelectedId(calc.id)}
              className="w-full bg-white rounded-2xl p-4 border border-gray-100 text-left"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{calc.objectName}</p>
                  <p className="text-xs-mobile text-gray-500 truncate">{calc.zoneLabel}</p>
                  <p className="text-xs-mobile text-gray-400 mt-1">
                    {new Date(calc.updatedAt).toLocaleDateString('ru-RU')} · {CALCULATOR_STATUS_LABELS[calc.status]}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm-mobile font-bold text-primary-700">{formatMoney(calc.grandTotal)}</p>
                  <ChevronRight size={16} className="text-gray-300 ml-auto mt-1" />
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  downloadCalculatorReportExcel(calc)
                  toast.success('Excel сохранён')
                }}
                className="mt-2 text-xs-mobile text-primary-600 flex items-center gap-1"
              >
                <Download size={12} />
                Скачать
              </button>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
