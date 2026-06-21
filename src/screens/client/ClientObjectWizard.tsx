import React, { useState, useMemo } from 'react'

import { useNavigate } from 'react-router-dom'

import { ArrowLeft, Plus, Trash2, Sparkles, CheckCircle2, Layers, Building2, ChevronRight } from 'lucide-react'

import toast from 'react-hot-toast'

import { useTelegram } from '@hooks/useTelegram'

import { BigButton } from '@components/BigButton'

import { createObject } from '@api/supabase'

import { useObjectStore, DEFAULT_ORG_TEMPLATES } from '@store/objectStore'

import { orgDraftsToClientOrgs, type OrgDraft } from '@components/object/OrganizationEditor'

import { useProjectWorkflowStore } from '@store/projectWorkflowStore'

import { useClientPortalStore } from '@store/clientPortalStore'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { ChainModeSelector, ObjectInvitePanel } from '@components/objectAccess/ObjectInvitePanel'
import type { InviteChainMode } from '@/types/objectAccess'
import { getCurrentUserKey } from '@utils/notificationFilter'
import { useUserStore } from '@store/userStore'
import { useMaterialStore } from '@store/materialStore'
import { MaterialPaymentPolicyPicker } from '@components/materials/MaterialPaymentPolicyPicker'
import type { MaterialPaymentPolicy } from '@/types/materials'

import {

  generateObjectStructure,

  estimateStructureCounts,

  estimateHouseCounts,

} from '@utils/generateObjectStructure'

import { PLURAL, pluralWithCount } from '@utils/russianPlural'

import { APARTMENT_TYPE_OPTIONS, formatApartmentType } from '@utils/apartmentDisplay'

import {

  WORK_TEMPLATES,

  type WizardSectionDraft,

  type WizardHouseDraft,

  type WorkTemplateId,

  DEFAULT_HOUSE_ZONE_OPTIONS,
  DEFAULT_TERRITORY_OPTIONS,
} from '@/types/objectStructure'



function newId(p: string) {

  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

}



function newHouse(index: number): WizardHouseDraft {

  return {

    id: newId('house'),

    name: `Дом ${index}`,

    entrancesCount: 1,

    floorsPerEntrance: 10,

    apartmentsPerFloor: 4,

    defaultRooms: 2,

    apartmentArea: 55,

    workTemplate: 'rough',

    includeBasement: true,

    includeRoof: true,

    zoneOptions: { ...DEFAULT_HOUSE_ZONE_OPTIONS },

    structureConfigured: false,

    apartmentsConfigured: false,

  }

}



function newSection(index: number): WizardSectionDraft {

  return {

    id: newId('sec'),

    name: index === 1 ? 'Секция А' : `Секция ${index}`,

    houses: [newHouse(1)],

  }

}



function renumberHouses(sections: WizardSectionDraft[]): WizardSectionDraft[] {

  let n = 1

  return sections.map((sec) => ({

    ...sec,

    houses: sec.houses.map((h) => ({ ...h, name: `Дом ${n++}` })),

  }))

}



type HouseRef = { secIdx: number; houseIdx: number; house: WizardHouseDraft; sectionName: string }



function flattenHouses(sections: WizardSectionDraft[]): HouseRef[] {

  const list: HouseRef[] = []

  sections.forEach((sec, secIdx) => {

    sec.houses.forEach((house, houseIdx) => {

      list.push({ secIdx, houseIdx, house, sectionName: sec.name })

    })

  })

  return list

}



type DeleteConfirm = {

  type: 'section' | 'house'

  secIdx: number

  houseIdx?: number

  label: string

}



const STEPS = ['База', 'Секции и дома', 'Подъезды и этажи', 'Квартиры'] as const



