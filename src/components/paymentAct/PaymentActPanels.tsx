import React, { useState } from 'react'
import { FileText, Download, Send, Camera, RotateCcw } from 'lucide-react'
import toast from 'react-hot-toast'
import { usePaymentActStore } from '@store/paymentActStore'
import { useUserStore } from '@store/userStore'
import type { PaymentAct, PaymentActLineItem } from '@/types/paymentAct'
import { unitLabel } from '@utils/paymentActCalc'
import { formatMoney } from '@utils/workerPayrollCalc'
import { downloadPaymentActExcel } from '@utils/paymentActExcel'
import { downloadPaymentActPdf } from '@utils/paymentActPdf'
import { PAYMENT_ACT_STATUS_LABELS } from '@/types/paymentAct'
import { PAYMENT_DOCUMENT_LABELS } from '@/types/paymentSettings'
import {
  getOrgChargeClientSettings,
  resolveDocumentModeForForeman,
  resolveRequisitesForForeman,
  resolveRequisitesForOrg,
} from '@utils/paymentSettingsHelpers'
import { BigButton } from '@components/BigButton'

function pdfExportOptions(act: PaymentAct, role: 'foreman' | 'client' | 'subcontractor') {
  if (role === 'client' && act.orgId) {
    const doc = getOrgChargeClientSettings(act.orgId).documentMode
    return { official: doc === 'official_pdf', requisites: resolveRequisitesForOrg(act.orgId) }
  }
  if (role === 'subcontractor' && act.orgId) {
    const doc = getOrgChargeClientSettings(act.orgId).documentMode
    return { official: doc === 'official_pdf', requisites: resolveRequisitesForOrg(act.orgId) }
  }
  const doc = resolveDocumentModeForForeman(act.foremanUserKey)
  return { official: doc === 'official_pdf', requisites: resolveRequisitesForForeman(act.foremanUserKey) }
}

interface Props {
  act: PaymentAct
}

export const PaymentActEditorPanel: React.FC<Props> = ({ act }) => {
  const formAct = usePaymentActStore((s) => s.formAct)
  const updateLineItems = usePaymentActStore((s) => s.updateLineItems)
  const sendToOrg = usePaymentActStore((s) => s.sendToOrg)
  const addScan = usePaymentActStore((s) => s.addScanAttachment)
  const fullName = useUserStore((s) => s.fullName)
  const docMode = resolveDocumentModeForForeman(act.foremanUserKey)
  const [items, setItems] = useState<PaymentActLineItem[]>(act.lineItems)
  const editable = act.status === 'worker_submitted' || act.status === 'act_draft' || act.status === 'returned'
  const pdfOpts = pdfExportOptions(act, 'foreman')

  const patchItem = (id: string, patch: Partial<PaymentActLineItem>) => {
    const next = items.map((it) => (it.id === id ? { ...it, ...patch } : it))
    setItems(next)
    updateLineItems(act.id, next)
  }

  const handleForm = () => {
    formAct(act.id, fullName || 'Прораб', items)
    toast.success('Акт сформирован')
  }

  const handleSend = () => {
    formAct(act.id, fullName || 'Прораб', items)
    const r = sendToOrg(act.id)
    if (r.ok) toast.success('Акт отправлен организации')
    else toast.error(r.reason ?? 'Ошибка')
  }

  const handleScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        addScan(act.id, reader.result)
        toast.success('Скан прикреплён')
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm-mobile font-semibold text-gray-900 flex items-center gap-2">
            <FileText size={18} className="text-primary-600" />
            Акт {act.actNumber}
          </p>
          <p className="text-xs-mobile text-gray-500">
            {act.executorName} · {PAYMENT_ACT_STATUS_LABELS[act.status]} · {PAYMENT_DOCUMENT_LABELS[docMode]}
          </p>
        </div>
        <span className="text-sm-mobile font-bold text-primary-600">{formatMoney(act.foremanTotal)}</span>
      </div>

      {act.returnReason && (
        <p className="text-xs-mobile text-amber-700 bg-amber-50 p-2 rounded-lg">{act.returnReason}</p>
      )}

      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-[1fr_72px_56px] gap-2 items-center text-sm-mobile">
            <span className="truncate">{item.label}</span>
            {editable ? (
              <input
                type="number"
                min={0}
                step="0.1"
                value={item.volume}
                onChange={(e) => patchItem(item.id, { volume: parseFloat(e.target.value) || 0 })}
                className="px-2 py-1 rounded border border-gray-200 text-right"
              />
            ) : (
              <span className="text-right">{item.volume}</span>
            )}
            <span className="text-gray-500 text-xs">{unitLabel(item.unit)}</span>
            <span className="col-span-3 text-xs text-gray-500 flex justify-between">
              <span>{item.incomingUnitPrice} ₽/ед.</span>
              <span className="font-medium">{formatMoney(item.foremanAmount)}</span>
            </span>
          </div>
        ))}
      </div>

      {(act.photos.length > 0 || act.scanAttachments.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {[...act.photos, ...act.scanAttachments].map((url, i) => (
            <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border" />
          ))}
        </div>
      )}

      {editable && (
        <>
          {(docMode === 'photo_scan' || docMode === 'official_pdf' || docMode === 'simple_act') && (
            <label className={`text-xs-mobile flex items-center gap-1 cursor-pointer ${
              docMode === 'photo_scan' ? 'text-amber-700 font-medium' : 'text-primary-600'
            }`}>
              <Camera size={14} />
              {docMode === 'photo_scan' ? 'Прикрепить фото/скан акта (основной документ)' : 'Прикрепить скан рукописного акта'}
              <input type="file" accept="image/*" className="hidden" onChange={handleScan} />
            </label>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadPaymentActPdf(act, 'foreman', pdfOpts)}
              className="text-sm-mobile text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg border"
            >
              <Download size={14} /> {pdfOpts.official ? 'Офиц. PDF' : 'PDF'}
            </button>
            <button type="button" onClick={() => downloadPaymentActExcel(act, 'foreman')} className="text-sm-mobile text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg border">
              <Download size={14} /> Excel
            </button>
          </div>

          {docMode !== 'none' && (
            <BigButton variant="secondary" size="md" fullWidth onClick={handleForm}>
              Закрыть работы / Сформировать акт
            </BigButton>
          )}
          <BigButton variant="primary" size="md" fullWidth onClick={handleSend}>
            <Send size={16} className="inline mr-1" />
            Отправить организации
          </BigButton>
        </>
      )}

      {act.status === 'sent_to_org' && (
        <p className="text-xs-mobile text-gray-500">Ожидает проверки организацией</p>
      )}
    </div>
  )
}

