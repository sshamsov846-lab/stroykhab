import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {}
  const env = {}
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim()
  }
  return env
}

function getProjectRef(env) {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    ''
  const match = url.match(/https:\/\/([^.]+)\.supabase\.co/)
  return match?.[1] || env.SUPABASE_PROJECT_REF || ''
}

function getPoolerConnectionString(env) {
  if (env.DATABASE_URL) return env.DATABASE_URL

  const password = env.SUPABASE_DB_PASSWORD
  const ref = getProjectRef(env)
  if (!password || !ref) return null

  const host = env.SUPABASE_POOLER_HOST || 'aws-1-us-west-2.pooler.supabase.com'
  const port = env.SUPABASE_POOLER_PORT || '5432'
  const user = env.SUPABASE_POOLER_USER || `postgres.${ref}`

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/postgres`
}

async function applyViaManagementApi(accessToken, projectRef, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    },
  )
  const body = await res.text()
  if (!res.ok) {
    throw new Error(`Management API ${res.status}: ${body}`)
  }
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(ROOT, '.env')),
    ...loadEnvFile(path.join(ROOT, '.env.local')),
    ...process.env,
  }

  const migrationPath = path.join(
    ROOT,
    'supabase',
    'migrations',
    '20260620000000_initial_schema.sql',
  )
  const sql = fs.readFileSync(migrationPath, 'utf8')
  const projectRef = getProjectRef(env)

  if (!projectRef) {
    console.error('❌ Не найден project ref. Укажите NEXT_PUBLIC_SUPABASE_URL в .env.local.')
    process.exit(1)
  }

  console.log(`📦 Проект: ${projectRef}`)
  console.log('📄 Применяю миграцию initial_schema…')

  const connectionString = getPoolerConnectionString(env)
  const accessToken = env.SUPABASE_ACCESS_TOKEN

  if (connectionString) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 20000,
    })
    await client.connect()
    try {
      await client.query(sql)
    } finally {
      await client.end()
    }
  } else if (accessToken) {
    await applyViaManagementApi(accessToken, projectRef, sql)
  } else {
    console.error(`
❌ Нужен пароль БД или access token Supabase.

Добавьте в .env.local:

  SUPABASE_DB_PASSWORD=ваш-пароль
  (Dashboard → Settings → Database → Database password)

Затем: npm run db:setup
`)
    process.exit(1)
  }

  console.log('✅ Таблицы созданы: objects, tasks, expenses, photos, material_requests')
  console.log('✅ Storage bucket: photos')
}

main().catch((err) => {
  console.error('❌ Ошибка:', err.message || err)
  process.exit(1)
})
