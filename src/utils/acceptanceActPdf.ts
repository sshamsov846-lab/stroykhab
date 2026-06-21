import type { AcceptanceAct } from '@store/qualityAcceptanceStore'
import { WORK_TYPE_LABELS } from '@api/hierarchy'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function generateAcceptanceActHtml(act: AcceptanceAct): string {
  const workTypeLabel = WORK_TYPE_LABELS[act.workType] || act.workType
  const dateStr = new Date(act.acceptedAt).toLocaleString('ru-RU')
  const warrantyStr = new Date(act.warrantyUntil).toLocaleDateString('ru-RU')

  const checklistRows = act.checklist
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td style="text-align:center">${item.checked ? '✓' : '—'}</td>
        <td>${escapeHtml(item.note || '—')}</td>
      </tr>`,
    )
    .join('')

  const photoBlocks = act.photos.length
    ? act.photos
        .map(
          (url) =>
            `<div style="display:inline-block;margin:4px"><img src="${url}" style="max-width:140px;max-height:140px;border:1px solid #ddd;border-radius:8px" /></div>`,
        )
        .join('')
    : '<p style="color:#666">Фото не приложены</p>'

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <title>Акт приёмки — ${escapeHtml(act.workLabel)}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 24px auto; padding: 16px; color: #111; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #444; font-size: 13px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }
    th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    .section { margin-top: 20px; }
    .sign { margin-top: 32px; display: flex; gap: 48px; font-size: 13px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; background: #ecfdf5; color: #065f46; font-size: 12px; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>
  <h1>АКТ ПРИЁМКИ ВЫПОЛНЕННЫХ РАБОТ</h1>
  <div class="meta">
    <div><strong>Объект:</strong> ${escapeHtml(act.objectName || act.objectId)}</div>
    <div><strong>Работа:</strong> ${escapeHtml(workTypeLabel)} — ${escapeHtml(act.workLabel)}</div>
    <div><strong>Помещение:</strong> ${escapeHtml(act.apartmentNumber)}</div>
    <div><strong>Дата приёмки:</strong> ${dateStr}</div>
    <div><strong>Принял:</strong> ${escapeHtml(act.acceptedBy)} (${act.acceptedByRole === 'foreman' ? 'прораб' : 'заказчик'})</div>
    <div><strong>Гарантия:</strong> ${act.warrantyMonths} мес. (до ${warrantyStr})</div>
    ${act.clientApproved ? '<div class="badge">✓ Согласовано заказчиком</div>' : ''}
  </div>

  <div class="section">
    <h2 style="font-size:16px">Чек-лист качества</h2>
    <table>
      <thead><tr><th>Пункт</th><th>OK</th><th>Замечание</th></tr></thead>
      <tbody>${checklistRows}</tbody>
    </table>
  </div>

  ${act.generalRemark ? `<div class="section"><h2 style="font-size:16px">Общее замечание</h2><p>${escapeHtml(act.generalRemark)}</p></div>` : ''}

  <div class="section">
    <h2 style="font-size:16px">Фото</h2>
    ${photoBlocks}
  </div>

  <div class="sign">
    <div>
      <p>Прораб: _________________</p>
      <p style="color:#666;margin-top:4px">${escapeHtml(act.acceptedByRole === 'foreman' ? act.acceptedBy : '')}</p>
    </div>
    <div>
      <p>Заказчик: _________________</p>
      <p style="color:#666;margin-top:4px">${act.clientApproved ? 'Согласовано' : ''}</p>
    </div>
  </div>
</body>
</html>`
}

export function printAcceptanceAct(act: AcceptanceAct): void {
  const html = generateAcceptanceActHtml(act)
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 300)
}

export function downloadAcceptanceActHtml(act: AcceptanceAct): void {
  const html = generateAcceptanceActHtml(act)
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `akt-priemki-${act.id}.html`
  a.click()
  URL.revokeObjectURL(url)
}