interface ReviewProps {
  act: PaymentAct
  role: 'subcontractor' | 'client'
}

export const PaymentActReviewPanel: React.FC<ReviewProps> = ({ act, role }) => {
  const forwardToClient = usePaymentActStore((s) => s.forwardToClient)
  const updateLineItems = usePaymentActStore((s) => s.updateLineItems)
  const approveAndPay = usePaymentActStore((s) => s.approveAndPay)
  const returnAct = usePaymentActStore((s) => s.returnAct)
  const [reason, setReason] = useState('')
  const [showReturn, setShowReturn] = useState(false)
  const [items, setItems] = useState(act.lineItems)

  const level = role === 'client' ? 'client' : 'foreman'
  const total = role === 'client'
    ? items.reduce((s, i) => s + i.clientAmount, 0)
    : items.reduce((s, i) => s + i.foremanAmount, 0)
  const canAct = (role === 'subcontractor' && act.status === 'sent_to_org')
    || (role === 'client' && act.status === 'sent_to_client')

  if (!canAct && act.status !== 'paid') return null

  if (act.status === 'paid') {
    return (
      <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100">
        <p className="text-sm-mobile font-semibold text-emerald-800">Оплачено · {formatMoney(act.clientTotal)}</p>
      </div>
    )
  }

  const handleForward = () => {
    const r = forwardToClient(act.id, items)
    if (r.ok) toast.success('Акт отправлен заказчику')
    else toast.error(r.reason ?? 'Ошибка')
  }

  const handlePay = () => {
    const r = approveAndPay(act.id)
    if (r.ok) toast.success('Оплачено, начисления выполнены')
    else toast.error(r.reason ?? 'Ошибка')
  }

  const handleReturn = () => {
    if (!reason.trim()) {
      toast.error('Укажите причину')
      return
    }
    returnAct(act.id, reason.trim(), role === 'client' ? 'client' : 'org')
    toast.success('Акт возвращён на уточнение')
    setShowReturn(false)
  }

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
      <p className="text-sm-mobile font-semibold text-gray-900">Акт на оплату {act.actNumber}</p>
      <p className="text-xs-mobile text-gray-500">{act.objectName} · {act.executorName}</p>
      <p className="text-lg-mobile font-bold text-primary-600">{formatMoney(total)}</p>

      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="text-sm-mobile space-y-1">
            <div className="flex justify-between">
              <span className="truncate flex-1">{item.label} — {item.volume} {unitLabel(item.unit)}</span>
              <span className="font-medium ml-2">
                {formatMoney(level === 'client' ? item.clientAmount : item.foremanAmount)}
              </span>
            </div>
            {role === 'subcontractor' && canAct && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Расценка для заказчика:</span>
                <input
                  type="number"
                  min={0}
                  value={item.clientUnitPrice}
                  onChange={(e) => {
                    const price = parseFloat(e.target.value) || 0
                    const next = items.map((it) =>
                      it.id === item.id
                        ? { ...it, clientUnitPrice: price, clientAmount: it.volume * price }
                        : it,
                    )
                    setItems(next)
                    updateLineItems(act.id, next)
                  }}
                  className="w-20 px-2 py-0.5 rounded border border-gray-200 text-right"
                />
                <span>₽/ед.</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {act.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {act.photos.map((url, i) => (
            <img key={i} src={url} alt="" className="w-14 h-14 rounded-lg object-cover border" />
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => downloadPaymentActPdf(act, level, pdfExportOptions(act, role))}
          className="text-sm-mobile text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg border"
        >
          <Download size={14} /> PDF
        </button>
        <button type="button" onClick={() => downloadPaymentActExcel(act, level)} className="text-sm-mobile text-gray-600 flex items-center gap-1 px-3 py-2 rounded-lg border">
          <Download size={14} /> Excel
        </button>
      </div>

      {role === 'subcontractor' && (
        <BigButton variant="primary" size="md" fullWidth onClick={handleForward}>
          <Send size={16} className="inline mr-1" />
          Переслать заказчику
        </BigButton>
      )}

      {role === 'client' && (
        <BigButton variant="primary" size="md" fullWidth onClick={handlePay}>
          Согласовать и оплатить
        </BigButton>
      )}

      {!showReturn ? (
        <button type="button" onClick={() => setShowReturn(true)} className="w-full text-sm-mobile text-amber-700 flex items-center justify-center gap-1 py-2">
          <RotateCcw size={14} /> Вернуть на уточнение
        </button>
      ) : (
        <div className="space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Что не так?"
            className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm-mobile min-h-[60px]"
          />
          <BigButton variant="secondary" size="md" fullWidth onClick={handleReturn}>
            Отправить с замечанием
          </BigButton>
        </div>
      )}
    </div>
  )
}
