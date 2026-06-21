import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mic, MicOff } from 'lucide-react'
import { BigButton } from './BigButton'
import { PhotoUploader } from './PhotoUploader'
import { useVoiceInput } from '@hooks/useVoiceInput'

const expenseSchema = z.object({
  amount: z.number().min(1, 'Введите сумму'),
  category: z.enum(['materials', 'tools', 'salary', 'transport', 'other']),
  description: z.string().min(1, 'Введите описание'),
})

type ExpenseFormData = z.infer<typeof expenseSchema>

interface ExpenseFormProps {
  objectId: string
  onSubmit: (data: ExpenseFormData & { receipt?: File; receiptData?: unknown }) => void
  onCancel?: () => void
}

const categories = [
  { value: 'materials' as const, label: 'Материалы', emoji: '🧱' },
  { value: 'tools' as const, label: 'Инструмент', emoji: '🔧' },
  { value: 'salary' as const, label: 'Зарплата', emoji: '💰' },
  { value: 'transport' as const, label: 'Транспорт', emoji: '🚚' },
  { value: 'other' as const, label: 'Другое', emoji: '📋' },
]

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ objectId, onSubmit, onCancel }) => {
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const { isRecording, transcript, startRecording, stopRecording } = useVoiceInput()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: { category: 'materials' },
  })

  React.useEffect(() => {
    if (transcript) setValue('description', transcript)
  }, [transcript, setValue])

  const handleReceiptScan = async (file: File) => {
    setReceiptFile(file)
    setIsScanning(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      const mockData = {
        store_name: 'Петрович',
        total: 2450,
        items: [
          { name: 'Саморезы 4.2х51', quantity: 1, price: 350, sum: 350 },
          { name: 'Краска водоэмульсионная', quantity: 2, price: 1050, sum: 2100 },
        ],
      }
      setValue('amount', mockData.total)
      setValue('description', `Чек из ${mockData.store_name}: ${mockData.items.map((i) => i.name).join(', ')}`)
    } catch (error) {
      console.error('Ошибка сканирования:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleFormSubmit = (data: ExpenseFormData) => {
    onSubmit({ ...data, receipt: receiptFile || undefined })
    void objectId
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      <div className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
        <h4 className="text-base-mobile font-semibold text-amber-900 mb-2">📸 Сканировать чек (ИИ)</h4>
        <PhotoUploader
          onPhotoSelect={(file) => handleReceiptScan(file)}
          label={isScanning ? 'Распознаём...' : 'Сфоткать чек'}
          type="progress"
        />
        {isScanning && <p className="text-sm-mobile text-amber-700 mt-2 text-center">ИИ анализирует чек...</p>}
      </div>

      <div>
        <label className="block text-sm-mobile font-medium text-gray-700 mb-1">Сумма (₽)</label>
        <input
          type="number"
          {...register('amount', { valueAsNumber: true })}
          className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-lg-mobile focus:ring-2 focus:ring-primary-500"
          placeholder="0"
        />
        {errors.amount && <p className="text-sm-mobile text-red-600 mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm-mobile font-medium text-gray-700 mb-2">Категория</label>
        <div className="grid grid-cols-2 gap-2">
          {categories.map((cat) => (
            <label
              key={cat.value}
              className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                watch('category') === cat.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input type="radio" value={cat.value} {...register('category')} className="hidden" />
              <span className="text-xl">{cat.emoji}</span>
              <span className="text-sm-mobile font-medium">{cat.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm-mobile font-medium text-gray-700 mb-1">Описание</label>
        <div className="relative">
          <textarea
            {...register('description')}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile focus:ring-2 focus:ring-primary-500 resize-none pr-12"
            placeholder="Что купили..."
          />
          <button
            type="button"
            onClick={isRecording ? stopRecording : startRecording}
            className={`absolute right-3 top-3 w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
          </button>
        </div>
        {isRecording && <p className="text-sm-mobile text-red-600 mt-1">🎙️ Говорите...</p>}
        {errors.description && <p className="text-sm-mobile text-red-600 mt-1">{errors.description.message}</p>}
      </div>

      <div className="flex gap-3 pt-2">
        {onCancel && (
          <BigButton type="button" variant="ghost" size="lg" fullWidth onClick={onCancel}>
            Отмена
          </BigButton>
        )}
        <BigButton type="submit" variant="primary" size="lg" fullWidth isLoading={isSubmitting}>
          💾 Сохранить расход
        </BigButton>
      </div>
    </form>
  )
}
