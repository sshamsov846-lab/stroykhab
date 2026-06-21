import React, { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { BigButton } from './BigButton'
import type { PhotoType } from '@types'

interface PhotoUploaderProps {
  onPhotoSelect: (file: File, preview: string) => void
  onPhotoRemove?: () => void
  existingPhoto?: string
  label?: string
  type?: PhotoType
}

const typeLabels: Record<PhotoType, string> = {
  before: 'До работы',
  after: 'После работы',
  progress: 'Прогресс',
  defect: 'Дефект',
  hidden_work: 'Скрытая работа',
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX_WIDTH = 1200
        const MAX_HEIGHT = 1200
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width
            width = MAX_WIDTH
          }
        } else if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height
          height = MAX_HEIGHT
        }
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d')?.drawImage(img, 0, 0, width, height)
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }))
            else reject(new Error('Ошибка сжатия'))
          },
          'image/jpeg',
          0.8,
        )
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onPhotoSelect,
  onPhotoRemove,
  existingPhoto,
  label = 'Добавить фото',
  type = 'progress',
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(existingPhoto || null)
  const [isCompressing, setIsCompressing] = useState(false)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsCompressing(true)
    try {
      const compressed = await compressImage(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string
        setPreview(previewUrl)
        onPhotoSelect(compressed, previewUrl)
      }
      reader.readAsDataURL(compressed)
    } catch (error) {
      console.error('Ошибка сжатия:', error)
      const reader = new FileReader()
      reader.onload = (event) => {
        const previewUrl = event.target?.result as string
        setPreview(previewUrl)
        onPhotoSelect(file, previewUrl)
      }
      reader.readAsDataURL(file)
    } finally {
      setIsCompressing(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    if (inputRef.current) inputRef.current.value = ''
    onPhotoRemove?.()
  }

  if (preview) {
    return (
      <div className="relative rounded-2xl overflow-hidden border-2 border-primary-200">
        <img src={preview} alt="Preview" className="w-full h-48 object-cover" />
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-2 right-2 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg active:scale-90 transition-transform"
        >
          ✕
        </button>
        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white px-3 py-2 text-sm-mobile">{typeLabels[type]}</div>
      </div>
    )
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="hidden" />
      <BigButton
        variant="secondary"
        size="lg"
        fullWidth
        icon={isCompressing ? undefined : <Camera size={24} />}
        onClick={() => inputRef.current?.click()}
        disabled={isCompressing}
      >
        {isCompressing ? 'Сжимаем фото...' : label}
      </BigButton>
      <p className="text-xs-mobile text-gray-400 text-center mt-2">Фото сжимаются автоматически</p>
    </div>
  )
}
