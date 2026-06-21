import React, { useRef } from 'react'
import { Camera, User } from 'lucide-react'

interface Props {
  value: string
  onChange: (dataUrl: string) => void
  required?: boolean
}

export const FacePhotoUpload: React.FC<Props> = ({ value, onChange, required = true }) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Фото не больше 3 МБ')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="relative w-28 h-28 rounded-full border-4 border-primary-100 bg-gray-50 overflow-hidden flex items-center justify-center"
      >
        {value ? (
          <img src={value} alt="Фото лица" className="w-full h-full object-cover" />
        ) : (
          <User size={40} className="text-gray-300" />
        )}
        <span className="absolute bottom-0 inset-x-0 bg-black/50 text-white text-[10px] py-1 flex items-center justify-center gap-1">
          <Camera size={12} /> {value ? 'Сменить' : 'Фото лица'}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <p className="text-xs-mobile text-gray-500 text-center">
        {required ? 'Фото лица обязательно — чтобы вас узнавали на объекте' : 'Фото для профиля'}
      </p>
    </div>
  )
}
