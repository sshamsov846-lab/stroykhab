import React, { useRef, useState } from 'react'
import { Upload, FileSpreadsheet, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import { BigButton } from '@components/BigButton'
import { parseEstimateFile, SAMPLE_CSV } from '@utils/parseEstimateCsv'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

interface ProjectImportUploadProps {
  objectId: string
  onSuccess?: (count: number) => void
}

export const ProjectImportUpload: React.FC<ProjectImportUploadProps> = ({ objectId, onSuccess }) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const importHierarchy = useProjectWorkflowStore((s) => s.importHierarchy)
  const [preview, setPreview] = useState<{ rows: number; errors: string[]; format?: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const processFile = async (file: File) => {
    setLoading(true)
    try {
      const { rows, errors, format } = await parseEstimateFile(file)
      setPreview({ rows: rows.length, errors, format: format.toUpperCase() })
      if (errors.length && !rows.length) {
        toast.error(errors[0])
        return
      }
      const count = importHierarchy(objectId, rows)
      toast.success(`Импорт ${format.toUpperCase()}: создано ${count} задач`)
      onSuccess?.(count)
    } catch {
      toast.error('Не удалось прочитать файл')
    } finally {
      setLoading(false)
    }
  }

  const downloadSample = () => {
    const blob = new Blob([SAMPLE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'smeta-primer.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
      <div className="flex items-center gap-2">
        <FileSpreadsheet size={20} className="text-primary-600" />
        <h3 className="text-base-mobile font-semibold text-gray-900">Импорт из CSV / Excel</h3>
      </div>
      <p className="text-sm-mobile text-gray-500">
        Поддерживаются форматы CSV и Excel (.xlsx). Колонки: Section, House, Entrance, Floor, Apartment_Number, Task_Type.
        Для Excel используется первый лист.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void processFile(f)
          e.target.value = ''
        }}
      />

      <BigButton
        variant="primary"
        size="lg"
        fullWidth
        icon={<Upload size={20} />}
        disabled={loading}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? 'Чтение файла…' : 'Загрузить смету'}
      </BigButton>

      <button type="button" onClick={downloadSample} className="w-full flex items-center justify-center gap-2 text-primary-600 text-sm-mobile font-medium py-2">
        <Download size={16} />
        Скачать пример CSV
      </button>

      {preview && (
        <div className={`p-3 rounded-xl text-sm-mobile ${preview.errors.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'}`}>
          {preview.format && <p>Формат: {preview.format}</p>}
          {preview.rows > 0 && <p>Обработано строк: {preview.rows}</p>}
          {preview.errors.slice(0, 3).map((e) => <p key={e}>{e}</p>)}
        </div>
      )}
    </div>
  )
}
