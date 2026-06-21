import React, { useMemo, useState } from 'react'

import { useNavigate } from 'react-router-dom'

import {

  Package,

  Warehouse,

  AlertTriangle,

  ChevronRight,

  Minus,

  Receipt,

  Settings2,

} from 'lucide-react'

import toast from 'react-hot-toast'

import { useUserStore } from '@store/userStore'

import { useMaterialStore } from '@store/materialStore'

import { useObjectStore } from '@store/objectStore'

import { getObjects } from '@api/supabase'

import { filterObjectsForRole } from '@utils/sideJob'

import { NotificationBell } from '@components/NotificationBell'

import { MaterialDeliveryModal } from '@components/materials/MaterialDeliveryModal'

import { MaterialSpendSummaryPanel } from '@components/materials/MaterialSpendSummaryPanel'

import { MaterialReimbursementPanel } from '@components/materials/MaterialReimbursementPanel'

import { MaterialObjectSettingsPanel } from '@components/materials/MaterialObjectSettingsPanel'

import {

  URGENCY_LABELS,

  REQUEST_STATUS_LABELS,

  PAID_BY_LABELS,

  REIMBURSEMENT_STATUS_LABELS,

  type WorkflowMaterialRequest,

} from '@/types/materials'

import { PAYMENT_POLICY_LABELS } from '@utils/materialPayment'

import type { ConstructionObject } from '@types'

import type { AppRole } from '@store/userStore'



type Tab = 'requests' | 'stock' | 'problems' | 'expenses' | 'reimbursements' | 'settings'



function formatDowntime(ms: number): string {

  const h = Math.floor(ms / 3600000)

  const m = Math.floor((ms % 3600000) / 60000)

  if (h > 0) return `${h} ч ${m} мин`

  return `${m} мин`

}



