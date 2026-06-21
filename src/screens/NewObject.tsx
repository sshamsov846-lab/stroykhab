import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Home, User, Phone, Wallet, Calendar, Layers } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTelegram } from '@hooks/useTelegram'
import { BigButton } from '@components/BigButton'
import { createObject } from '@api/supabase'
import { OrganizationEditor, orgDraftsToClientOrgs, type OrgDraft } from '@components/object/OrganizationEditor'
import { useObjectStore, DEFAULT_ORG_TEMPLATES, type ObjectKind } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useMaterialStore } from '@store/materialStore'
import { MaterialPaymentPolicyPicker } from '@components/materials/MaterialPaymentPolicyPicker'
import type { MaterialPaymentPolicy } from '@/types/materials'

const objectSchema = z.object({
  name: z.string().min(1, 'Введите название'),
  address: z.string().min(1, 'Введите адрес'),
  client_name: z.string().min(1, 'Введите имя заказчика'),
  client_phone: z.string().min(10, 'Введите телефон'),
  budget_total: z.number().min(0, 'Бюджет не может быть отрицательным'),
  start_date: z.string().min(1, 'Выберите дату начала'),
})

type ObjectFormData = z.infer<typeof objectSchema>

const STEPS = ['Данные', 'Тип', 'Организации'] as const

