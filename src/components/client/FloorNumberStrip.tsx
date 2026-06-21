import React, { useEffect, useRef } from 'react'
import type { GeneratedFloor } from '@/types/objectStructure'

interface Props {
  floors: GeneratedFloor[]
  activeFloorId: string
  onSelect: (floor: GeneratedFloor) => void
}

export const FloorNumberStrip: React.FC<Props> = ({ floors, activeFloorId, onSelect }) => {
  const stripRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeFloorId])

  if (floors.length === 0) return null

  return (
    <div
      ref={stripRef}
      className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide"
    >
      {floors.map((f) => {
        const active = f.id === activeFloorId
        return (
          <button
            key={f.id}
            ref={active ? activeRef : undefined}
            type="button"
            onClick={() => onSelect(f)}
            className={`shrink-0 min-w-[44px] h-10 px-3 rounded-xl text-sm-mobile font-semibold transition-colors ${
              active
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300'
            }`}
          >
            {f.number}
          </button>
        )
      })}
    </div>
  )
}
