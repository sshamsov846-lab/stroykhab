import * as XLSX from 'xlsx'
import type { AppRole } from '@store/userStore'
import { useUserStore } from '@store/userStore'
import { useObjectStore } from '@store/objectStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'
import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useMaterialStore } from '@store/materialStore'
import { usePaymentActStore } from '@store/paymentActStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { buildOrgTeamData, workHistoryForWorker, workHistoryForForeman } from '@utils/orgTeamData'
import { foremanIdFromPhone } from '@utils/foremanId'
import { buildAccountLedger, LEDGER_TYPE_LABELS } from '@utils/payrollLedger'
import { PAID_BY_LABELS } from '@/types/materials'
import { PAYMENT_ACT_STATUS_LABELS } from '@/types/paymentAct'
import { filterObjectsForRole } from '@utils/sideJob'
import { getObjects } from '@api/supabase'
import { effectivePaymentPayer } from '@utils/materialPayment'

export type ExportDataType =
  | 'workers'
  | 'objects'
  | 'payroll'
  | 'work_history'
  | 'payment_acts'
  | 'materials'
  | 'full'

export type ExportFormat = 'xlsx' | 'csv' | 'pdf' | 'json'

export interface ExportFilters {
  dateFrom?: string
  dateTo?: string
  objectId?: string
  personFilter?: string
}

export const EXPORT_TYPE_LABELS: Record<ExportDataType, string> = {
  workers: 'Работники (прорабы + мастера)',
  objects: 'Объекты',
  payroll: 'Расчёты и ЗП',
  work_history: 'История работ',
  payment_acts: 'Акты выполненных работ',
  materials: 'Материалы и расходы',
  full: 'Всё сразу (полный архив)',
}

export const EXPORT_FORMAT_LABELS: Record<ExportFormat, string> = {
  xlsx: 'Excel (.xlsx)',
  csv: 'CSV',
  pdf: 'PDF (печать)',
  json: 'JSON (полный перенос)',
}

function inPeriod(iso: string, filters: ExportFilters): boolean {
  const t = iso.slice(0, 10)
  if (filters.dateFrom && t < filters.dateFrom) return false
  if (filters.dateTo && t > filters.dateTo) return false
  return true
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function sheetFromRows(rows: Record<string, unknown>[]): XLSX.WorkSheet {
  return XLSX.utils.json_to_sheet(rows.length ? rows : [{ info: 'Нет данных' }], { skipHeader: false })
}

function writeWorkbook(sheets: { name: string; rows: Record<string, unknown>[] }[], fileName: string) {
  const wb = XLSX.utils.book_new()
  for (const s of sheets) {
    XLSX.utils.book_append_sheet(wb, sheetFromRows(s.rows), s.name.slice(0, 31))
  }
  XLSX.writeFile(wb, fileName)
}

function writeCsv(rows: Record<string, unknown>[], fileName: string) {
  const ws = sheetFromRows(rows)
  const csv = XLSX.utils.sheet_to_csv(ws)
  downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName)
}

function writeJson(data: unknown, fileName: string) {
  downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }), fileName)
}

