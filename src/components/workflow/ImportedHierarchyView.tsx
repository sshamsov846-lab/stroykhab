import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ArrowLeft } from 'lucide-react'
import { WORK_TYPE_LABELS } from '@api/hierarchy'
import { STATUS_COLORS, STATUS_LABELS } from '@api/clientView'
import { useClientPortalStore } from '@store/clientPortalStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { openWorkflowTask } from '@utils/workflowNavigation'
import type { ImportedHierarchyNav, ImportedNavLevel } from '@/types/hierarchyNav'
import type { ProjectTask } from '@/types/projectWorkflow'

interface Props {
  objectId: string
}

const DEFAULT_NAV: ImportedHierarchyNav = {
  kind: 'imported',
  level: 'sections',
  section: '',
  house: '',
  entrance: '',
  floor: '',
  apt: '',
  workTaskId: null,
}

export const ImportedHierarchyView: React.FC<Props> = ({ objectId }) => {
  const navigate = useNavigate()
  const tasks = useProjectWorkflowStore((s) => s.getTasksByObject(objectId))
  const savedNav = useClientPortalStore((s) => s.hierarchyNavByObject[objectId])
  const setHierarchyNav = useClientPortalStore((s) => s.setHierarchyNav)

  const initial = savedNav?.kind === 'imported' ? savedNav : DEFAULT_NAV

  const [level, setLevel] = useState<ImportedNavLevel>(initial.level)
  const [section, setSection] = useState(initial.section)
  const [house, setHouse] = useState(initial.house)
  const [entrance, setEntrance] = useState(initial.entrance)
  const [floor, setFloor] = useState(initial.floor)
  const [apt, setApt] = useState(initial.apt)

  useEffect(() => {
    setHierarchyNav(objectId, {
      kind: 'imported',
      level,
      section,
      house,
      entrance,
      floor,
      apt,
      workTaskId: null,
    })
  }, [objectId, level, section, house, entrance, floor, apt, setHierarchyNav])

  if (!tasks.length) return null

  const sections = [...new Set(tasks.map((t) => t.section))]
  const houses = [...new Set(tasks.filter((t) => t.section === section).map((t) => t.house))]
  const entrances = [...new Set(tasks.filter((t) => t.section === section && t.house === house).map((t) => t.entrance))]
  const floors = [...new Set(tasks.filter((t) => t.section === section && t.house === house && t.entrance === entrance).map((t) => t.floor))]
  const apartments = [...new Set(tasks.filter((t) => t.section === section && t.house === house && t.entrance === entrance && t.floor === floor).map((t) => t.apartmentNumber))]
  const aptTasks = tasks.filter(
    (t) => t.section === section && t.house === house && t.entrance === entrance && t.floor === floor && t.apartmentNumber === apt,
  )

  const currentNav = (): ImportedHierarchyNav => ({
    kind: 'imported',
    level,
    section,
    house,
    entrance,
    floor,
    apt,
    workTaskId: null,
  })

  const Card = ({ title, sub, onClick }: { title: string; sub?: string; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="w-full flex items-center justify-between bg-white rounded-2xl p-4 border border-gray-100 text-left active:scale-[0.98]">
      <div>
        <p className="text-base-mobile font-bold text-gray-900">{title}</p>
        {sub && <p className="text-sm-mobile text-gray-500">{sub}</p>}
      </div>
      <ChevronRight size={20} className="text-gray-300" />
    </button>
  )

  const goBack = () => {
    if (level === 'tasks') { setLevel('apartments'); setApt('') }
    else if (level === 'apartments') { setLevel('floors'); setFloor('') }
    else if (level === 'floors') { setLevel('entrances'); setEntrance('') }
    else if (level === 'entrances') { setLevel('houses'); setHouse('') }
    else if (level === 'houses') { setLevel('sections'); setSection('') }
  }

  const TaskRow = ({ task }: { task: ProjectTask }) => (
    <button
      type="button"
      onClick={() => openWorkflowTask(navigate, objectId, task.id, currentNav())}
      className="w-full bg-white rounded-xl p-4 border border-gray-100 text-left"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className="text-sm-mobile font-semibold text-gray-900">{WORK_TYPE_LABELS[task.workType]}</p>
          <p className="text-xs-mobile text-gray-500">{task.contractorName || 'Подрядчик не назначен'}</p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs-mobile ${STATUS_COLORS[task.status]}`}>
          {STATUS_LABELS[task.status]}
        </span>
      </div>
    </button>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs-mobile text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
        Структура из сметы · {tasks.length} задач
      </p>

      {level !== 'sections' && (
        <button type="button" onClick={goBack} className="flex items-center gap-1 text-sm-mobile text-primary-600 font-medium py-1">
          <ArrowLeft size={16} />
          Назад
        </button>
      )}

      {level === 'sections' && sections.map((s) => (
        <Card key={s} title={s} sub="Секция" onClick={() => { setSection(s); setLevel('houses') }} />
      ))}
      {level === 'houses' && houses.map((h) => (
        <Card key={h} title={h} sub="Дом" onClick={() => { setHouse(h); setLevel('entrances') }} />
      ))}
      {level === 'entrances' && entrances.map((e) => (
        <Card key={e} title={`Подъезд ${e}`} onClick={() => { setEntrance(e); setLevel('floors') }} />
      ))}
      {level === 'floors' && floors.map((f) => (
        <Card key={f} title={f === '-1' ? 'Подвал' : f === '999' ? 'Крыша' : `Этаж ${f}`} onClick={() => { setFloor(f); setLevel('apartments') }} />
      ))}
      {level === 'apartments' && apartments.map((a) => (
        <Card key={a} title={a.startsWith('подвал') ? `Подвал (${a})` : `кв. ${a}`} onClick={() => { setApt(a); setLevel('tasks') }} />
      ))}
      {level === 'tasks' && (
        <>
          <p className="text-sm-mobile font-medium text-gray-700">
            {section} · {house} · под. {entrance} · эт. {floor === '-1' ? 'подвал' : floor} · {apt.startsWith('подвал') ? apt : `кв. ${apt}`}
          </p>
          <p className="text-xs-mobile text-gray-500">Виды работ и подрядчики</p>
          {aptTasks.map((t) => <TaskRow key={t.id} task={t} />)}
        </>
      )}
    </div>
  )
}