export const ClientObjectWizard: React.FC = () => {

  const navigate = useNavigate()

  const { haptic } = useTelegram()

  const registerObject = useObjectStore((s) => s.registerObject)

  const syncContractors = useProjectWorkflowStore((s) => s.syncContractorsFromOrgs)

  const importHierarchy = useProjectWorkflowStore((s) => s.importHierarchy)

  const saveCustomStructure = useClientPortalStore((s) => s.saveCustomStructure)
  const createInviteForObject = useObjectAccessStore((s) => s.createInviteForObject)
  const setMaterialPaymentSettings = useMaterialStore((s) => s.setObjectPaymentSettings)



  const [step, setStep] = useState(0)

  const [done, setDone] = useState(false)

  const [createdId, setCreatedId] = useState('')

  const [summary, setSummary] = useState({ sections: 0, houses: 0, entrances: 0, floors: 0, apartments: 0, tasks: 0 })

  const [houseSummaries, setHouseSummaries] = useState<Array<{ name: string; section: string; apartments: number }>>([])



  const [name, setName] = useState('')

  const [address, setAddress] = useState('')

  const [budget, setBudget] = useState(0)

  const [sections, setSections] = useState<WizardSectionDraft[]>([newSection(1)])

  const [isSaving, setIsSaving] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirm | null>(null)

  const [editingStructureId, setEditingStructureId] = useState<string | null>(null)

  const [territoryOptions, setTerritoryOptions] = useState({ ...DEFAULT_TERRITORY_OPTIONS })
  const [chainMode, setChainMode] = useState<InviteChainMode>('foreman')
  const [inviteReusable, setInviteReusable] = useState(true)
  const [createdInviteCode, setCreatedInviteCode] = useState('')
  const [materialPolicy, setMaterialPolicy] = useState<MaterialPaymentPolicy>('client_material')
  const [reimbursementSource, setReimbursementSource] = useState<'client' | 'organization'>('client')

  const [editingApartmentsId, setEditingApartmentsId] = useState<string | null>(null)



  const preview = estimateStructureCounts(sections, territoryOptions)

  const allHouses = useMemo(() => flattenHouses(sections), [sections])



  const updateHouse = (secIdx: number, houseIdx: number, patch: Partial<WizardHouseDraft>) => {

    setSections((prev) =>

      prev.map((sec, si) => {

        if (si !== secIdx) return sec

        return {

          ...sec,

          houses: sec.houses.map((h, hi) => (hi === houseIdx ? { ...h, ...patch } : h)),

        }

      }),

    )

  }



  const findHouseRef = (houseId: string): HouseRef | undefined =>

    allHouses.find((h) => h.house.id === houseId)



  const confirmDelete = () => {

    if (!deleteConfirm) return

    haptic('medium')

    if (deleteConfirm.type === 'section') {

      setSections((prev) => renumberHouses(prev.filter((_, i) => i !== deleteConfirm.secIdx)))

    } else if (deleteConfirm.houseIdx !== undefined) {

      setSections((prev) =>

        renumberHouses(

          prev.map((sec, si) =>

            si === deleteConfirm.secIdx

              ? { ...sec, houses: sec.houses.filter((_, hi) => hi !== deleteConfirm.houseIdx) }

              : sec,

          ),

        ),

      )

    }

    setDeleteConfirm(null)

    setEditingStructureId(null)

    setEditingApartmentsId(null)

  }



  const handleGenerate = async () => {

    if (!name.trim() || !address.trim()) {

      toast.error('Заполните название и адрес')

      return

    }

    const notReady = allHouses.filter((h) => !h.house.structureConfigured || !h.house.apartmentsConfigured)

    if (notReady.length) {

      toast.error(`Настройте все дома: осталось ${notReady.length}`)

      return

    }

    setIsSaving(true)

    try {

      haptic('success')

      const orgs = orgDraftsToClientOrgs(

        DEFAULT_ORG_TEMPLATES.map((o) => ({ name: o.name, specialty: o.specialty, phone: o.phone || '' })) as OrgDraft[],

      )



      const obj = await createObject({

        name: name.trim(),

        address: address.trim(),

        status: 'active',

        budget_total: budget,

        budget_spent: 0,

        progress: 0,

        total_houses: sections.reduce((s, sec) => s + sec.houses.length, 0),

      })



      const { structure, importRows } = generateObjectStructure(obj.id, sections, {

        apartmentsPerFloor: 4,

        workTemplate: 'rough',

      }, territoryOptions)



      registerObject(obj, orgs, { kind: 'building', housesCount: structure.summary.houses })
      const { fullName, phone, role } = useUserStore.getState()
      setMaterialPaymentSettings(obj.id, {
        policy: materialPolicy,
        reimbursementSource,
      }, fullName)
      syncContractors(orgs)

      saveCustomStructure(structure)

      importHierarchy(obj.id, importRows)

      const invite = createInviteForObject(
        obj.id,
        obj.name,
        chainMode,
        inviteReusable,
        {
          userKey: getCurrentUserKey(),
          role,
          fullName,
          phone,
        },
      )
      setCreatedInviteCode(invite.code)

      setCreatedId(obj.id)

      setSummary(structure.summary)

      setHouseSummaries(

        allHouses.map((h) => ({

          name: h.house.name,

          section: h.sectionName,

          apartments: estimateHouseCounts(h.house).apartments,

        })),

      )

      setDone(true)

      toast.success(`Создано ${pluralWithCount(structure.summary.apartments, PLURAL.apartment)}`)

    } catch (e) {

      console.error(e)

      toast.error('Ошибка генерации')

    } finally {

      setIsSaving(false)

    }

  }



  const renderDeleteModal = () => {

    if (!deleteConfirm) return null

    return (

      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">

        <div className="bg-white rounded-2xl p-5 max-w-sm w-full space-y-4">

          <h3 className="text-lg-mobile font-bold text-gray-900">Удалить?</h3>

          <p className="text-sm-mobile text-gray-600">

            {deleteConfirm.type === 'section'

              ? `Удалить ${deleteConfirm.label}? Все дома, квартиры и задачи будут удалены.`

              : `Удалить ${deleteConfirm.label}? Все его квартиры и задачи будут удалены.`}

          </p>

          <div className="flex gap-2">

            <BigButton variant="ghost" size="md" fullWidth onClick={() => setDeleteConfirm(null)}>

              Отмена

            </BigButton>

            <BigButton variant="danger" size="md" fullWidth onClick={confirmDelete}>

              Удалить

            </BigButton>

          </div>

        </div>

      </div>

    )

  }



  if (done) {

    return (

      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 pb-24">

        <CheckCircle2 size={64} className="text-emerald-500 mb-4" />

        <h1 className="text-2xl-mobile font-bold text-gray-900 text-center">Объект создан!</h1>

        <div className="mt-6 w-full max-w-sm bg-white rounded-2xl border border-gray-100 p-4 space-y-2 text-sm-mobile">

          <p className="flex justify-between">

            <span>{pluralWithCount(summary.sections, PLURAL.section)}</span>

          </p>

          <p className="flex justify-between">

            <span>{pluralWithCount(summary.houses, PLURAL.house)}</span>

          </p>

          <p className="flex justify-between">

            <span>{pluralWithCount(summary.entrances, PLURAL.entrance)}</span>

          </p>

          <p className="flex justify-between">

            <span>{pluralWithCount(summary.floors, PLURAL.floor)}</span>

          </p>

          <p className="flex justify-between font-semibold">

            <span>{pluralWithCount(summary.apartments, PLURAL.apartment)}</span>

          </p>

          <p className="flex justify-between text-primary-600">

            <span>{pluralWithCount(summary.tasks, PLURAL.task)}</span>

          </p>

          {houseSummaries.length > 1 && (

            <div className="pt-2 mt-2 border-t border-gray-100 space-y-1">

              <p className="text-xs-mobile font-medium text-gray-500">По домам:</p>

              {houseSummaries.map((h) => (

                <p key={`${h.section}-${h.name}`} className="text-xs-mobile text-gray-700 flex justify-between">

                  <span>{h.name} · {h.section}</span>

                  <span>{pluralWithCount(h.apartments, PLURAL.apartment)}</span>

                </p>

              ))}

            </div>

          )}

        </div>

        {createdInviteCode && (
          <div className="mt-4 w-full max-w-sm">
            <ObjectInvitePanel objectId={createdId} objectName={name} canManage />
          </div>
        )}

        <div className="mt-6 w-full max-w-sm space-y-2">

          <BigButton variant="primary" size="lg" fullWidth onClick={() => navigate(`/client/${createdId}`)}>

            Открыть объект

          </BigButton>

          <BigButton variant="ghost" size="lg" fullWidth onClick={() => navigate('/objects')}>

            К списку объектов

          </BigButton>

        </div>

      </div>

    )

  }



  const renderStructureEditor = (ref: HouseRef) => {

    const { secIdx, houseIdx, house } = ref

    return (

      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

        <div className="flex items-center justify-between">

          <div>

            <p className="font-semibold text-gray-900">{house.name}</p>

            <p className="text-xs-mobile text-gray-500">{ref.sectionName}</p>

          </div>

          <button type="button" onClick={() => setEditingStructureId(null)} className="text-sm-mobile text-primary-600">

            К списку

          </button>

        </div>

        <div className="grid grid-cols-2 gap-3">

          <div>

            <label className="text-xs-mobile text-gray-500">{pluralWithCount(house.entrancesCount, PLURAL.entrance)}</label>

            <input

              type="number"

              min={1}

              value={house.entrancesCount}

              onChange={(e) => updateHouse(secIdx, houseIdx, { entrancesCount: Math.max(1, Number(e.target.value)) })}

              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

            />

          </div>

          <div>

            <label className="text-xs-mobile text-gray-500">{pluralWithCount(house.floorsPerEntrance, PLURAL.floor)} в подъезде</label>

            <input

              type="number"

              min={1}

              value={house.floorsPerEntrance}

              onChange={(e) => updateHouse(secIdx, houseIdx, { floorsPerEntrance: Math.max(1, Number(e.target.value)) })}

              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

            />

          </div>

        </div>

        <label className="flex items-center gap-2 text-sm-mobile">

          <input

            type="checkbox"

            checked={house.includeBasement}

            onChange={(e) => updateHouse(secIdx, houseIdx, { includeBasement: e.target.checked })}

            className="rounded border-gray-300 text-primary-600"

          />

          Добавить подвал (трубы, стяжка — без квартир)

        </label>

        <label className="flex items-center gap-2 text-sm-mobile">

          <input

            type="checkbox"

            checked={house.includeRoof}

            onChange={(e) => updateHouse(secIdx, houseIdx, { includeRoof: e.target.checked })}

            className="rounded border-gray-300 text-primary-600"

          />

          Добавить крышу

        </label>

        <p className="text-xs-mobile font-semibold text-gray-700 pt-2">Дополнительные зоны дома</p>

        {(
          [
            ['corridors', 'Коридоры на этажах'],
            ['stairwellsElevators', 'Лестницы и лифты'],
            ['facade', 'Фасад'],
            ['roofZone', 'Кровля'],
            ['engineering', 'Инженерные системы'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 text-sm-mobile">
            <input
              type="checkbox"
              checked={house.zoneOptions?.[key] ?? false}
              onChange={(e) =>
                updateHouse(secIdx, houseIdx, {
                  zoneOptions: { ...house.zoneOptions, [key]: e.target.checked },
                })
              }
              className="rounded border-gray-300 text-primary-600"
            />
            {label}
          </label>
        ))}

        <BigButton

          variant="primary"

          size="md"

          fullWidth

          onClick={() => {

            updateHouse(secIdx, houseIdx, { structureConfigured: true })

            setEditingStructureId(null)

            haptic('light')

          }}

        >

          Сохранить настройки дома

        </BigButton>

      </div>

    )

  }



  const renderApartmentsEditor = (ref: HouseRef) => {

    const { secIdx, houseIdx, house } = ref

    const counts = estimateHouseCounts(house)

    return (

      <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

        <div className="flex items-center justify-between">

          <div>

            <p className="font-semibold text-gray-900">{house.name}</p>

            <p className="text-xs-mobile text-gray-500">{ref.sectionName}</p>

          </div>

          <button type="button" onClick={() => setEditingApartmentsId(null)} className="text-sm-mobile text-primary-600">

            К списку

          </button>

        </div>

        <div className="grid grid-cols-2 gap-3">

          <div>

            <label className="text-xs-mobile text-gray-500">Квартир на этаже</label>

            <input

              type="number"

              min={1}

              value={house.apartmentsPerFloor}

              onChange={(e) => updateHouse(secIdx, houseIdx, { apartmentsPerFloor: Math.max(1, Number(e.target.value)) })}

              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

            />

          </div>

          <div>

            <label className="text-xs-mobile text-gray-500">Комнат по умолчанию</label>

            <select

              value={house.defaultRooms}

              onChange={(e) => updateHouse(secIdx, houseIdx, { defaultRooms: Number(e.target.value) })}

              className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

            >

              {APARTMENT_TYPE_OPTIONS.map((o) => (

                <option key={o.rooms} value={o.rooms}>{o.label}</option>

              ))}

            </select>

            <p className="text-[11px] text-gray-400 mt-1">Стартовое значение для всех квартир. Можно изменить у каждой отдельно.</p>

          </div>

        </div>

        <div>

          <label className="text-xs-mobile text-gray-500">Площадь по умолчанию (можно изменить позже), м²</label>

          <input

            type="number"

            min={1}

            value={house.apartmentArea}

            onChange={(e) => updateHouse(secIdx, houseIdx, { apartmentArea: Math.max(1, Number(e.target.value)) })}

            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

          />

          <p className="text-[11px] text-gray-400 mt-1">Используется для расчёта оплаты по объёму. Площадь можно задать отдельно для каждой квартиры.</p>

        </div>

        <div>

          <label className="text-xs-mobile text-gray-500">Шаблон работ</label>

          <select

            value={house.workTemplate}

            onChange={(e) => updateHouse(secIdx, houseIdx, { workTemplate: e.target.value as WorkTemplateId })}

            className="w-full mt-1 px-3 py-2 rounded-lg border border-gray-200 text-base-mobile"

          >

            {(Object.entries(WORK_TEMPLATES) as [WorkTemplateId, typeof WORK_TEMPLATES.rough][]).map(([k, v]) => (

              <option key={k} value={k}>{v.label}</option>

            ))}

          </select>

        </div>

        <p className="text-xs-mobile text-gray-500 bg-gray-50 rounded-lg p-2">

          В этом доме: {pluralWithCount(counts.apartments, PLURAL.apartment)}

        </p>

        <BigButton

          variant="primary"

          size="md"

          fullWidth

          onClick={() => {

            updateHouse(secIdx, houseIdx, { apartmentsConfigured: true })

            setEditingApartmentsId(null)

            haptic('light')

          }}

        >

          Сохранить квартиры дома

        </BigButton>

      </div>

    )

  }



  return (

    <div className="min-h-screen bg-gray-50 pb-24">

      {renderDeleteModal()}



      <div className="bg-white border-b sticky top-0 z-40">

        <div className="px-4 py-3 flex items-center gap-3">

          <button

            type="button"

            onClick={() => (step > 0 ? setStep(step - 1) : navigate(-1))}

            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100"

          >

            <ArrowLeft size={24} />

          </button>

          <div className="flex-1">

            <h1 className="text-lg-mobile font-bold">Конструктор объекта</h1>

            <p className="text-xs-mobile text-gray-500">Шаг {step + 1}/{STEPS.length}: {STEPS[step]}</p>

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

          <div className="space-y-4">

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

              <label className="text-sm-mobile font-medium text-gray-700">Название объекта</label>

              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="ЖК Солнечный" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" />

              <label className="text-sm-mobile font-medium text-gray-700">Адрес</label>

              <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="ул. Солнечная, 15" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" />

              <label className="text-sm-mobile font-medium text-gray-700">Общий бюджет (₽)</label>

              <input type="number" value={budget || ''} onChange={(e) => setBudget(Number(e.target.value))} placeholder="8500000" className="w-full min-h-[48px] px-4 rounded-xl border border-gray-200 text-base-mobile" />

            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800">Территория ЖК</p>
              <p className="text-xs-mobile text-gray-500">Отметьте, что есть на объекте</p>
              {(
                [
                  ['parking', 'Парковка'],
                  ['playground', 'Детская площадка'],
                  ['landscaping', 'Благоустройство'],
                  ['undergroundParking', 'Подземный паркинг'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm-mobile">
                  <input
                    type="checkbox"
                    checked={territoryOptions[key]}
                    onChange={(e) => setTerritoryOptions((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="rounded border-gray-300 text-primary-600"
                  />
                  {label}
                </label>
              ))}
            </div>

            <ChainModeSelector
              value={chainMode}
              onChange={setChainMode}
              reusable={inviteReusable}
              onReusableChange={setInviteReusable}
            />

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



        {step === 1 && (

          <div className="space-y-4">

            {sections.map((sec, si) => (

              <div key={sec.id} className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">

                <div className="flex items-center justify-between">

                  <div className="flex items-center gap-2">

                    <Layers size={18} className="text-primary-600" />

                    <input

                      value={sec.name}

                      onChange={(e) => setSections((prev) => prev.map((s, i) => (i === si ? { ...s, name: e.target.value } : s)))}

                      className="font-semibold text-base-mobile border-b border-transparent focus:border-primary-300 outline-none"

                    />

                  </div>

                  {sections.length > 1 && (

                    <button

                      type="button"

                      onClick={() => setDeleteConfirm({ type: 'section', secIdx: si, label: sec.name })}

                      className="text-red-500 p-2"

                      aria-label="Удалить секцию"

                    >

                      <Trash2 size={16} />

                    </button>

                  )}

                </div>

                {sec.houses.map((house, hi) => (

                  <div key={house.id} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">

                    <Building2 size={16} className="text-gray-400 shrink-0" />

                    <span className="flex-1 text-sm-mobile font-medium text-gray-900">{house.name}</span>

                    {sec.houses.length > 1 && (

                      <button

                        type="button"

                        onClick={() => setDeleteConfirm({ type: 'house', secIdx: si, houseIdx: hi, label: house.name })}

                        className="text-red-400 p-1"

                        aria-label="Удалить дом"

                      >

                        <Trash2 size={14} />

                      </button>

                    )}

                  </div>

                ))}

                <button

                  type="button"

                  onClick={() =>

                    setSections((prev) =>

                      renumberHouses(

                        prev.map((s, i) =>

                          i === si ? { ...s, houses: [...s.houses, newHouse(s.houses.length + 1)] } : s,

                        ),

                      ),

                    )

                  }

                  className="text-sm-mobile text-primary-600 flex items-center gap-1"

                >

                  <Plus size={14} />

                  Добавить дом

                </button>

              </div>

            ))}

            <BigButton

              variant="secondary"

              size="sm"

              fullWidth

              icon={<Plus size={16} />}

              onClick={() => setSections((prev) => [...prev, newSection(prev.length + 1)])}

            >

              Добавить секцию

            </BigButton>

          </div>

        )}



        {step === 2 && (

          <div className="space-y-4">

            <p className="text-sm-mobile text-gray-600">

              Настройте каждый дом отдельно — подъезды и этажи могут отличаться.

            </p>

            {editingStructureId ? (

              (() => {

                const ref = findHouseRef(editingStructureId)

                return ref ? renderStructureEditor(ref) : null

              })()

            ) : (

              <div className="space-y-2">

                {allHouses.map(({ house, sectionName }) => {

                  const counts = estimateHouseCounts(house)

                  return (

                    <button

                      key={house.id}

                      type="button"

                      onClick={() => setEditingStructureId(house.id)}

                      className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 text-left"

                    >

                      {house.structureConfigured ? (

                        <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />

                      ) : (

                        <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />

                      )}

                      <div className="flex-1 min-w-0">

                        <p className="font-semibold text-gray-900">{house.name}</p>

                        <p className="text-xs-mobile text-gray-500 truncate">{sectionName}</p>

                        {house.structureConfigured && (

                          <p className="text-xs-mobile text-gray-600 mt-0.5">

                            {pluralWithCount(counts.entrances, PLURAL.entrance)} · {pluralWithCount(house.floorsPerEntrance, PLURAL.floor)}

                          </p>

                        )}

                      </div>

                      <ChevronRight size={18} className="text-gray-300 shrink-0" />

                    </button>

                  )

                })}

              </div>

            )}

            {!editingStructureId && preview.basementZones > 0 && (

              <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 text-sm-mobile text-primary-800">

                Подвал: {pluralWithCount(preview.basementZones, PLURAL.basement)} — инженерия без квартир

              </div>

            )}

          </div>

        )}



        {step === 3 && (

          <div className="space-y-4">

            <p className="text-sm-mobile text-gray-600">

              У каждого дома свои квартиры: количество, площадь и шаблон работ.

            </p>

            {editingApartmentsId ? (

              (() => {

                const ref = findHouseRef(editingApartmentsId)

                return ref ? renderApartmentsEditor(ref) : null

              })()

            ) : (

              <div className="space-y-2">

                {allHouses.map(({ house, sectionName }) => (

                  <button

                    key={house.id}

                    type="button"

                    onClick={() => setEditingApartmentsId(house.id)}

                    className="w-full bg-white rounded-2xl p-4 border border-gray-100 flex items-center gap-3 text-left"

                  >

                    {house.apartmentsConfigured ? (

                      <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />

                    ) : (

                      <div className="w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />

                    )}

                    <div className="flex-1 min-w-0">

                      <p className="font-semibold text-gray-900">{house.name}</p>

                      <p className="text-xs-mobile text-gray-500 truncate">{sectionName}</p>

                      {house.apartmentsConfigured && (

                        <p className="text-xs-mobile text-gray-600 mt-0.5">

                          {house.apartmentsPerFloor} на этаж · {formatApartmentType(house.defaultRooms) ?? '—'} · {house.apartmentArea} м²

                        </p>

                      )}

                    </div>

                    <ChevronRight size={18} className="text-gray-300 shrink-0" />

                  </button>

                ))}

              </div>

            )}



            <div className="bg-white rounded-2xl p-4 border border-gray-100">

              <h3 className="text-base-mobile font-semibold mb-3 flex items-center gap-2">

                <Sparkles size={18} className="text-amber-500" />

                Будет создано

              </h3>

              <div className="grid grid-cols-2 gap-2 text-sm-mobile">

                <p>{pluralWithCount(preview.sections, PLURAL.section)}</p>

                <p>{pluralWithCount(preview.houses, PLURAL.house)}</p>

                <p>{pluralWithCount(preview.entrances, PLURAL.entrance)}</p>

                <p>{pluralWithCount(preview.floors, PLURAL.floor)}</p>

                <p className="col-span-2 font-semibold text-primary-600">

                  {pluralWithCount(preview.apartments, PLURAL.apartment)}

                </p>

                {preview.basementZones > 0 && (

                  <p className="col-span-2 text-slate-600">

                    {pluralWithCount(preview.basementZones, PLURAL.basement)} — только инженерия

                  </p>

                )}

                {preview.zones > 0 && (

                  <p className="col-span-2 text-emerald-700">

                    {preview.zones} {preview.zones === 1 ? 'зона' : preview.zones < 5 ? 'зоны' : 'зон'} (коридоры, фасад, территория…)

                  </p>

                )}

              </div>

            </div>

          </div>

        )}



        <div className="flex gap-3">

          {step < STEPS.length - 1 ? (

            <BigButton

              variant="primary"

              size="lg"

              fullWidth

              onClick={() => {

                if (step === 2 && allHouses.some((h) => !h.house.structureConfigured)) {

                  toast.error('Настройте все дома на этом шаге')

                  return

                }

                setStep(step + 1)

              }}

              disabled={step === 0 && (!name.trim() || !address.trim())}

            >

              Далее

            </BigButton>

          ) : (

            <BigButton variant="primary" size="lg" fullWidth isLoading={isSaving} icon={<Sparkles size={18} />} onClick={handleGenerate}>

              Сгенерировать объект

            </BigButton>

          )}

        </div>

      </div>

    </div>

  )

}


