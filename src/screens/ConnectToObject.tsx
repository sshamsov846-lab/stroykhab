import React, { useCallback, useEffect, useState } from 'react'

import { useNavigate, useSearchParams } from 'react-router-dom'

import { ArrowLeft, KeyRound, CheckCircle2, Building2, AlertCircle } from 'lucide-react'

import toast from 'react-hot-toast'

import { useUserStore } from '@store/userStore'

import { useObjectAccessStore, suggestSimilarInviteCodes } from '@store/objectAccessStore'
import { useObjectStore } from '@store/objectStore'
import { loadInvitesFromDisk, mergeInvites } from '@utils/objectAccessStorage'

import { getCurrentUserKey } from '@utils/notificationFilter'

import { normalizeInviteCode } from '@utils/objectInviteCode'

import { refreshConnectStores } from '@utils/crossTabStorageSync'

import { BigButton } from '@components/BigButton'



export const ConnectToObject: React.FC = () => {

  const navigate = useNavigate()

  const [searchParams] = useSearchParams()

  const role = useUserStore((s) => s.role)

  const fullName = useUserStore((s) => s.fullName)

  const phone = useUserStore((s) => s.phone)

  const contractorId = useUserStore((s) => s.contractorId)

  const workerMemberId = useUserStore((s) => s.workerMemberId)

  const [code, setCode] = useState(searchParams.get('code') ?? '')

  const [preview, setPreview] = useState<{ objectName: string; hint?: string; valid: boolean } | null>(null)

  const [connecting, setConnecting] = useState(false)

  const [lookingUp, setLookingUp] = useState(false)



  const lookupCode = useCallback(async (raw: string) => {

    const trimmed = raw.trim()

    if (normalizeInviteCode(trimmed).replace(/-/g, '').length < 4) {

      setPreview(null)

      return

    }



    setLookingUp(true)

    await refreshConnectStores()



    const found = useObjectAccessStore.getState().findByCode(trimmed)

    if (!found) {

      const org = useObjectAccessStore.getState().findOrgByInviteCode(trimmed)

      if (org) {

        setPreview({

          objectName: org.name,

          hint: 'Это код вашей организации, а не объекта. Введите код объекта от заказчика (например ЖКБОО-1234).',

          valid: false,

        })

      } else {
        const mergedInvites = mergeInvites(
          useObjectAccessStore.getState().invites,
          loadInvitesFromDisk(),
        )
        const similar = suggestSimilarInviteCodes(trimmed, mergedInvites)
        const similarHint = similar.length
          ? `Возможно, имелся в виду: ${similar.join(' или ')}`
          : 'Проверьте код от заказчика. Убедитесь, что вы на том же сайте (тот же адрес в браузере), где создавали объект.'

        setPreview({
          objectName: 'Код не найден',
          hint: similarHint,
          valid: false,
        })
      }

      setLookingUp(false)

      return

    }



    const validation = useObjectAccessStore.getState().validateCodeForRole(trimmed, role, getCurrentUserKey())

    setPreview({

      objectName: found.objectName,

      hint: validation.reason,

      valid: validation.ok,

    })

    setLookingUp(false)

  }, [role])



  useEffect(() => {

    const fromUrl = searchParams.get('code')

    if (fromUrl) {

      setCode(fromUrl)

      void lookupCode(fromUrl)

    }

  }, [searchParams, lookupCode])



  useEffect(() => {

    void refreshConnectStores()

  }, [])



  const handleCodeChange = (raw: string) => {

    setCode(raw)

    void lookupCode(raw)

  }



  const handleConnect = async () => {

    if (!code.trim()) {

      toast.error('Введите код')

      return

    }



    setConnecting(true)
    await refreshConnectStores()

    const result = useObjectAccessStore.getState().connectWithCode(code, {

      userKey: getCurrentUserKey(),

      role,

      fullName,

      phone,

      contractorId,

      workerMemberId,

    })

    setConnecting(false)



    if (!result.ok) {
      toast.error(result.reason ?? 'Не удалось подключиться')
      void lookupCode(code)
      return
    }

    await useObjectAccessStore.persist.rehydrate()
    await useObjectStore.persist.rehydrate()

    toast.success(`Подключено: ${result.objectName}`)

    if (role === 'foreman') navigate(`/object/${result.objectId}`)

    else if (role === 'subcontractor') navigate('/')

    else if (role === 'worker') navigate('/')

    else navigate('/')

  }



  if (role === 'client') {

    return (

      <div className="min-h-screen bg-gray-50 p-6 flex flex-col items-center justify-center">

        <p className="text-sm-mobile text-gray-600 text-center">

          Заказчик создаёт объекты самостоятельно — подключение по коду не требуется

        </p>

        <button type="button" onClick={() => navigate('/')} className="mt-4 text-primary-600 text-sm-mobile">

          На главную

        </button>

      </div>

    )

  }



  const canConnect = normalizeInviteCode(code).replace(/-/g, '').length >= 4



  return (

    <div className="min-h-screen bg-gray-50 pb-24">

      <div className="bg-white border-b px-4 py-4">

        <button

          type="button"

          onClick={() => navigate(-1)}

          className="flex items-center gap-2 text-primary-600 text-sm-mobile font-medium mb-2"

        >

          <ArrowLeft size={18} /> Назад

        </button>

        <h1 className="text-xl-mobile font-bold text-gray-900">Подключиться к объекту</h1>

        <p className="text-sm-mobile text-gray-500">Введите код объекта от заказчика</p>

      </div>



      <div className="p-4 space-y-4">

        <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

          <label className="text-sm-mobile font-medium text-gray-700 flex items-center gap-2">

            <KeyRound size={18} className="text-primary-600" /> Код объекта

          </label>

          <input

            value={code}

            onChange={(e) => handleCodeChange(e.target.value.toUpperCase())}

            placeholder="ЖКБОС-9301"

            className="w-full min-h-[52px] px-4 rounded-xl border border-gray-200 text-xl-mobile font-bold tracking-wider text-center uppercase"

            autoCapitalize="characters"

          />

          {lookingUp && (

            <p className="text-xs-mobile text-gray-400 text-center">Проверяем код…</p>

          )}

        </div>



        {preview && preview.valid && (

          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex gap-3">

            <Building2 size={24} className="text-emerald-600 shrink-0 mt-0.5" />

            <div>

              <p className="text-sm-mobile font-semibold text-emerald-900">Объект найден</p>

              <p className="text-lg-mobile font-bold text-emerald-800 mt-0.5">{preview.objectName}</p>

              {preview.hint && (

                <p className="text-xs-mobile text-emerald-700 mt-1">{preview.hint}</p>

              )}

            </div>

          </div>

        )}



        {preview && !preview.valid && (

          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex gap-3">

            <AlertCircle size={24} className="text-red-600 shrink-0 mt-0.5" />

            <div>

              <p className="text-sm-mobile font-semibold text-red-900">{preview.objectName}</p>

              {preview.hint && (

                <p className="text-xs-mobile text-red-700 mt-1">{preview.hint}</p>

              )}

            </div>

          </div>

        )}



        <BigButton

          variant="primary"

          size="lg"

          fullWidth

          onClick={handleConnect}

          disabled={connecting || !canConnect}

        >

          {connecting ? 'Подключение…' : 'Подтвердить подключение'}

        </BigButton>



        <div className="bg-white rounded-2xl p-4 border border-gray-100">

          <p className="text-sm-mobile font-semibold text-gray-900 mb-2 flex items-center gap-2">

            <CheckCircle2 size={18} className="text-primary-600" /> Как это работает

          </p>

          <ul className="text-xs-mobile text-gray-600 space-y-1.5 list-disc pl-4">
            <li>Заказчик создаёт объект и получает уникальный код (например ЖКБОС-9301)</li>
            <li>Это не код вашей организации — нужен именно код объекта</li>
            <li>После подключения объект появится в «Мои работы» / «Мои объекты»</li>
            <li>Код многоразовый — прорабы и мастера тоже могут подключиться по нему</li>
          </ul>

        </div>

      </div>

    </div>

  )

}

