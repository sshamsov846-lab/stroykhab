import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Bell } from 'lucide-react'
import { useNotificationStore, isNotificationRead } from '@store/notificationStore'
import { filterNotificationsForUser } from '@utils/notificationFilter'
import {
  NOTIFICATION_ICONS,
  isImportantNotification,
  formatNotificationDate,
  navigateForNotification,
} from '@utils/notificationUi'

/** Полноэкранный список — запасной вариант, основной UI в NotificationBell dropdown */
export const AppNotifications: React.FC = () => {
  const navigate = useNavigate()
  const all = useNotificationStore((s) => s.notifications)
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllReadForCurrentUser)
  const notifications = filterNotificationsForUser(all)
  const hasUnread = notifications.some((n) => !isNotificationRead(n))

  return (
    <div className="pb-24 min-h-screen bg-gray-50">
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-40">
        <button type="button" onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg-mobile font-bold flex-1">Уведомления</h1>
        {hasUnread && (
          <button type="button" onClick={markAllRead} className="text-sm-mobile text-primary-600">
            Отметить все как прочитанные
          </button>
        )}
      </div>

      <div className="p-4 space-y-2">
        {notifications.length === 0 ? (
          <p className="text-center text-gray-500 py-12 text-sm-mobile">Нет уведомлений</p>
        ) : (
          notifications.map((n) => {
            const Icon = NOTIFICATION_ICONS[n.type] || Bell
            const read = isNotificationRead(n)
            const important = isImportantNotification(n)
            const isAlert = important
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => {
                  markRead(n.id)
                  navigateForNotification(n, navigate)
                }}
                className={`w-full text-left bg-white rounded-2xl p-4 border flex gap-3 ${
                  read
                    ? 'border-gray-100 opacity-70'
                    : isAlert
                      ? 'border-red-300 bg-red-50/50'
                      : 'border-primary-200 bg-primary-50/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  isAlert ? 'bg-red-100' : 'bg-primary-100'
                }`}>
                  <Icon size={20} className={isAlert ? 'text-red-600' : 'text-primary-600'} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm-mobile font-semibold text-gray-900">{n.title}</p>
                  <p className="text-sm-mobile text-gray-600 mt-0.5">{n.message}</p>
                  <p className="text-xs-mobile text-gray-400 mt-1">{formatNotificationDate(n.createdAt)}</p>
                </div>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
