export type PersonCodePrefix = 'ПР' | 'М' | 'ОРГ' | 'БР'

export function normalizePersonCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '')
}

export function generatePersonCode(prefix: PersonCodePrefix, existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const digits = Math.floor(1000 + Math.random() * 9000)
    const code = `${prefix}-${digits}`
    if (!existingCodes.has(normalizePersonCode(code))) return code
  }
  return `${prefix}-${Date.now().toString().slice(-4)}`
}