function openPdfTable(title: string, rows: Record<string, unknown>[]) {
  const headers = rows[0] ? Object.keys(rows[0]) : ['info']
  const head = headers.map((h) => `<th>${h}</th>`).join('')
  const body = rows
    .map((r) => `<tr>${headers.map((h) => `<td>${String(r[h] ?? '')}</td>`).join('')}</tr>`)
    .join('')
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:sans-serif;padding:24px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ddd;padding:8px;font-size:12px}th{background:#f3f4f6}</style></head>
<body><h1>${title}</h1><p>${new Date().toLocaleString('ru-RU')}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`
  const w = window.open('', '_blank')
  if (w) {
    w.document.write(html)
    w.document.close()
    w.print()
  }
}

async function getVisibleObjectIds(role: AppRole, contractorId: string, userKey: string): Promise<string[]> {
  const fromApi = await getObjects()
  const visible = filterObjectsForRole(fromApi, role)
  if (role === 'subcontractor' && contractorId) {
    return visible.filter((o) => {
      const tasks = Object.values(useProjectWorkflowStore.getState().tasks)
      return tasks.some((t) => t.objectId === o.id && t.contractorId === contractorId)
    }).map((o) => o.id)
  }
  if (role === 'foreman' || role === 'worker') {
    return useObjectAccessStore.getState().getObjectIdsForUser(userKey, role)
  }
  return visible.map((o) => o.id)
}

function collectWorkers(role: AppRole, contractorId: string, filters: ExportFilters): {
  foremen?: Record<string, unknown>[]
  workers?: Record<string, unknown>[]
  combined: Record<string, unknown>[]
} {
  if (role !== 'subcontractor') {
    const team = useObjectStore.getState().teamMembers
    return { combined: team
      .filter((m) => !filters.personFilter || m.name.toLowerCase().includes(filters.personFilter.toLowerCase()))
      .map((m) => ({
        Имя: m.name,
        Код: m.personalCode ?? '',
        Специализация: m.specialty ?? '',
        Тип: m.role,
        Телефон: m.phone,
        Прораб: '',
        'Текущий объект': '',
        'Заработано всего': '',
        Статус: '',
      })) }
  }
  const teamData = buildOrgTeamData(contractorId)
  const foremen = teamData.foremen
    .filter((f) => !filters.personFilter || f.name.toLowerCase().includes(filters.personFilter.toLowerCase()))
    .map((f) => ({
      Имя: f.name,
      Код: f.personalCode ?? '',
      Специализация: f.specializationText,
      Тип: 'Прораб',
      Телефон: f.phone,
      Прораб: '—',
      'Текущий объект': f.currentObjects.map((o) => o.name).join(', '),
      'Заработано всего': f.totalEarned,
      Статус: f.status,
    }))
  const workers = teamData.workers
    .filter((w) => !filters.personFilter || w.name.toLowerCase().includes(filters.personFilter.toLowerCase()))
    .map((w) => ({
      Имя: w.name,
      Код: w.personalCode ?? '',
      Специализация: w.specializationText,
      Тип: w.typeLabel,
      Телефон: w.phone ?? '',
      Прораб: w.foremanName ?? '',
      'Текущий объект': w.currentObjectName ?? '',
      'Заработано всего': w.totalEarned,
      Статус: w.status,
    }))
  return { foremen, workers, combined: [...foremen, ...workers] }
}

async function collectObjects(role: AppRole, contractorId: string, userKey: string, filters: ExportFilters) {
  const ids = await getVisibleObjectIds(role, contractorId, userKey)
  const userObjects = useObjectStore.getState().userObjects
  const fromApi = await getObjects()
  const all = [...userObjects, ...fromApi.filter((o) => !userObjects.some((u) => u.id === o.id))]
  return all
    .filter((o) => ids.includes(o.id))
    .filter((o) => !filters.objectId || o.id === filters.objectId)
    .map((o) => ({
      Название: o.name,
      Адрес: o.address,
      Заказчик: o.client_name ?? '',
      Статус: o.status,
      Прогресс: o.progress ?? 0,
      'Дата начала': o.start_date ?? '',
      Бюджет: o.budget_total,
      Потрачено: o.budget_spent,
    }))
}

function collectPayroll(role: AppRole, contractorId: string, filters: ExportFilters) {
  const rows: Record<string, unknown>[] = []
  const workerAccounts = useWorkerPayrollStore.getState().accounts
  const foremanAccounts = useForemanPayrollStore.getState().accounts

  if (role === 'subcontractor' && contractorId) {
    const orgWorkers = buildOrgTeamData(contractorId).workers
    const workerIds = new Set(orgWorkers.map((w) => w.id))
    for (const [wid, acc] of Object.entries(workerAccounts)) {
      if (!workerIds.has(wid)) continue
      for (const entry of buildAccountLedger(acc)) {
        if (!inPeriod(entry.date, filters)) continue
        rows.push({
          Дата: entry.date,
          Кому: acc.workerName,
          Тип: LEDGER_TYPE_LABELS[entry.type],
          Сумма: entry.amount,
          Объект: entry.objectName ?? '',
          Описание: entry.label,
        })
      }
    }
    const foremen = useOrganizationStore.getState().getForemenForContractor(contractorId)
    for (const f of foremen) {
      const fid = foremanIdFromPhone(f.phone)
      const acc = foremanAccounts[fid]
      if (!acc) continue
      for (const a of acc.accruals) {
        if (!inPeriod(a.acceptedAt, filters)) continue
        rows.push({ Дата: a.acceptedAt, Кому: f.fullName, Тип: 'Начисление', Сумма: a.amount, Объект: a.objectName ?? '', Описание: a.taskTitle })
      }
      for (const a of acc.advances) {
        if (!inPeriod(a.date, filters)) continue
        rows.push({ Дата: a.date, Кому: f.fullName, Тип: 'Аванс', Сумма: -a.amount, Объект: '', Описание: '' })
      }
    }
  } else if (role === 'foreman') {
    const foremanId = foremanIdFromPhone(useUserStore.getState().phone)
    const acc = foremanAccounts[foremanId]
    if (acc) {
      for (const a of acc.accruals) {
        if (inPeriod(a.acceptedAt, filters)) rows.push({ Дата: a.acceptedAt, Кому: acc.foremanName, Тип: 'Начисление', Сумма: a.amount, Объект: a.objectName ?? '', Описание: a.taskTitle })
      }
    }
    for (const acc of Object.values(workerAccounts)) {
      for (const entry of buildAccountLedger(acc)) {
        if (!inPeriod(entry.date, filters)) continue
        rows.push({ Дата: entry.date, Кому: acc.workerName, Тип: LEDGER_TYPE_LABELS[entry.type], Сумма: entry.amount, Объект: entry.objectName ?? '', Описание: entry.label })
      }
    }
  } else if (role === 'worker') {
    const wid = useUserStore.getState().workerMemberId
    const acc = workerAccounts[wid]
    if (acc) {
      for (const entry of buildAccountLedger(acc)) {
        if (inPeriod(entry.date, filters)) rows.push({ Дата: entry.date, Кому: acc.workerName, Тип: LEDGER_TYPE_LABELS[entry.type], Сумма: entry.amount, Объект: entry.objectName ?? '', Описание: entry.label })
      }
    }
  } else if (role === 'client') {
    for (const acc of Object.values(workerAccounts)) {
      for (const entry of buildAccountLedger(acc)) {
        if (entry.type === 'accrual' && inPeriod(entry.date, filters)) {
          rows.push({ Дата: entry.date, Кому: acc.workerName, Тип: LEDGER_TYPE_LABELS[entry.type], Сумма: entry.amount, Объект: entry.objectName ?? '', Описание: entry.label })
        }
      }
    }
  }
  return rows.sort((a, b) => String(b.Дата).localeCompare(String(a.Дата)))
}

function collectWorkHistory(role: AppRole, contractorId: string, filters: ExportFilters) {
  const rows: Record<string, unknown>[] = []
  if (role === 'subcontractor' && contractorId) {
    const { workers, foremen } = buildOrgTeamData(contractorId)
    for (const w of workers) {
      if (filters.personFilter && !w.name.toLowerCase().includes(filters.personFilter.toLowerCase())) continue
      for (const h of workHistoryForWorker(w.id, contractorId)) {
        if (filters.objectId && !h.objectName.includes(filters.objectId)) continue
        rows.push({ Кто: w.name, Объект: h.objectName, Задача: h.title, Дата: h.completedAt ?? '', Объём: h.volume ?? '', Сумма: h.amount ?? '' })
      }
    }
    for (const f of foremen) {
      if (filters.personFilter && !f.name.toLowerCase().includes(filters.personFilter.toLowerCase())) continue
      for (const h of workHistoryForForeman(f.userKey, contractorId)) {
        rows.push({ Кто: f.name, Объект: h.objectName, Задача: h.title, Дата: h.completedAt, Объём: h.volume ?? '', Сумма: h.amount })
      }
    }
  } else if (role === 'worker') {
    const wid = useUserStore.getState().workerMemberId
    const cid = contractorId || ''
    for (const h of workHistoryForWorker(wid, cid)) {
      rows.push({ Кто: useUserStore.getState().fullName, Объект: h.objectName, Задача: h.title, Дата: h.completedAt ?? '', Объём: h.volume ?? '', Сумма: h.amount ?? '' })
    }
  }
  return rows
}

function collectPaymentActs(role: AppRole, contractorId: string, filters: ExportFilters) {
  const acts = usePaymentActStore.getState().acts
  return acts
    .filter((a) => {
      if (role === 'subcontractor' && contractorId && a.orgId !== contractorId) return false
      if (filters.objectId && a.objectId !== filters.objectId) return false
      if (filters.dateFrom && a.createdAt.slice(0, 10) < filters.dateFrom) return false
      if (filters.dateTo && a.createdAt.slice(0, 10) > filters.dateTo) return false
      return true
    })
    .map((a) => ({
      '№ акта': a.actNumber,
      Статус: PAYMENT_ACT_STATUS_LABELS[a.status],
      Объект: a.objectName,
      Задачи: a.taskIds.join(', '),
      Сумма: a.clientTotal,
      Дата: a.createdAt.slice(0, 10),
      Исполнитель: a.executorName,
    }))
}

function collectMaterials(_role: AppRole, _contractorId: string, filters: ExportFilters) {
  const requests = useMaterialStore.getState().requests
  return requests
    .filter((r) => r.status === 'delivered')
    .filter((r) => !filters.objectId || r.objectId === filters.objectId)
    .filter((r) => !filters.dateFrom || (r.deliveredAt ?? '').slice(0, 10) >= filters.dateFrom)
    .filter((r) => !filters.dateTo || (r.deliveredAt ?? '').slice(0, 10) <= filters.dateTo)
    .map((r) => ({
      Материал: r.name,
      Объект: r.objectId,
      Задача: r.taskTitle,
      Сумма: r.price ?? 0,
      'Кто платит': effectivePaymentPayer(r) ? PAID_BY_LABELS[effectivePaymentPayer(r)!] : '',
      'Кто купил': r.purchasedBy ?? '',
      Дата: r.deliveredAt?.slice(0, 10) ?? '',
    }))
}

export async function runDataExport(
  type: ExportDataType,
  format: ExportFormat,
  filters: ExportFilters,
): Promise<void> {
  const { role, contractorId, phone, fullName } = useUserStore.getState()
  const userKey = `${phone}|${role}|${contractorId}|${fullName}`
  const stamp = new Date().toISOString().slice(0, 10)
  const baseName = `stroyhub-${type}-${stamp}`

  const pack: Record<string, unknown> = {}

  if (type === 'workers' || type === 'full') {
    const w = collectWorkers(role, contractorId, filters)
    if (w.foremen) pack.workers_foremen = w.foremen
    if (w.workers) pack.workers_masters = w.workers
    pack.workers = w.combined
  }
  if (type === 'objects' || type === 'full') {
    pack.objects = await collectObjects(role, contractorId, userKey, filters)
  }
  if (type === 'payroll' || type === 'full') pack.payroll = collectPayroll(role, contractorId, filters)
  if (type === 'work_history' || type === 'full') pack.work_history = collectWorkHistory(role, contractorId, filters)
  if (type === 'payment_acts' || type === 'full') pack.payment_acts = collectPaymentActs(role, contractorId, filters)
  if (type === 'materials' || type === 'full') pack.materials = collectMaterials(role, contractorId, filters)

  if (format === 'json') {
    writeJson({ exportedAt: new Date().toISOString(), role, ...pack }, `${baseName}.json`)
    return
  }

  if (type === 'full' && format === 'xlsx') {
    const sheets: { name: string; rows: Record<string, unknown>[] }[] = []
    if (pack.workers) sheets.push({ name: 'Работники', rows: pack.workers as Record<string, unknown>[] })
    if (pack.workers_foremen) sheets.push({ name: 'Прорабы', rows: pack.workers_foremen as Record<string, unknown>[] })
    if (pack.workers_masters) sheets.push({ name: 'Мастера', rows: pack.workers_masters as Record<string, unknown>[] })
    if (pack.objects) sheets.push({ name: 'Объекты', rows: pack.objects as Record<string, unknown>[] })
    if (pack.payroll) sheets.push({ name: 'Расчёты', rows: pack.payroll as Record<string, unknown>[] })
    if (pack.work_history) sheets.push({ name: 'История работ', rows: pack.work_history as Record<string, unknown>[] })
    if (pack.payment_acts) sheets.push({ name: 'Акты', rows: pack.payment_acts as Record<string, unknown>[] })
    if (pack.materials) sheets.push({ name: 'Материалы', rows: pack.materials as Record<string, unknown>[] })
    writeWorkbook(sheets, `${baseName}.xlsx`)
    return
  }

  const singleKey = type === 'workers' ? 'workers' : type === 'objects' ? 'objects' : type === 'payroll' ? 'payroll' : type === 'work_history' ? 'work_history' : type === 'payment_acts' ? 'payment_acts' : 'materials'
  let rows = (pack[singleKey] as Record<string, unknown>[]) ?? []

  if (type === 'workers' && role === 'subcontractor' && format === 'xlsx') {
    const w = collectWorkers(role, contractorId, filters)
    if (w.foremen && w.workers) {
      writeWorkbook([
        { name: 'Прорабы', rows: w.foremen },
        { name: 'Мастера', rows: w.workers },
      ], `${baseName}.xlsx`)
      return
    }
  }

  if (format === 'xlsx') writeWorkbook([{ name: EXPORT_TYPE_LABELS[type], rows }], `${baseName}.xlsx`)
  else if (format === 'csv') writeCsv(rows, `${baseName}.csv`)
  else if (format === 'pdf') openPdfTable(EXPORT_TYPE_LABELS[type], rows)
}

export function availableExportTypes(role: AppRole): ExportDataType[] {
  switch (role) {
    case 'subcontractor':
      return ['workers', 'objects', 'payroll', 'work_history', 'payment_acts', 'materials', 'full']
    case 'foreman':
      return ['workers', 'objects', 'payroll', 'work_history', 'payment_acts', 'materials', 'full']
    case 'client':
      return ['objects', 'payroll', 'payment_acts', 'materials', 'full']
    case 'worker':
      return ['payroll', 'work_history', 'full']
    default:
      return ['full']
  }
}
