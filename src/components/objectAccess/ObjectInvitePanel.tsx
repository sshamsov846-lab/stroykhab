import React, { useMemo } from 'react'
import { Copy, RefreshCw, Share2, QrCode, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useObjectAccessStore } from '@store/objectAccessStore'
import {
  buildObjectConnectShareText,
  buildObjectConnectUrl,
} from '@utils/objectInviteCode'
import {
  CHAIN_MODE_HINTS,
  CHAIN_MODE_LABELS,
  type InviteChainMode,
} from '@/types/objectAccess'

interface Props {
  objectId: string
  objectName: string
  canManage?: boolean
}

export const ObjectInvitePanel: React.FC<Props> = ({ objectId, objectName, canManage = false }) => {
  const invite = useObjectAccessStore((s) => s.invites[objectId])
  const regenerateCode = useObjectAccessStore((s) => s.regenerateCode)
  const setReusable = useObjectAccessStore((s) => s.setReusable)

  const connectUrl = useMemo(
    () => (invite ? buildObjectConnectUrl(invite.code) : ''),
    [invite],
  )

  const qrUrl = useMemo(
    () => (connectUrl ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(connectUrl)}` : ''),
    [connectUrl],
  )

  if (!invite) {
    return (
      <p className="text-sm-mobile text-gray-500 bg-white rounded-2xl p-4 border border-gray-100">
        Код приглашения не сгенерирован
      </p>
    )
  }

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(invite.code)
      toast.success('Код скопирован')
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(connectUrl)
      toast.success('Ссылка скопирована')
    } catch {
      toast.error('Не удалось скопировать')
    }
  }

  const shareAll = async () => {
    const text = buildObjectConnectShareText(objectName, invite.code)
    if (navigator.share) {
      try {
        await navigator.share({ title: `Объект ${objectName}`, text, url: connectUrl })
        return
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Текст для отправки скопирован')
    } catch {
      toast.error('Не удалось поделиться')
    }
  }

  const handleRegenerate = () => {
    if (!canManage) return
    if (!window.confirm('Сгенерировать новый код? Старый перестанет работать.')) return
    const next = regenerateCode(objectId, objectName)
    if (next) toast.success(`Новый код: ${next.code}`)
  }

  return (
    <div className="bg-white rounded-2xl border border-primary-100 p-4 space-y-4">
      <div>
        <p className="text-xs-mobile text-gray-500 uppercase tracking-wide">Код объекта</p>
        <p className="text-3xl-mobile font-bold text-primary-700 tracking-wider mt-1">{invite.code}</p>
        <p className="text-xs-mobile text-gray-500 mt-1">
          {CHAIN_MODE_LABELS[invite.chainMode]} · {invite.reusable ? 'многоразовый' : 'одноразовый'}
        </p>
        <p className="text-xs-mobile text-gray-400 mt-0.5">{CHAIN_MODE_HINTS[invite.chainMode]}</p>
      </div>

      {qrUrl && (
        <div className="flex flex-col items-center gap-2">
          <img src={qrUrl} alt="QR-код подключения" className="w-[180px] h-[180px] rounded-xl border border-gray-100" />
          <p className="text-xs-mobile text-gray-500 flex items-center gap-1">
            <QrCode size={14} /> Сканируйте для подключения
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={copyCode}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-primary-50 text-primary-700 text-sm-mobile font-medium"
        >
          <Copy size={16} /> Копировать код
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-50 text-gray-700 text-sm-mobile font-medium"
        >
          <Link2 size={16} /> Ссылка
        </button>
        <button
          type="button"
          onClick={shareAll}
          className="flex-1 min-w-[120px] flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-sm-mobile font-medium"
        >
          <Share2 size={16} /> Поделиться
        </button>
      </div>

      <p className="text-xs-mobile text-gray-400 break-all bg-gray-50 rounded-lg p-2">{connectUrl}</p>

      {canManage && (
        <div className="pt-3 border-t border-gray-100 space-y-3">
          <label className="flex items-center justify-between gap-3 text-sm-mobile">
            <span className="text-gray-700">Многоразовый код</span>
            <input
              type="checkbox"
              checked={invite.reusable}
              onChange={(e) => setReusable(objectId, e.target.checked)}
              className="rounded border-gray-300 text-primary-600 w-5 h-5"
            />
          </label>
          <button
            type="button"
            onClick={handleRegenerate}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 text-sm-mobile font-medium"
          >
            <RefreshCw size={16} /> Обновить код (старый перестанет работать)
          </button>
        </div>
      )}
    </div>
  )
}

export const ChainModeSelector: React.FC<{
  value: InviteChainMode
  onChange: (v: InviteChainMode) => void
  reusable: boolean
  onReusableChange: (v: boolean) => void
}> = ({ value, onChange, reusable, onReusableChange }) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
    <p className="text-sm-mobile font-semibold text-gray-800">Кому передать код доступа</p>
    <div className="space-y-2">
      {(['foreman', 'organization'] as InviteChainMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`w-full text-left p-3 rounded-xl border-2 transition-colors ${
            value === mode ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-gray-50'
          }`}
        >
          <p className="text-sm-mobile font-semibold text-gray-900">{CHAIN_MODE_LABELS[mode]}</p>
          <p className="text-xs-mobile text-gray-500 mt-0.5">{CHAIN_MODE_HINTS[mode]}</p>
        </button>
      ))}
    </div>
    <p className="text-xs-mobile text-gray-400">Заказчик может передать код любому участнику</p>
    <label className="flex items-center justify-between gap-3 text-sm-mobile pt-2 border-t border-gray-100">
      <span className="text-gray-700">Многоразовый код</span>
      <input
        type="checkbox"
        checked={reusable}
        onChange={(e) => onReusableChange(e.target.checked)}
        className="rounded border-gray-300 text-primary-600 w-5 h-5"
      />
    </label>
    <p className="text-xs-mobile text-gray-400">
      {reusable ? 'Код можно использовать несколько раз' : 'Код сработает один раз, затем нужен новый'}
    </p>
  </div>
)
