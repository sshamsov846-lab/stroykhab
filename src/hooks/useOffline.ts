import { useState, useEffect, useCallback } from 'react'
import {
  getOfflineQueue,
  saveOfflineQueue,
  removeOfflineAction,
  incrementOfflineRetry,
  setCacheEntry,
  getCacheEntry,
  type QueuedAction,
} from '@services/dataService'

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [queueLength, setQueueLength] = useState(0)

  const updateQueueLength = useCallback(() => {
    setQueueLength(getOfflineQueue().length)
  }, [])

  const syncQueue = useCallback(async () => {
    const queue = getOfflineQueue()
    if (queue.length === 0) return
    for (const action of queue) {
      try {
        removeOfflineAction(action.id)
      } catch {
        if (action.retryCount < 3) {
          incrementOfflineRetry(action.id)
        }
      }
      void action
    }
  }, [])

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      void syncQueue()
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    updateQueueLength()
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncQueue, updateQueueLength])

  const addToQueue = useCallback(
    (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>) => {
      const queue = getOfflineQueue()
      queue.push({
        ...action,
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
        timestamp: Date.now(),
        retryCount: 0,
      })
      saveOfflineQueue(queue)
      updateQueueLength()
    },
    [updateQueueLength],
  )

  const cacheData = useCallback((key: string, data: unknown) => {
    try {
      setCacheEntry(key, data)
    } catch {
      /* ignore */
    }
  }, [])

  const getCachedData = useCallback(<T,>(key: string, maxAge = 5 * 60 * 1000): T | null => {
    try {
      return getCacheEntry<T>(key, maxAge)
    } catch {
      return null
    }
  }, [])

  return { isOnline, queueLength, addToQueue, syncQueue, cacheData, getCachedData }
}
