import React from 'react'
import { Camera } from 'lucide-react'
import type { PhotoReportItem } from '@/types/objectStructure'

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const time = d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  if (isToday) return `Сегодня в ${time}`
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) + ` в ${time}`
}

interface PhotoReportFeedProps {
  reports: PhotoReportItem[]
  horizontal?: boolean
  limit?: number
}

export const PhotoReportFeed: React.FC<PhotoReportFeedProps> = ({
  reports,
  horizontal = true,
  limit = 10,
}) => {
  const items = reports.slice(0, limit)

  if (!items.length) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Camera size={32} className="mx-auto mb-2 opacity-50" />
        <p className="text-sm-mobile">Фотоотчёты появятся после начала работ</p>
      </div>
    )
  }

  if (horizontal) {
    return (
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-1 px-1">
        {items.map((r) => (
          <article
            key={r.id}
            className="shrink-0 w-[280px] bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm"
          >
            <div className="flex gap-0.5 h-36 overflow-hidden">
              {r.photoUrls.slice(0, 3).map((url, i) => (
                <img key={i} src={url} alt="" className="flex-1 min-w-0 object-cover h-full" />
              ))}
            </div>
            <div className="p-3">
              <p className="text-xs-mobile text-gray-400">{formatTime(r.timestamp)}</p>
              <p className="text-sm-mobile font-semibold text-gray-900 mt-0.5 line-clamp-2">
                {r.apartmentLabel}. {r.workTitle}
              </p>
              <p className="text-xs-mobile text-gray-500 mt-1">{r.objectName} · {r.photoUrls.length} фото</p>
            </div>
          </article>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((r) => (
        <article key={r.id} className="bg-white rounded-2xl border border-gray-100 p-3">
          <div className="flex gap-2 overflow-x-auto">
            {r.photoUrls.map((url, i) => (
              <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0" />
            ))}
          </div>
          <p className="text-xs-mobile text-gray-400 mt-2">{formatTime(r.timestamp)}</p>
          <p className="text-sm-mobile font-semibold text-gray-900">{r.apartmentLabel}. {r.workTitle}</p>
        </article>
      ))}
    </div>
  )
}
