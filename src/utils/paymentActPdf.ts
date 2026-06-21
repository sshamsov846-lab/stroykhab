import type { PaymentAct, PaymentActLineItem } from '@/types/paymentAct'
import type { CompanyRequisites } from '@/types/paymentSettings'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { unitLabel } from '@utils/paymentActCalc'
import { formatMoney } from '@utils/workerPayrollCalc'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

type PriceLevel = 'worker' | 'foreman' | 'client'

function rowAmount(item: PaymentActLineItem, level: PriceLevel): number {
  if (level === 'worker') return item.workerAmount
  if (level === 'foreman') return item.foremanAmount
  return item.clientAmount
}

function rowPrice(item: PaymentActLineItem, level: PriceLevel): number {
  if (level === 'worker') return item.outgoingUnitPrice
  if (level === 'foreman') return item.incomingUnitPrice
  return item.clientUnitPrice
}

function totalForLevel(act: PaymentAct, level: PriceLevel): number {
  if (level === 'worker') return act.workerTotal
  if (level === 'foreman') return act.foremanTotal
  return act.clientTotal
}

export function generatePaymentActHtml(
  act: PaymentAct,
  level: PriceLevel = 'foreman',
  options?: { official?: boolean; requisites?: CompanyRequisites },
): string {
  const rows = act.lineItems
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(WORK_TYPE_LABELS[item.workType] || item.workType)}</td>
        <td>${escapeHtml(item.label)}</td>
        <td style="text-align:right">${item.volume}</td>
        <td>${unitLabel(item.unit)}</td>
        <td style="text-align:right">${rowPrice(item, level).toLocaleString('ru-RU')}</td>
        <td style="text-align:right;font-weight:600">${rowAmount(item, level).toLocaleString('ru-RU')} ₽</td>
      </tr>`,
    )
    .join('')

  const photos = [...act.photos, ...act.scanAttachments]
  const photoBlocks = photos.length
    ? photos
        .map(
          (url) =>
            `<div style="display:inline-block;margin:4px"><img src="${url}" style="max-width:140px;max-height:140px;border:1px solid #ddd;border-radius:8px" /></div>`,
        )
        .join('')
    : '<p style="color:#666">Фото не приложены</p>'

  const period = `${new Date(act.periodFrom).toLocaleDateString('ru-RU')} — ${new Date(act.periodTo).toLocaleDateString('ru-RU')}`

  const req = options?.requisites
  const reqBlock = options?.official && req?.companyName
    ? `<div class="meta" style="border:1px solid #ccc;padding:12px;margin-bottom:16px">
        <div><strong>${escapeHtml(req.companyName ?? '')}</strong></div>
        ${req.inn ? `<div>ИНН: ${escapeHtml(req.inn)}</div>` : ''}
        ${req.address ? `<div>${escapeHtml(req.address)}</div>` : ''}
        ${req.bankName ? `<div>Банк: ${escapeHtml(req.bankName)}</div>` : ''}
        ${req.bik || req.account ? `<div>БИК ${escapeHtml(req.bik ?? '')} · р/с ${escapeHtml(req.account ?? '')}</div>` : ''}
      </div>`
    : ''

  const title = options?.official ? 'АКТ ВЫПОЛНЕННЫХ РАБОТ (официальный)' : 'АКТ ВЫПОЛНЕННЫХ РАБОТ'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Акт выполненных работ ${escapeHtml(act.actNumber)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 900px; margin: 24px auto; padding: 16px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #444; font-size: 13px; margin-bottom: 20px; line-height: 1.6; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .total { text-align: right; font-size: 16px; font-weight: bold; margin-top: 12px; }
    .sign { margin-top: 40px; display: flex; gap: 48px; font-size: 13px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>${title} № ${escapeHtml(act.actNumber)}</h1>
  ${reqBlock}
  <div class="meta">
    <div><strong>Объект:</strong> ${escapeHtml(act.objectName)}</div>
    <div><strong>Исполнитель:</strong> ${escapeHtml(act.executorName)} (${act.executorType === 'brigade' ? 'бригада' : 'мастер'})</div>
    <div><strong>Период:</strong> ${period}</div>
    <div><strong>Дата формирования:</strong> ${act.formedAt ? new Date(act.formedAt).toLocaleString('ru-RU') : '—'}</div>
    <div><strong>Статус:</strong> ${escapeHtml(act.status)}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Вид работ</th>
        <th>Описание</th>
        <th>Объём</th>
        <th>Ед.</th>
        <th>Расценка</th>
        <th>Сумма</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">ИТОГО: ${formatMoney(totalForLevel(act, level))}</div>
  <div style="margin-top:24px">
    <h2 style="font-size:16px">Фото выполненных работ</h2>
    ${photoBlocks}
  </div>
  <div class="sign">
    <div>
      <p>Исполнитель: _________________</p>
      <p style="color:#666">${escapeHtml(act.executorName)}</p>
    </div>
    <div>
      <p>Прораб: _________________</p>
      <p style="color:#666">${escapeHtml(act.formedBy ?? '')}</p>
    </div>
    <div>
      <p>Заказчик: _________________</p>
    </div>
  </div>
</body>
</html>`
}

export function printPaymentAct(
  act: PaymentAct,
  level: PriceLevel = 'foreman',
  options?: { official?: boolean; requisites?: CompanyRequisites },
): void {
  const html = generatePaymentActHtml(act, level, options)
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(html)
  w.document.close()
  w.focus()
  w.print()
}

export function downloadPaymentActHtml(act: PaymentAct, level: PriceLevel = 'foreman'): void {
  const html = generatePaymentActHtml(act, level)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `akt-${act.actNumber}.html`
  a.click()
  URL.revokeObjectURL(url)
}

export function downloadPaymentActPdf(
  act: PaymentAct,
  level: PriceLevel = 'foreman',
  options?: { official?: boolean; requisites?: CompanyRequisites },
): void {
  printPaymentAct(act, level, options)
}
