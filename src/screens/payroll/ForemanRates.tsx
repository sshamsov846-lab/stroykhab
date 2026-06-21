import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Download, Upload, FileSpreadsheet, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRateCatalogStore } from '@store/rateCatalogStore'
import { RATE_UNIT_LABELS } from '@/types/rateCatalog'
import type { WorkRateEntry } from '@/types/rateCatalog'
import { parseRatesFile, SAMPLE_RATES_CSV } from '@utils/parseRatesFile'
import { BigButton } from '@components/BigButton'

export const ForemanRates: React.FC = () => {
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)
  const rates = useRateCatalogStore((s) => s.getAllRates())
  const setRate = useRateCatalogStore((s) => s.setRate)
  const importRates = useRateCatalogStore((s) => s.importRates)
  const [loading, setLoading] = useState(false)

  const totalMargin = rates.reduce((s, r) => s + (r.incomingPrice - r.outgoingPrice), 0)

  const handleImport = async (file: File) => {
    setLoading(true)
    try {
      const { rates: parsed, errors } = await parseRatesFile(file)
      if (!parsed.length) {
        toast.error(errors[0] || 'Нет данных для импорта')
        return
      }
      const count = importRates(parsed, 'organization')
      if (errors.length) toast.error(`Импортировано ${count}, ошибок: ${errors.length}`)
      else toast.success(`Импортировано ${count} расценок`)
    } catch {
      toast.error('Не удалось прочитать файл')
    } finally {
      setLoading(false)
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_RATES_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'raszenki-primer.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const updateField = (entry: WorkRateEntry, field: 'incomingPrice' | 'outgoingPrice', value: number) => {
    setRate({ ...entry, [field]: value })
  }

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-primary-600 text-white px-4 pt-6 pb-8 rounded-b-3xl">
        <div className="flex items-center gap-2 mb-2">
          <button
            type="button"
            onClick={() => navigate('/payroll')}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white/15"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-xl-mobile font-bold">Мои расценки</h1>
        </div>
        <p className="text-sm-mobile text-primary-100">Входящие и исходящие цены по видам работ</p>
        <div className="mt-4 bg-white/15 rounded-xl p-3 flex items-center gap-2">
          <TrendingUp size={18} />
          <div>
            <p className="text-xs text-primary-100">Средняя маржа за единицу (по справочнику)</p>
            <p className="text-sm-mobile font-bold">
              {rates.length ? `${Math.round(totalMargin / rates.length).toLocaleString('ru-RU')} ₽` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-2">
        <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-primary-600" />
            <h3 className="text-base-mobile font-semibold text-gray-900">Импорт CSV / Excel</h3>
          </div>
          <p className="text-xs-mobile text-gray-500">
            Колонки: Work_Type, Incoming_Price, Outgoing_Price, Unit, Source
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,.txt,.xlsx,.xls"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleImport(f)
              e.target.value = ''
            }}
          />
          <div className="flex gap-2">
            <BigButton
              variant="primary"
              size="md"
              fullWidth
              icon={<Upload size={18} />}
              disabled={loading}
              onClick={() => inputRef.current?.click()}
            >
              {loading ? 'Чтение…' : 'Загрузить'}
            </BigButton>
            <button
              type="button"
              onClick={downloadSample}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm-mobile text-gray-700 flex items-center gap-1 shrink-0"
            >
              <Download size={16} /> Пример
            </button>
          </div>
        </div>

        <h2 className="text-base-mobile font-semibold text-gray-900">Прайс-лист</h2>
        <div className="space-y-3">
          {rates.map((r) => {
            const margin = r.incomingPrice - r.outgoingPrice
            return (
              <div key={r.workType} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{r.label}</p>
                    <p className="text-xs-mobile text-gray-500">
                      {RATE_UNIT_LABELS[r.unit]} · {r.source === 'organization' ? 'от организации' : 'своя'}
                    </p>
                  </div>
                  <span className={`text-sm-mobile font-bold ${margin > 0 ? 'text-emerald-700' : 'text-gray-500'}`}>
                    +{margin} ₽
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase">От заказчика</label>
                    <input
                      type="number"
                      min={0}
                      value={r.incomingPrice}
                      onChange={(e) => updateField(r, 'incomingPrice', Number(e.target.value))}
                      className="mt-0.5 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-medium text-gray-500 uppercase">Мастеру</label>
                    <input
                      type="number"
                      min={0}
                      value={r.outgoingPrice}
                      onChange={(e) => updateField(r, 'outgoingPrice', Number(e.target.value))}
                      className="mt-0.5 w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile"
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