export const NewObject: React.FC = () => {
  const navigate = useNavigate()
  const { haptic, showBackButton, hideBackButton } = useTelegram()
  const registerObject = useObjectStore((s) => s.registerObject)
  const syncContractors = useProjectWorkflowStore((s) => s.syncContractorsFromOrgs)
  const setMaterialPaymentSettings = useMaterialStore((s) => s.setObjectPaymentSettings)

  const [step, setStep] = useState(0)
  const [objectKind, setObjectKind] = useState<ObjectKind>('apartment')
  const [materialPolicy, setMaterialPolicy] = useState<MaterialPaymentPolicy>('client_material')
  const [reimbursementSource, setReimbursementSource] = useState<'client' | 'organization'>('client')
  const [organizations, setOrganizations] = useState<OrgDraft[]>(
    DEFAULT_ORG_TEMPLATES.map((o) => ({ name: o.name, specialty: o.specialty, phone: o.phone || '' })),
  )

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<ObjectFormData>({
    resolver: zodResolver(objectSchema),
    defaultValues: {
      start_date: new Date().toISOString().split('T')[0],
      budget_total: 0,
    },
  })

  React.useEffect(() => {
    showBackButton(() => (step > 0 ? setStep((s) => s - 1) : navigate(-1)))
    return () => hideBackButton()
  }, [showBackButton, hideBackButton, navigate, step])

  const nextStep = async () => {
    if (step === 0) {
      const ok = await trigger(['name', 'address', 'client_name', 'client_phone', 'budget_total', 'start_date'])
      if (!ok) return
    }
    if (step === 1) {
      setStep(2)
      return
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1))
  }

  const onSubmit = async (data: ObjectFormData) => {
    const orgs = orgDraftsToClientOrgs(organizations)
    if (!orgs.length) {
      toast.error('Добавьте хотя бы одну организацию')
      return
    }

    try {
      haptic('success')
      const obj = await createObject({
        name: data.name,
        address: data.address,
        client_name: data.client_name,
        client_phone: data.client_phone,
        status: 'active',
        budget_total: data.budget_total,
        budget_spent: 0,
        progress: 0,
        start_date: data.start_date,
        total_houses: objectKind === 'building' ? 1 : undefined,
      })

      registerObject(obj, orgs, { kind: objectKind })
      syncContractors(orgs)
      setMaterialPaymentSettings(obj.id, {
        policy: materialPolicy,
        reimbursementSource,
      }, data.client_name)

      toast.success('Объект создан — доступен заказчику и прорабу')
      navigate(`/object/${obj.id}/setup`)
    } catch (error) {
      haptic('error')
      console.error('Ошибка:', error)
      toast.error('Не удалось создать объект')
    }
  }

  const handleFinal = () => {
    handleSubmit(onSubmit)()
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => (step > 0 ? setStep((s) => s - 1) : navigate(-1))}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"
          >
            <ArrowLeft size={24} />
          </button>
          <div className="flex-1">
            <h1 className="text-lg-mobile font-bold text-gray-900">Новый объект</h1>
            <p className="text-xs-mobile text-gray-500">Шаг {step + 1} из {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>
        <div className="px-4 pb-3 flex gap-1">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-primary-500' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm-mobile font-medium text-gray-700 mb-1">
                <Home size={14} className="inline mr-1" />
                Название объекта
              </label>
              <input
                {...register('name')}
                className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                placeholder="Секция А / Квартира на Ленина"
              />
              {errors.name && <p className="text-sm-mobile text-red-600 mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm-mobile font-medium text-gray-700 mb-1">📍 Адрес</label>
              <input
                {...register('address')}
                className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                placeholder="ул. Ленина, 45, кв. 12"
              />
              {errors.address && <p className="text-sm-mobile text-red-600 mt-1">{errors.address.message}</p>}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <h3 className="text-base-mobile font-semibold text-gray-900">Заказчик</h3>
              <div>
                <label className="block text-sm-mobile font-medium text-gray-700 mb-1">
                  <User size={14} className="inline mr-1" />
                  Имя
                </label>
                <input {...register('client_name')} className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" placeholder="Иванов И.И." />
                {errors.client_name && <p className="text-sm-mobile text-red-600 mt-1">{errors.client_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm-mobile font-medium text-gray-700 mb-1">
                  <Phone size={14} className="inline mr-1" />
                  Телефон
                </label>
                <input {...register('client_phone')} type="tel" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" placeholder="+7 (999) 123-45-67" />
                {errors.client_phone && <p className="text-sm-mobile text-red-600 mt-1">{errors.client_phone.message}</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <h3 className="text-base-mobile font-semibold text-gray-900">Бюджет и сроки</h3>
              <div>
                <label className="block text-sm-mobile font-medium text-gray-700 mb-1">
                  <Wallet size={14} className="inline mr-1" />
                  Общий бюджет (₽)
                </label>
                <input {...register('budget_total', { valueAsNumber: true })} type="number" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" placeholder="450000" />
                {errors.budget_total && <p className="text-sm-mobile text-red-600 mt-1">{errors.budget_total.message}</p>}
              </div>
              <div>
                <label className="block text-sm-mobile font-medium text-gray-700 mb-1">
                  <Calendar size={14} className="inline mr-1" />
                  Дата начала
                </label>
                <input {...register('start_date')} type="date" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" />
                {errors.start_date && <p className="text-sm-mobile text-red-600 mt-1">{errors.start_date.message}</p>}
              </div>
            </div>
          </>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm-mobile text-gray-600">Выберите тип объекта — от этого зависит структура в кабинете заказчика.</p>
            <button
              type="button"
              onClick={() => setObjectKind('apartment')}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${objectKind === 'apartment' ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <Home size={24} className={objectKind === 'apartment' ? 'text-primary-600' : 'text-gray-400'} />
                <div>
                  <p className="font-semibold text-gray-900">Квартира / частный дом</p>
                  <p className="text-sm-mobile text-gray-500">Одна квартира, работы по организациям</p>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => setObjectKind('building')}
              className={`w-full text-left p-4 rounded-2xl border-2 transition-colors ${objectKind === 'building' ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-white'}`}
            >
              <div className="flex items-center gap-3">
                <Layers size={24} className={objectKind === 'building' ? 'text-primary-600' : 'text-gray-400'} />
                <div>
                  <p className="font-semibold text-gray-900">Многоэтажный дом / секция</p>
                  <p className="text-sm-mobile text-gray-500">Импорт сметы CSV / Excel → дома, этажи, квартиры</p>
                </div>
              </div>
            </button>
            {objectKind === 'building' && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm-mobile text-blue-800">
                После создания загрузите смету на шаге настройки — программа построит всю иерархию автоматически.
              </div>
            )}
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <MaterialPaymentPolicyPicker
                value={materialPolicy}
                onChange={setMaterialPolicy}
                reimbursementSource={reimbursementSource}
                onReimbursementSourceChange={setReimbursementSource}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <OrganizationEditor organizations={organizations} onChange={setOrganizations} />
        )}

        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <BigButton type="button" variant="ghost" size="lg" fullWidth onClick={() => setStep((s) => s - 1)}>
              Назад
            </BigButton>
          )}
          {step < STEPS.length - 1 ? (
            <BigButton type="button" variant="primary" size="lg" fullWidth onClick={nextStep}>
              Далее
            </BigButton>
          ) : (
            <BigButton type="button" variant="primary" size="lg" fullWidth isLoading={isSubmitting} onClick={handleFinal}>
              💾 Создать и настроить
            </BigButton>
          )}
        </div>

        {step === 2 && (
          <p className="text-xs-mobile text-center text-gray-400">
            Объект появится у прораба, заказчика ({getValues('client_name') || '…'}) и всех организаций
          </p>
        )}
      </div>
    </div>
  )
}
