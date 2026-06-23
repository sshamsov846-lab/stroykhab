import React, { useRef } from 'react'
import { Camera, X, Plus } from 'lucide-react'

interface Props {
  value: string[]
  onChange: (urls: string[]) => void
  maxPhotos?: number
}

export const ObjectPhotosUpload: React.FC<Props> = ({ value, onChange, maxPhotos = 8 }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return
    const remaining = maxPhotos - value.length
    if (remaining <= 0) return

    const batch = Array.from(files).slice(0, remaining).filter((f) => f.type.startsWith('image/') && f.size <= 4 * 1024 * 1024)
    if (!batch.length) return

    Promise.all(
      batch.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () =>
              typeof reader.result === 'string' ? resolve(reader.result) : reject()
            reader.onerror = () => reject()
            reader.readAsDataURL(file)
          }),
      ),
    ).then((urls) => onChange([...value, ...urls]))
  }

  const removeAt = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {value.map((url, i) => (
          <div key={`${i}-${url.slice(0, 24)}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-gray-200">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="absolute top-0.5 right-0.5 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
              aria-label="Удалить фото"
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {value.length < maxPhotos && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-colors"
          >
            <Plus size={20} />
            <span className="text-[10px] mt-0.5">Фото</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      <p className="text-xs-mobile text-gray-500 flex items-center gap-1">
        <Camera size={12} />
        До {maxPhotos} фото, до 4 МБ каждое. Покажите участок, фасад или планируемые работы.
      </p>
    </div>
  )
}