export const MaterialsPage: React.FC = () => {

  const navigate = useNavigate()

  const role = useUserStore((s) => s.role)

  const fullName = useUserStore((s) => s.fullName)



  const allRequests = useMaterialStore((s) => s.requests)

  const stock = useMaterialStore((s) => s.stock)

  const writeOffs = useMaterialStore((s) => s.writeOffs)

  const activeWaits = useMaterialStore((s) => s.getActiveWaits())

  const getDowntimeMs = useMaterialStore((s) => s.getDowntimeMs)

  const getObjectSpendSummary = useMaterialStore((s) => s.getObjectSpendSummary)

  const getTotalMaterialSpend = useMaterialStore((s) => s.getTotalMaterialSpend)

  const getMaterialSpendByObject = useMaterialStore((s) => s.getMaterialSpendByObject)

  const getPendingReimbursements = useMaterialStore((s) => s.getPendingReimbursements)

  const getForemanReimbursementBalance = useMaterialStore((s) => s.getForemanReimbursementBalance)
  const objectPaymentSettings = useMaterialStore((s) => s.objectPaymentSettings)
  const writeOff = useMaterialStore((s) => s.writeOff)



  const userObjects = useObjectStore((s) => s.userObjects)



  const [objects, setObjects] = useState<ConstructionObject[]>([])

  const [objectId, setObjectId] = useState('')

  const [tab, setTab] = useState<Tab>(role === 'client' ? 'expenses' : 'requests')

  const [deliveryRequest, setDeliveryRequest] = useState<WorkflowMaterialRequest | null>(null)

  const [writeOffItemId, setWriteOffItemId] = useState<string | null>(null)

  const [writeOffQty, setWriteOffQty] = useState('1')



  React.useEffect(() => {

    getObjects().then((data) => {

      const visible = filterObjectsForRole(data, role as AppRole)

      setObjects(visible)

      if (visible[0]) setObjectId(visible[0].id)

    })

  }, [role])



  const objectName = (id: string) =>

    objects.find((o) => o.id === id)?.name ?? userObjects.find((o) => o.id === id)?.name ?? id



  const filteredRequests = useMemo(() => {

    let list = objectId ? allRequests.filter((r) => r.objectId === objectId) : allRequests

    if (role === 'worker') {

      list = list.filter((r) => r.requestedBy === fullName || r.requestedBy.includes(fullName.split(' ')[0]))

    }

    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))

  }, [allRequests, objectId, role, fullName])



  const objectStock = useMemo(

    () => (objectId ? stock.filter((s) => s.objectId === objectId && s.quantity > 0) : stock.filter((s) => s.quantity > 0)),

    [stock, objectId],

  )



  const objectWaits = useMemo(

    () => (objectId ? activeWaits.filter((w) => w.objectId === objectId) : activeWaits),

    [activeWaits, objectId],

  )



  const spendSummary = objectId

    ? getObjectSpendSummary(objectId)

    : {

        totalDelivered: getTotalMaterialSpend(),

        byPayer: {

          client: getTotalMaterialSpend('client'),

          organization: getTotalMaterialSpend('organization'),

          foreman: getTotalMaterialSpend('foreman'),

        },

        pendingReimbursement: 0,

        approvedReimbursement: 0,

        foremanPurchased: 0,

      }



  const foremanBalance = role === 'foreman'

    ? getForemanReimbursementBalance(fullName, objectId || undefined)

    : undefined



  const pendingReimburseFrom = role === 'client' ? 'client' as const

    : role === 'subcontractor' ? 'organization' as const

      : undefined



  const pendingReimbursements = getPendingReimbursements(

    objectId || undefined,

    pendingReimburseFrom,

  )



  const reimbursementRequests = useMemo(() => {

    if (role === 'foreman') {

      return allRequests.filter(

        (r) =>

          r.reimbursement &&

          (r.purchasedBy?.includes(fullName) || r.deliveredBy?.includes(fullName)) &&

          (objectId ? r.objectId === objectId : true),

      )

    }

    if (role === 'client') {

      return getPendingReimbursements(objectId || undefined, 'client')

    }

    if (role === 'subcontractor') {

      return allRequests.filter(

        (r) =>

          r.reimbursement &&

          (objectId ? r.objectId === objectId : true),

      )

    }

    return []

  }, [allRequests, role, fullName, objectId, getPendingReimbursements])



  const tabs: { id: Tab; label: string; icon: typeof Package }[] =

    role === 'client'

      ? [

          { id: 'expenses', label: 'Расходы', icon: Package },

          { id: 'reimbursements', label: 'Возмещения', icon: Receipt },

        ]

      : role === 'foreman'

        ? [

            { id: 'requests', label: 'Заявки', icon: Package },

            { id: 'stock', label: 'Склад', icon: Warehouse },

            { id: 'problems', label: 'Простои', icon: AlertTriangle },

            { id: 'reimbursements', label: 'Возмещения', icon: Receipt },

            { id: 'settings', label: 'Оплата', icon: Settings2 },

          ]

        : role === 'subcontractor'

          ? [

              { id: 'requests', label: 'Заявки', icon: Package },

              { id: 'stock', label: 'Привезено', icon: Warehouse },

              { id: 'expenses', label: 'Расходы', icon: Receipt },

              { id: 'reimbursements', label: 'Возмещения', icon: Receipt },

              { id: 'settings', label: 'Оплата', icon: Settings2 },

            ]

          : [

              { id: 'requests', label: 'Заявки', icon: Package },

              { id: 'stock', label: 'Привезено', icon: Warehouse },

            ]



  const pendingCount = filteredRequests.filter((r) => r.status === 'pending').length



  const handleWriteOff = (stockId: string, objId: string, stockName: string) => {

    const qty = Number(writeOffQty)

    if (!qty || qty <= 0) {

      toast.error('Укажите количество')

      return

    }

    const ok = writeOff({

      stockItemId: stockId,

      objectId: objId,

      quantity: qty,

      writtenBy: fullName,

      note: `Списание: ${stockName}`,

    })

    if (!ok) {

      toast.error('Недостаточно на складе')

      return

    }

    toast.success('Списано')

    setWriteOffItemId(null)

    setWriteOffQty('1')

  }



  const canManageDelivery = role === 'foreman' || role === 'subcontractor'

  const canApproveReimburse = role === 'client' || role === 'subcontractor'

  const canEditSettings = role === 'client' || role === 'foreman' || role === 'subcontractor'



  return (

    <div className="pb-24 min-h-screen bg-gray-50">

      <div className="bg-white border-b px-4 py-4 sticky top-0 z-30">

        <div className="flex items-start justify-between gap-2">

          <div>

            <h1 className="text-xl-mobile font-bold text-gray-900">Материалы</h1>

            <p className="text-sm-mobile text-gray-500">

              {role === 'client' ? 'Расходы и возмещения' : 'Заявки, склад и оплата'}

            </p>

          </div>

          <NotificationBell />

        </div>



        {objects.length > 0 && (

          <select

            value={objectId}

            onChange={(e) => setObjectId(e.target.value)}

            className="mt-3 w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm-mobile"

          >

            {objects.map((o) => (

              <option key={o.id} value={o.id}>{o.name}</option>

            ))}

          </select>

        )}



        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">

          {tabs.map((t) => (

            <button

              key={t.id}

              type="button"

              onClick={() => setTab(t.id)}

              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm-mobile font-medium whitespace-nowrap ${

                tab === t.id ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'

              }`}

            >

              <t.icon size={16} />

              {t.label}

              {t.id === 'requests' && pendingCount > 0 && (

                <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{pendingCount}</span>

              )}

              {t.id === 'problems' && objectWaits.length > 0 && (

                <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{objectWaits.length}</span>

              )}

              {t.id === 'reimbursements' && pendingReimbursements.length > 0 && canApproveReimburse && (

                <span className="bg-amber-500 text-white text-[10px] px-1.5 rounded-full">{pendingReimbursements.length}</span>

              )}

            </button>

          ))}

        </div>

      </div>



      <div className="p-4 space-y-4">

        {(tab === 'expenses' || tab === 'requests' || tab === 'reimbursements') && (

          <MaterialSpendSummaryPanel

            role={role}

            summary={spendSummary}

            foremanBalance={foremanBalance}

            pendingReimburseCount={pendingReimbursements.length}

          />

        )}



        {tab === 'settings' && objectId && (

          <MaterialObjectSettingsPanel objectId={objectId} canEdit={canEditSettings} />

        )}



        {tab === 'reimbursements' && (

          <MaterialReimbursementPanel

            requests={reimbursementRequests}

            objectName={objectName}

            canApprove={canApproveReimburse}

          />

        )}



        {tab === 'requests' && (

          <>

            {filteredRequests.length === 0 ? (

              <p className="text-sm-mobile text-gray-500 text-center py-12">

                {role === 'worker' ? 'Нет заявок. Создайте на экране задачи.' : 'Заявок пока нет'}

              </p>

            ) : (

              filteredRequests.map((r) => (

                <div key={r.id} className="bg-white rounded-xl p-4 border border-gray-100">

                  <div className="flex items-start justify-between gap-2">

                    <div>

                      <p className="text-sm-mobile font-semibold text-gray-900">

                        {r.name} — {r.quantity} {r.unit}

                      </p>

                      <p className="text-xs-mobile text-gray-500 mt-0.5">{r.taskTitle}</p>

                      <p className="text-xs-mobile text-gray-400">

                        {r.requestedBy} · {URGENCY_LABELS[r.urgency]}

                      </p>

                      {r.paymentPayer && (

                        <p className="text-xs-mobile text-primary-600 mt-0.5">

                          Платит: {PAID_BY_LABELS[r.paymentPayer]}

                        </p>

                      )}

                    </div>

                    <span className={`text-xs-mobile px-2 py-0.5 rounded-full shrink-0 ${

                      r.status === 'pending' ? 'bg-amber-100 text-amber-800'

                        : r.status === 'ordered' ? 'bg-blue-100 text-blue-800'

                          : r.status === 'delivered' ? 'bg-emerald-100 text-emerald-800'

                            : 'bg-gray-100 text-gray-600'

                    }`}>

                      {REQUEST_STATUS_LABELS[r.status]}

                    </span>

                  </div>

                  {r.status === 'delivered' && r.price != null && (

                    <div className="text-xs-mobile text-gray-600 mt-2 space-y-0.5">

                      <p>{r.price.toLocaleString('ru-RU')} ₽ · платит {r.paymentPayer ? PAID_BY_LABELS[r.paymentPayer] : '—'}</p>

                      {r.purchasedBy && <p>Купил: {r.purchasedBy}</p>}

                      {r.reimbursement && (

                        <p className="text-amber-700">{REIMBURSEMENT_STATUS_LABELS[r.reimbursement.status]}</p>

                      )}

                    </div>

                  )}

                  {canManageDelivery && r.status !== 'delivered' && r.status !== 'cancelled' && (

                    <button

                      type="button"

                      onClick={() => setDeliveryRequest(r)}

                      className="mt-3 text-sm-mobile text-primary-600 font-medium flex items-center gap-1"

                    >

                      Управлять поставкой <ChevronRight size={16} />

                    </button>

                  )}

                  <button

                    type="button"

                    onClick={() => navigate(`/workflow/${r.taskId}`)}

                    className="mt-1 text-xs-mobile text-gray-400"

                  >

                    Открыть задачу →

                  </button>

                </div>

              ))

            )}

          </>

        )}



        {tab === 'stock' && (

          <>

            {objectStock.length === 0 ? (

              <p className="text-sm-mobile text-gray-500 text-center py-12">Склад пуст</p>

            ) : (

              objectStock.map((item) => (

                <div key={item.id} className="bg-white rounded-xl p-4 border border-gray-100">

                  <div className="flex items-center justify-between">

                    <div>

                      <p className="text-sm-mobile font-semibold text-gray-900">{item.name}</p>

                      <p className="text-lg-mobile font-bold text-primary-700 mt-0.5">

                        {item.quantity} {item.unit}

                      </p>

                      <p className="text-xs-mobile text-gray-400">{objectName(item.objectId)}</p>

                    </div>

                    {role === 'foreman' && (

                      <button

                        type="button"

                        onClick={() => setWriteOffItemId(item.id)}

                        className="p-2 rounded-lg bg-gray-100 text-gray-600"

                        aria-label="Списать"

                      >

                        <Minus size={20} />

                      </button>

                    )}

                  </div>

                  {writeOffItemId === item.id && (

                    <div className="mt-3 flex gap-2">

                      <input

                        type="number"

                        value={writeOffQty}

                        onChange={(e) => setWriteOffQty(e.target.value)}

                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm-mobile"

                      />

                      <button

                        type="button"

                        onClick={() => handleWriteOff(item.id, item.objectId, item.name)}

                        className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm-mobile"

                      >

                        Списать

                      </button>

                    </div>

                  )}

                </div>

              ))

            )}

            {role === 'foreman' && writeOffs.length > 0 && (

              <div className="mt-4">

                <p className="text-sm-mobile font-semibold text-gray-700 mb-2">Последние списания</p>

                {writeOffs.slice(0, 5).map((w) => (

                  <p key={w.id} className="text-xs-mobile text-gray-500 py-1">

                    −{w.quantity} {w.stockName} · {w.writtenBy}

                  </p>

                ))}

              </div>

            )}

          </>

        )}



        {tab === 'problems' && role === 'foreman' && (

          <>

            {objectWaits.length === 0 ? (

              <p className="text-sm-mobile text-gray-500 text-center py-12">Нет простоев из-за материалов</p>

            ) : (

              objectWaits.map((w) => (

                <div key={w.id} className="bg-red-50 border-2 border-red-200 rounded-xl p-4">

                  <p className="text-sm-mobile font-bold text-red-800 flex items-center gap-2">

                    <AlertTriangle size={18} /> Жду материал

                  </p>

                  <p className="text-sm-mobile text-red-900 mt-1">{w.taskTitle}</p>

                  <p className="text-xs-mobile text-red-700 mt-1">

                    {w.workerName} · простой {formatDowntime(getDowntimeMs(w.taskId))}

                  </p>

                  <button

                    type="button"

                    onClick={() => navigate(`/workflow/${w.taskId}`)}

                    className="mt-2 text-sm-mobile text-red-700 font-medium"

                  >

                    Открыть задачу →

                  </button>

                </div>

              ))

            )}

          </>

        )}



        {tab === 'expenses' && role === 'client' && (

          <div className="space-y-2">

            {objects.map((o) => {

              const spend = getMaterialSpendByObject(o.id, 'client')

              if (spend <= 0) return null

              return (

                <div key={o.id} className="bg-white rounded-xl p-4 border border-gray-100 flex justify-between">

                  <div>

                    <p className="text-sm-mobile font-medium text-gray-900">{o.name}</p>

                    <p className="text-xs-mobile text-gray-500">{PAYMENT_POLICY_LABELS[objectPaymentSettings[o.id]?.policy ?? 'client_material']}</p>

                  </div>

                  <p className="text-sm-mobile font-bold text-gray-900">{spend.toLocaleString('ru-RU')} ₽</p>

                </div>

              )

            })}

            {getTotalMaterialSpend('client') <= 0 && (

              <p className="text-sm-mobile text-gray-500 text-center py-8">

                Расходов на материалы пока нет

              </p>

            )}

          </div>

        )}



        {tab === 'expenses' && role === 'subcontractor' && objectId && (

          <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2">

            <p className="text-sm-mobile text-gray-600">Затраты организации на объекте</p>

            <p className="text-2xl-mobile font-bold text-primary-700">

              {getMaterialSpendByObject(objectId, 'organization').toLocaleString('ru-RU')} ₽

            </p>

            <p className="text-xs-mobile text-gray-500">

              Всего материалов: {spendSummary.totalDelivered.toLocaleString('ru-RU')} ₽

            </p>

          </div>

        )}

      </div>



      {deliveryRequest && (

        <MaterialDeliveryModal

          request={deliveryRequest}

          onClose={() => setDeliveryRequest(null)}

        />

      )}

    </div>

  )

}


