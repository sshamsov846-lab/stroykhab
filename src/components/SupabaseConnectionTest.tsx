import React, { useCallback, useEffect, useState } from 'react'
import { Database, Loader2, RefreshCw } from 'lucide-react'
import {
  getSupabaseUrl,
  isSupabaseConfigured,
  testSupabaseConnection,
  type SupabaseConnectionResult,
} from '@utils/supabase/client'

export const SupabaseConnectionTest: React.FC = () => {
  const [result, setResult] = useState<SupabaseConnectionResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runTest = useCallback(async () => {
    setLoading(true)
    try {
      setResult(await testSupabaseConnection())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void runTest()
  }, [runTest])

  const configured = isSupabaseConfigured()
  const url = getSupabaseUrl()

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Database size={18} className="text-primary-600" />
        <p className="text-sm-mobile font-semibold text-gray-900">Supabase</p>
      </div>

      <div className="space-y-2 text-sm-mobile">
        <p className="text-gray-600">
          Конфигурация:{' '}
          <span className={configured ? 'text-green-700 font-medium' : 'text-amber-700 font-medium'}>
            {configured ? 'ключи найдены' : 'ключи не заданы'}
          </span>
        </p>
        {url && (
          <p className="text-xs-mobile text-gray-500 break-all">
            URL: {url}
          </p>
        )}

        {result && (
          <div
            className={`rounded-lg px-3 py-2 text-xs-mobile ${
              result.ok
                ? 'bg-green-50 text-green-800 border border-green-100'
                : result.status === 'not_configured'
                  ? 'bg-amber-50 text-amber-800 border border-amber-100'
                  : 'bg-red-50 text-red-800 border border-red-100'
            }`}
          >
            <p className="font-medium">{result.message}</p>
            {result.detail && <p className="mt-1 opacity-90">{result.detail}</p>}
            {result.latencyMs != null && result.ok && (
              <p className="mt-1 opacity-75">Задержка: {result.latencyMs} ms</p>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => void runTest()}
        disabled={loading}
        className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-700 rounded-lg text-sm-mobile font-medium border border-gray-200 disabled:opacity-60"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {loading ? 'Проверка…' : 'Проверить подключение'}
      </button>
    </div>
  )
}
