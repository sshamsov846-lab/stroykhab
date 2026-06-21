/** Префикс кода из названия объекта (кириллица допустима) */
export function objectNameToCodePrefix(objectName: string): string {
  const upper = objectName.toUpperCase().trim()
  const words = upper.split(/[\s\-_]+/).filter(Boolean)
  if (words.length === 0) return 'ОБЪЕКТ'

  if (words.length === 1) {
    const w = words[0].replace(/[^A-ZА-ЯЁ0-9]/g, '')
    return (w.slice(0, 6) || 'ОБЪЕКТ')
  }

  const fromWords = words
    .map((w) => w.replace(/[^A-ZА-ЯЁ0-9]/g, '').slice(0, 3))
    .join('')
    .slice(0, 8)

  return fromWords || 'ОБЪЕКТ'
}

export function generateObjectInviteCode(objectName: string, existingCodes: Set<string>): string {
  const prefix = objectNameToCodePrefix(objectName)
  for (let attempt = 0; attempt < 40; attempt++) {
    const digits = Math.floor(1000 + Math.random() * 9000)
    const code = `${prefix}-${digits}`
    if (!existingCodes.has(code.toUpperCase())) return code
  }
  return `${prefix}-${Date.now().toString().slice(-4)}`
}

export function normalizeInviteCode(code: string): string {
  return code
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[–—−]/g, '-')
}

/** Сравнение кодов: игнорируем пробелы и дефисы */
export function inviteCodesEqual(a: string, b: string): boolean {
  const compact = (value: string) => normalizeInviteCode(value).replace(/-/g, '')
  return compact(a) === compact(b)
}

export function buildObjectConnectUrl(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  return `${base}/connect?code=${encodeURIComponent(normalizeInviteCode(code))}`
}

export function buildObjectConnectShareText(objectName: string, code: string): string {
  const url = buildObjectConnectUrl(code)
  return `Подключение к объекту «${objectName}»\nКод: ${code}\nСсылка: ${url}`
}
