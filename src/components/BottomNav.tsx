import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Home, ClipboardList, Users, Settings, Building2, Wallet, ListTodo, Package } from 'lucide-react'
import { useTelegram } from '@hooks/useTelegram'
import { useUserStore } from '@store/userStore'
import type { AppRole } from '@store/userStore'

type NavItem = { path: string; label: string; icon: typeof Home; match?: (path: string) => boolean }

const NAV_BY_ROLE: Record<AppRole, NavItem[]> = {
  client: [
    { path: '/', label: 'Главная', icon: Home },
    { path: '/objects', label: 'Объекты', icon: Building2 },
    { path: '/materials', label: 'Материалы', icon: Package },
    { path: '/finances', label: 'Финансы', icon: Wallet },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ],
  foreman: [
    { path: '/', label: 'Объекты', icon: Home },
    { path: '/materials', label: 'Материалы', icon: Package },
    { path: '/worker', label: 'Задачи', icon: ClipboardList },
    { path: '/team', label: 'Команда', icon: Users },
    { path: '/payroll', label: 'Мои деньги', icon: Wallet },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ],
  worker: [
    { path: '/', label: 'Задачи', icon: ClipboardList, match: (p) => p === '/' || p === '/worker' },
    { path: '/materials', label: 'Материалы', icon: Package },
    { path: '/worker/money', label: 'Мой счёт', icon: Wallet },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ],
  subcontractor: [
    { path: '/', label: 'Мои работы', icon: ClipboardList },
    { path: '/subcontractor/team', label: 'Моя команда', icon: Users },
    { path: '/subcontractor/tasks', label: 'Задачи', icon: ListTodo },
    { path: '/subcontractor/payroll', label: 'Расчёты', icon: Wallet },
    { path: '/settings', label: 'Настройки', icon: Settings },
  ],
}

export const BottomNav: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { haptic } = useTelegram()
  const registered = useUserStore((s) => s.registered)
  const role = useUserStore((s) => s.role)

  if (!registered || location.pathname === '/register') return null
  if (location.pathname.startsWith('/client/')) return null
  if (location.pathname === '/connect') return null
  if (location.pathname === '/notifications') return null
  if (location.pathname.startsWith('/workflow/')) return null
  if (location.pathname.includes('/setup')) return null
  if (location.pathname.startsWith('/object/') || location.pathname.startsWith('/task/')) return null
  if (/^\/payroll\/.+/.test(location.pathname)) return null
  if (/^\/subcontractor\/payroll\/.+/.test(location.pathname)) return null
  if (/^\/subcontractor\/team\/.+/.test(location.pathname)) return null
  if (location.pathname.startsWith('/export')) return null
  if (location.pathname.startsWith('/side-job')) return null
  if (location.pathname.startsWith('/rates')) return null
  if (location.pathname.startsWith('/payment-settings')) return null
  if (location.pathname.startsWith('/timesheet')) return null
  if (location.pathname.startsWith('/client/object')) return null
  if (location.pathname.startsWith('/finances/')) return null
  if (location.pathname.startsWith('/worker/calculators')) return null
  if (location.pathname.startsWith('/foreman/calculator-reports')) return null

  const navItems = NAV_BY_ROLE[role]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex">
        {navItems.map((item) => {
          const isActive = item.match ? item.match(location.pathname) : location.pathname === item.path
          return (
            <button
              key={`${item.path}-${item.label}`}
              type="button"
              onClick={() => { haptic('selection'); navigate(item.path) }}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 transition-colors ${
                isActive ? 'text-primary-600' : 'text-gray-400'
              }`}
            >
              <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
