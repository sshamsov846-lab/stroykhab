import React from 'react'
import { Building2, Layers } from 'lucide-react'
import type { ExcelProjectPreview } from '@/types/projectExcel'
import { pluralWithCount, PLURAL } from '@utils/russianPlural'

interface Props {
  preview: ExcelProjectPreview | null
  plotAreaSotkas?: number
  excelApplied: boolean
}

export const ProjectStructureSummary: React.FC<Props> = ({ preview, plotAreaSotkas, excelApplied }) => {
  if (!excelApplied || !preview) return null

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <h3 className="text-base-mobile font-semibold text-gray-900">Сводка по объекту</h3>
      <div className="grid grid-cols-2 gap-2 text-sm-mobile">
        <p>{pluralWithCount(preview.apartmentCount, PLURAL.apartment)}</p>
        <p>{preview.totalRooms} комнат</p>
        <p>{preview.totalKitchens} кухонь</p>
        <p className="font-semibold text-primary-600">
          {Math.round(preview.totalApartmentArea).toLocaleString('ru-RU')} м²
        </p>
      </div>
      <div className="space-y-1">
        {preview.entrances.map((e) => (
          <p key={e.entrance} className="text-xs-mobile text-gray-600 flex items-center gap-1">
            <Building2 size={12} />
            Подъезд {e.entrance}: {e.floors} эт., {e.apartments} кв., {Math.round(e.totalArea)} м²
          </p>
        ))}
      </div>
      {preview.floors.length > 0 && (
        <div className="border-t border-gray-100 pt-2 max-h-32 overflow-y-auto space-y-0.5">
          <p className="text-xs-mobile font-medium text-gray-500">Площадь этажей</p>
          {preview.floors.map((f) => (
            <p key={`${f.entrance}-${f.floor}`} className="text-xs-mobile text-gray-600 flex items-center gap-1">
              <Layers size={10} />
              Подъезд {f.entrance}, этаж {f.floor}: {Math.round(f.floorArea)} м² ({f.apartmentCount} кв.)
            </p>
          ))}
        </div>
      )}
      {plotAreaSotkas && plotAreaSotkas > 0 && (
        <p className="text-xs-mobile text-gray-600">
          Участок: {plotAreaSotkas} соток ({(plotAreaSotkas / 100).toFixed(2)} га)
        </p>
      )}
    </div>
  )
}
