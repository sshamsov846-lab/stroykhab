import React, { useState, useMemo } from 'react'

import { useNavigate } from 'react-router-dom'

import { ArrowLeft, Plus, Trash2, Sparkles, CheckCircle2, Layers, Building2, ChevronRight, Calendar, User, Phone, MapPin } from 'lucide-react'

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

import {
  OBJECT_TYPE_OPTIONS,
  WORK_SCOPE_OPTIONS,
  INDIVIDUAL_WORK_OPTIONS,
  OBJECT_TYPE_PRESETS,
  calcProjectDays,
  type ObjectWizardType,
  type ObjectWorkScopeMode,
  type ObjectWizardMeta,
} from '@/types/objectWizard'
import type { WorkType } from '@types'
import { buildSectionsForObjectType, applyWorkTemplateToSections } from '@utils/objectWizardPresets'
import { ObjectPhotosUpload } from '@components/object/ObjectPhotosUpload'
import { ProjectUploadBlock, type StructureInputMode } from '@components/object/ProjectUploadBlock'
import { ProjectStructureSummary } from '@components/object/ProjectStructureSummary'
import { useObjectDocumentStore } from '@store/objectDocumentStore'
import { workTemplateFromScope } from '@/types/objectWizard'
import type { ExcelApartmentRow, ExcelProjectPreview, PendingProjectAttachment, ExcelProjectSummary } from '@/types/projectExcel'



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
  const uploadDocument = useObjectDocumentStore((s) => s.uploadDocument)
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

  const [objectType, setObjectType] = useState<ObjectWizardType>('novostroyka')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [description, setDescription] = useState('')
  const [photoUrls, setPhotoUrls] = useState<string[]>([])
  const [workScopeMode, setWorkScopeMode] = useState<ObjectWorkScopeMode>('rough')
  const [selectedWorkTypes, setSelectedWorkTypes] = useState<WorkType[]>([])
  const [siteContactName, setSiteContactName] = useState('')
  const [siteContactPhone, setSiteContactPhone] = useState('')

  const [editingApartmentsId, setEditingApartmentsId] = useState<string | null>(null)

  const [structureInputMode, setStructureInputMode] = useState<StructureInputMode>('manual')
  const [excelApplied, setExcelApplied] = useState(false)
  const [excelRows, setExcelRows] = useState<ExcelApartmentRow[]>([])
  const [excelPreview, setExcelPreview] = useState<ExcelProjectPreview | null>(null)
  const [excelFileName, setExcelFileName] = useState('')
  const [projectAttachments, setProjectAttachments] = useState<PendingProjectAttachment[]>([])
  const [plotAreaSotkas, setPlotAreaSotkas] = useState<number>(0)

  const typePreset = OBJECT_TYPE_PRESETS[objectType]
  const projectDays = useMemo(() => calcProjectDays(startDate, endDate), [startDate, endDate])

  const wizardMeta = useMemo<ObjectWizardMeta>(
    () => ({
      objectType,
      description: description.trim(),
      photoUrls,
      startDate,
      endDate,
      workScopeMode,
      selectedWorkTypes,
      siteContactName: siteContactName.trim(),
      siteContactPhone: siteContactPhone.trim(),
      plotAreaSotkas: plotAreaSotkas > 0 ? plotAreaSotkas : undefined,
    }),
    [objectType, description, photoUrls, startDate, endDate, workScopeMode, selectedWorkTypes, siteContactName, siteContactPhone, plotAreaSotkas],
  )

  const applyObjectType = (type: ObjectWizardType) => {
    setObjectType(type)
    const preset = OBJECT_TYPE_PRESETS[type]
    setTerritoryOptions({ ...preset.territoryOptions })
    setSections(buildSectionsForObjectType(type, workScopeMode))
  }

  const toggleWorkType = (wt: WorkType) => {
    setSelectedWorkTypes((prev) =>
      prev.includes(wt) ? prev.filter((t) => t !== wt) : [...prev, wt],
    )
  }

  const goNextFromBase = () => {
    if (startDate && endDate && projectDays === null) {
      toast.error('Дата сдачи должна быть не раньше даты начала')
      return
    }
    if (workScopeMode === 'custom' && selectedWorkTypes.length === 0) {
      toast.error('Выберите хотя бы один вид работ')
      return
    }
    setSections((prev) => applyWorkTemplateToSections(prev, workScopeMode, objectType))
    setStep(1)
  }



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

    const notReady = structureInputMode === 'manual'
      ? allHouses.filter((h) => !h.house.structureConfigured || !h.house.apartmentsConfigured)
      : excelApplied ? [] : [{ house: { structureConfigured: false } as WizardHouseDraft }]

    if (structureInputMode === 'excel' && !excelApplied) {
      toast.error('Загрузите Excel и подтвердите создание зон')
      return
    }

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

        start_date: startDate || undefined,

        end_date: endDate || undefined,

        photo_url: photoUrls[0],

        photo_urls: photoUrls.length ? photoUrls : undefined,

        object_type: objectType,

        description: description.trim() || undefined,

        site_contact_name: siteContactName.trim() || undefined,

        site_contact_phone: siteContactPhone.trim() || undefined,

        work_scope_mode: workScopeMode,

        selected_work_types: workScopeMode === 'custom' ? selectedWorkTypes : undefined,

        client_name: siteContactName.trim() || undefined,

        client_phone: siteContactPhone.trim() || undefined,

      })



      const { structure, importRows } = generateObjectStructure(obj.id, sections, {

        apartmentsPerFloor: 4,

        workTemplate: sections[0]?.houses[0]?.workTemplate ?? 'rough',

      }, territoryOptions, excelApplied && excelRows.length ? { excelRows } : undefined)

      structure.wizardMeta = wizardMeta

      if (excelApplied && excelPreview) {
        const excelSummary: ExcelProjectSummary = {
          ...excelPreview,
          sourceFileName: excelFileName,
          importedAt: new Date().toISOString(),
        }
        structure.excelImport = { rows: excelRows, summary: excelSummary }
      }

      registerObject(obj, orgs, { kind: 'building', housesCount: structure.summary.houses, wizard: wizardMeta })
      const { fullName, phone, role } = useUserStore.getState()
      setMaterialPaymentSettings(obj.id, {
        policy: materialPolicy,
        reimbursementSource,
      }, fullName)
      syncContractors(orgs)

      saveCustomStructure(structure)

      importHierarchy(obj.id, importRows)

      const { fullName: uploaderName, role: uploaderRole } = useUserStore.getState()

      if (excelApplied && excelFileName) {
        const excelAtt = projectAttachments.find((a) => a.kind === 'excel')
        const excelUrl = excelAtt?.fileUrl
        if (excelUrl) {
          uploadDocument({
            objectId: obj.id,
            title: 'Проект объекта (Excel)',
            category: 'project',
            description: 'Исходный файл Excel с квартирами',
            access: 'all',
            fileName: excelFileName,
            fileUrl: excelUrl,
            mimeType: excelAtt?.mimeType ?? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            fileSize: excelAtt?.fileSize ?? 0,
            uploadedBy: uploaderName,
            uploadedByRole: uploaderRole,
          })
        }
      }

      for (const att of projectAttachments.filter((a) => a.kind === 'attachment')) {
        uploadDocument({
          objectId: obj.id,
          title: att.fileName,
          category: att.mimeType === 'application/pdf' ? 'blueprints' : 'project',
          description: att.description ?? 'Проект объекта (смотреть прорабу)',
          access: 'all',
          fileName: att.fileName,
          fileUrl: att.fileUrl,
          mimeType: att.mimeType,
          fileSize: att.fileSize,
          uploadedBy: uploaderName,
          uploadedByRole: uploaderRole,
        })
      }

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



  const projectUploadSection = (
    <>
      <ProjectUploadBlock
        mode={structureInputMode}
        onModeChange={(m) => {
          setStructureInputMode(m)
          if (m === 'manual') {
            setExcelApplied(false)
            setExcelRows([])
            setExcelPreview(null)
          }
        }}
        excelApplied={excelApplied}
        excelPreview={excelPreview}
        excelFileName={excelFileName}
        attachments={projectAttachments.filter((a) => a.kind === 'attachment')}
        workTemplate={workTemplateFromScope(workScopeMode)}
        zoneOptions={typePreset.zoneOptions}
        onExcelApplied={({ rows, preview, fileName, fileUrl, mimeType, fileSize, sections: newSections }) => {
          setExcelRows(rows)
          setExcelPreview(preview)
          setExcelFileName(fileName)
          setExcelApplied(true)
          setSections(newSections)
          setProjectAttachments((prev) => [
            ...prev.filter((a) => a.kind !== 'excel'),
            {
              id: `excel-${Date.now()}`,
              fileName,
              fileUrl,
              mimeType,
              fileSize,
              kind: 'excel',
            },
          ])
        }}
        onExcelCleared={() => {
          setExcelApplied(false)
          setExcelRows([])
          setExcelPreview(null)
          setExcelFileName('')
          setProjectAttachments((prev) => prev.filter((a) => a.kind !== 'excel'))
          setSections(buildSectionsForObjectType(objectType, workScopeMode))
        }}
        onAttachmentAdded={(file) => setProjectAttachments((prev) => [...prev, file])}
        onAttachmentRemoved={(id) => setProjectAttachments((prev) => prev.filter((a) => a.id !== id))}
      />
      <ProjectStructureSummary
        preview={excelPreview}
        plotAreaSotkas={plotAreaSotkas}
        excelApplied={excelApplied}
      />
    </>
  )



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
              <p className="text-sm-mobile font-semibold text-gray-800">Тип объекта</p>
              <p className="text-xs-mobile text-gray-500">Влияет на зоны и структуру на следующих шагах</p>
              <div className="space-y-2">
                {OBJECT_TYPE_OPTIONS.map((opt) => {
                  const selected = objectType === opt.id
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => { haptic('selection'); applyObjectType(opt.id) }}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        selected ? 'border-primary-500 bg-primary-50' : 'border-gray-100 bg-gray-50'
                      }`}
                    >
                      <p className="text-sm-mobile font-semibold text-gray-900">{opt.title}</p>
                      <p className="text-xs-mobile text-gray-500 mt-0.5">{opt.desc}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800 flex items-center gap-2">
                <Calendar size={16} className="text-primary-600" />
                Сроки
              </p>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="text-xs-mobile font-medium text-gray-600">Дата начала работ</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                  />
                </div>
                <div>
                  <label className="text-xs-mobile font-medium text-gray-600">Планируемая дата сдачи</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                  />
                </div>
              </div>
              {projectDays != null && (
                <p className="text-sm-mobile text-primary-700 bg-primary-50 rounded-xl px-3 py-2">
                  На объект: <span className="font-bold">{projectDays}</span> {projectDays === 1 ? 'день' : projectDays < 5 ? 'дня' : 'дней'}
                </p>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800 flex items-center gap-2">
                <MapPin size={16} className="text-primary-600" />
                Фото объекта
              </p>
              <ObjectPhotosUpload value={photoUrls} onChange={setPhotoUrls} />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <label className="text-sm-mobile font-semibold text-gray-800">Описание / Особенности</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Пожелания, особенности участка, ограничения по шуму, доступ на объект..."
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-base-mobile resize-none"
              />
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800">Что нужно сделать</p>
              <div className="space-y-2">
                {WORK_SCOPE_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                      workScopeMode === opt.id ? 'border-primary-500 bg-primary-50' : 'border-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      name="workScope"
                      checked={workScopeMode === opt.id}
                      onChange={() => setWorkScopeMode(opt.id)}
                      className="mt-1 text-primary-600"
                    />
                    <div>
                      <p className="text-sm-mobile font-medium text-gray-900">{opt.label}</p>
                      <p className="text-xs-mobile text-gray-500">{opt.hint}</p>
                    </div>
                  </label>
                ))}
              </div>
              {workScopeMode === 'custom' && (
                <div className="pt-2 border-t border-gray-100 space-y-2">
                  <p className="text-xs-mobile font-medium text-gray-600">Отдельные виды работ</p>
                  <div className="grid grid-cols-2 gap-2">
                    {INDIVIDUAL_WORK_OPTIONS.map((wt) => (
                      <label key={wt.id} className="flex items-center gap-2 text-sm-mobile">
                        <input
                          type="checkbox"
                          checked={selectedWorkTypes.includes(wt.id)}
                          onChange={() => toggleWorkType(wt.id)}
                          className="rounded border-gray-300 text-primary-600"
                        />
                        {wt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800">Контакт на объекте</p>
              <div>
                <label className="text-xs-mobile font-medium text-gray-600 flex items-center gap-1">
                  <User size={12} /> Имя ответственного
                </label>
                <input
                  value={siteContactName}
                  onChange={(e) => setSiteContactName(e.target.value)}
                  placeholder="Иванов И.И."
                  className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                />
              </div>
              <div>
                <label className="text-xs-mobile font-medium text-gray-600 flex items-center gap-1">
                  <Phone size={12} /> Телефон для связи
                </label>
                <input
                  type="tel"
                  value={siteContactPhone}
                  onChange={(e) => setSiteContactPhone(e.target.value)}
                  placeholder="+7 (999) 123-45-67"
                  className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                />
              </div>
            </div>

            {typePreset.showTerritoryBlock && (
            <div className="bg-white rounded-2xl p-4 border border-gray-100 space-y-3">
              <p className="text-sm-mobile font-semibold text-gray-800">Территория</p>
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
              <div className="pt-2 border-t border-gray-100">
                <label className="text-xs-mobile text-gray-500">Площадь участка (сотки), если есть</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={plotAreaSotkas || ''}
                  onChange={(e) => setPlotAreaSotkas(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="Напр. 12"
                  className="mt-1 w-full min-h-[44px] px-4 rounded-xl border border-gray-200 text-base-mobile"
                />
              </div>
            </div>
            )}

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

            {projectUploadSection}

            {(structureInputMode === 'manual' || excelApplied) && (
            <>
            {!typePreset.showMultiSection && structureInputMode === 'manual' && (
              <p className="text-sm-mobile text-gray-600 bg-primary-50 border border-primary-100 rounded-xl px-3 py-2">
                Для типа «{OBJECT_TYPE_OPTIONS.find((o) => o.id === objectType)?.title}» — одна единица. При необходимости уточните параметры на следующих шагах.
              </p>
            )}

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

                  {sections.length > 1 && typePreset.showMultiSection && (

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

                    {sec.houses.length > 1 && typePreset.showMultiSection && (

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

                {typePreset.showMultiSection && (
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
                )}

              </div>

            ))}

            {typePreset.showMultiSection && (
            <BigButton

              variant="secondary"

              size="sm"

              fullWidth

              icon={<Plus size={16} />}

              onClick={() => setSections((prev) => [...prev, newSection(prev.length + 1)])}

            >

              Добавить секцию

            </BigButton>
            )}

            </>
            )}

          </div>

        )}



        {step === 2 && (

          <div className="space-y-4">

            <p className="text-sm-mobile text-gray-600">
              {excelApplied
                ? 'Структура из Excel. При необходимости уточните подъезды и этажи.'
                : 'Настройте каждый дом отдельно — подъезды и этажи могут отличаться.'}
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

            {!editingStructureId && preview.basementZones > 0 && structureInputMode === 'manual' && (

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

                if (step === 0) {
                  goNextFromBase()
                  return
                }

                if (step === 1 && structureInputMode === 'excel' && !excelApplied) {
                  toast.error('Загрузите Excel и нажмите «Создать зоны из Excel»')
                  return
                }

                if (step === 2) {
                  if (structureInputMode === 'excel' && !excelApplied) {
                    toast.error('Загрузите Excel и подтвердите создание зон')
                    return
                  }
                  if (structureInputMode === 'manual' && allHouses.some((h) => !h.house.structureConfigured)) {
                    toast.error('Настройте все дома на этом шаге')
                    return
                  }
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


