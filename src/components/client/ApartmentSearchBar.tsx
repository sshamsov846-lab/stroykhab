import React from 'react'
import { Search, X } from 'lucide-react'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export const ApartmentSearchBar: React.FC<Props> = ({ value, onChange, placeholder }) => (
  <div className="relative">
    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    <input
      type="search"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? 'Найти квартиру по номеру…'}
      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 bg-white text-sm-mobile"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-gray-100 text-gray-400"
        aria-label="Очистить"
      >
        <X size={16} />
      </button>
    )}
  </div>
)
