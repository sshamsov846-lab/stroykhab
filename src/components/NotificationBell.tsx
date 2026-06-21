import React, { useState, useRef, useEffect, useMemo } from 'react'

import { useNavigate } from 'react-router-dom'

import { Bell } from 'lucide-react'

import { useNotificationStore, isNotificationRead, type AppNotification } from '@store/notificationStore'

import { filterNotificationsForUser, unreadCount } from '@utils/notificationFilter'

import {

  NOTIFICATION_ICONS,

  isImportantNotification,

  formatNotificationDate,

  navigateForNotification,

} from '@utils/notificationUi'



interface Props {

  /** onPrimary — белая иконка на цветном фоне; default — на светлом */

  variant?: 'default' | 'onPrimary'

}



function NotificationItem({

  n,

  onClick,

}: {

  n: AppNotification

  onClick: () => void

}) {

  const Icon = NOTIFICATION_ICONS[n.type] || Bell

  const read = isNotificationRead(n)

  const important = isImportantNotification(n)



  return (

    <button

      type="button"

      onClick={onClick}

      className={`w-full text-left px-4 py-3 flex gap-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors ${

        read ? 'opacity-60' : important ? 'bg-red-50/80' : 'bg-primary-50/20'

      }`}

    >

      <div

        className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${

          important ? 'bg-red-100' : 'bg-primary-100'

        }`}

      >

        <Icon size={18} className={important ? 'text-red-600' : 'text-primary-600'} />

      </div>

      <div className="min-w-0 flex-1">

        <p className={`text-sm-mobile leading-snug ${read ? 'font-medium text-gray-700' : 'font-semibold text-gray-900'}`}>

          {n.title}

        </p>

        <p className="text-xs-mobile text-gray-600 mt-0.5 line-clamp-2">{n.message}</p>

        <p className="text-[10px] text-gray-400 mt-1">{formatNotificationDate(n.createdAt)}</p>

      </div>

      {!read && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-2" aria-hidden />}

    </button>

  )

}



export const NotificationBell: React.FC<Props> = ({ variant = 'default' }) => {

  const navigate = useNavigate()

  const containerRef = useRef<HTMLDivElement>(null)

  const [open, setOpen] = useState(false)



  const allNotifications = useNotificationStore((s) => s.notifications)

  const markRead = useNotificationStore((s) => s.markRead)

  const markAllRead = useNotificationStore((s) => s.markAllReadForCurrentUser)



  const feed = useMemo(

    () => filterNotificationsForUser(allNotifications),

    [allNotifications],

  )

  const count = unreadCount(allNotifications)

  const hasUnread = count > 0



  useEffect(() => {

    if (!open) return

    const onPointerDown = (e: MouseEvent | TouchEvent) => {

      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {

        setOpen(false)

      }

    }

    document.addEventListener('mousedown', onPointerDown)

    document.addEventListener('touchstart', onPointerDown)

    return () => {

      document.removeEventListener('mousedown', onPointerDown)

      document.removeEventListener('touchstart', onPointerDown)

    }

  }, [open])



  const iconClass = variant === 'onPrimary' ? 'text-white' : 'text-gray-700'

  const btnClass =

    variant === 'onPrimary'

      ? 'relative w-10 h-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors'

      : 'relative w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors'



  return (

    <div ref={containerRef} className="relative">

      <button

        type="button"

        onClick={() => setOpen((v) => !v)}

        className={btnClass}

        aria-label="Уведомления"

        aria-expanded={open}

      >

        <Bell size={22} className={iconClass} />

        {count > 0 && (

          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">

            {count > 9 ? '9+' : count}

          </span>

        )}

      </button>



      {open && (

        <div

          className="absolute right-0 top-[calc(100%+8px)] w-[min(calc(100vw-2rem),360px)] bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden flex flex-col"

          role="dialog"

          aria-label="Список уведомлений"

        >

          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/80">

            <h3 className="text-sm-mobile font-bold text-gray-900">Уведомления</h3>

            {hasUnread && (

              <button

                type="button"

                onClick={markAllRead}

                className="text-xs-mobile text-primary-600 font-medium hover:text-primary-700"

              >

                Отметить все как прочитанные

              </button>

            )}

          </div>



          <div className="overflow-y-auto max-h-[min(420px,60vh)]">

            {feed.length === 0 ? (

              <p className="text-sm-mobile text-gray-500 text-center py-10 px-4">Нет уведомлений</p>

            ) : (

              feed.slice(0, 30).map((n) => (

                <NotificationItem

                  key={n.id}

                  n={n}

                  onClick={() => {

                    markRead(n.id)

                    setOpen(false)

                    navigateForNotification(n, navigate)

                  }}

                />

              ))

            )}

          </div>



          {feed.length > 30 && (

            <p className="text-center text-xs-mobile text-gray-400 py-2 border-t border-gray-100">

              Показаны последние 30

            </p>

          )}

        </div>

      )}

    </div>

  )

}
