import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function readSupabaseUrl(): string {
  return (
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    ''
  ).trim()
}

function readSupabaseAnonKey(): string {
  return (
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    ''
  ).trim()
}

function isPlaceholderEnv(url: string, key: string): boolean {
  return (
    !url ||
    !key ||
    url.includes('your-project') ||
    key.includes('your-anon')
  )
}

export function getSupabaseUrl(): string {
  return readSupabaseUrl()
}

export function getSupabaseAnonKey(): string {
  return readSupabaseAnonKey()
}

export function isSupabaseConfigured(): boolean {
  return !isPlaceholderEnv(readSupabaseUrl(), readSupabaseAnonKey())
}

let cachedClient: SupabaseClient | null | undefined

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient

  if (!isSupabaseConfigured()) {
    cachedClient = null
    return null
  }

  cachedClient = createClient(readSupabaseUrl(), readSupabaseAnonKey())
  return cachedClient
}

/** Singleton client; null when env vars are missing or placeholders. */
export const supabase = getSupabaseClient()

export type SupabaseConnectionResult = {
  ok: boolean
  status: 'connected' | 'not_configured' | 'error'
  message: string
  detail?: string
  latencyMs?: number
}

export async function testSupabaseConnection(): Promise<SupabaseConnectionResult> {
  const started = performance.now()
  const client = getSupabaseClient()

  if (!client) {
    return {
      ok: false,
      status: 'not_configured',
      message: 'Supabase не настроен',
      detail:
        'Укажите VITE_SUPABASE_URL и VITE_SUPABASE_ANON_KEY (или NEXT_PUBLIC_*) в .env.local',
    }
  }

  const { error } = await client.from('objects').select('id').limit(1)
  const latencyMs = Math.round(performance.now() - started)

  if (!error) {
    return {
      ok: true,
      status: 'connected',
      message: 'Подключение установлено',
      detail: `REST API отвечает (${latencyMs} ms)`,
      latencyMs,
    }
  }

  const schemaMissing =
    error.code === '42P01' ||
    error.message.includes('schema cache') ||
    error.message.includes('does not exist')

  if (schemaMissing) {
    return {
      ok: true,
      status: 'connected',
      message: 'API доступен (таблица objects ещё не создана)',
      detail: error.message,
      latencyMs,
    }
  }

  return {
    ok: false,
    status: 'error',
    message: 'Ошибка Supabase',
    detail: error.message,
    latencyMs,
  }
}
