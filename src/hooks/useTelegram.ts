import { useEffect, useCallback } from 'react'

interface TelegramWebApp {
  ready: () => void
  expand: () => void
  close: () => void
  enableClosingConfirmation: () => void
  disableClosingConfirmation: () => void
  MainButton: {
    text: string
    setText: (text: string) => void
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
    enable: () => void
    disable: () => void
    showProgress: (leaveActive: boolean) => void
    hideProgress: () => void
  }
  BackButton: {
    onClick: (callback: () => void) => void
    offClick: (callback: () => void) => void
    show: () => void
    hide: () => void
  }
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void
    selectionChanged: () => void
  }
  initDataUnsafe?: {
    user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string }
    query_id?: string
  }
  colorScheme: 'light' | 'dark'
  themeParams: Record<string, string>
  setHeaderColor: (color: string) => void
  setBackgroundColor: (color: string) => void
  isExpanded: boolean
  viewportHeight: number
  viewportStableHeight: number
}

type HapticType = 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy' | 'selection'

export function useTelegram() {
  const tg = typeof window !== 'undefined' ? (window.Telegram?.WebApp as TelegramWebApp | undefined) : undefined

  useEffect(() => {
    if (typeof window === 'undefined' || window.Telegram?.WebApp) return
    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-web-app.js'
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!tg) return
    try {
      tg.ready()
      tg.expand()
      tg.enableClosingConfirmation?.()
    } catch (e) {
      console.warn('Telegram WebApp init:', e)
    }
  }, [tg])

  const haptic = useCallback((type: HapticType) => {
    if (!tg?.HapticFeedback) return
    if (type === 'selection') tg.HapticFeedback.selectionChanged()
    else if (['success', 'error', 'warning'].includes(type)) {
      tg.HapticFeedback.notificationOccurred(type as 'error' | 'success' | 'warning')
    } else {
      tg.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy')
    }
  }, [tg])

  const setMainButton = useCallback((text: string, onClick: () => void, visible = true) => {
    if (!tg?.MainButton) return
    tg.MainButton.setText(text)
    tg.MainButton.onClick(onClick)
    if (visible) tg.MainButton.show()
    else tg.MainButton.hide()
  }, [tg])

  const hideMainButton = useCallback(() => {
    tg?.MainButton?.hide()
  }, [tg])

  const showBackButton = useCallback((onClick: () => void) => {
    if (!tg?.BackButton) return
    tg.BackButton.onClick(onClick)
    tg.BackButton.show()
  }, [tg])

  const hideBackButton = useCallback(() => {
    tg?.BackButton?.hide()
  }, [tg])

  const getUser = useCallback(() => tg?.initDataUnsafe?.user, [tg])
  const user = tg?.initDataUnsafe?.user
  const isDark = tg?.colorScheme === 'dark'

  return {
    tg,
    isReady: !!tg,
    isTelegram: !!tg,
    haptic,
    setMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    getUser,
    user,
    isDark,
    theme: tg?.themeParams,
  }
}
