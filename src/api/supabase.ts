import { createClient } from '@supabase/supabase-js'
import type {
  ConstructionObject,
  Task,
  Expense,
  TaskStatus,
  PhotoReport,
  MaterialRequest,
} from '@types'
import { DEMO_HIERARCHY_OBJECTS } from '@api/hierarchy'
import { getProjects, saveProject } from '@services/dataService'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const isPlaceholderEnv =
  !supabaseUrl ||
  !supabaseKey ||
  supabaseUrl.includes('your-project') ||
  supabaseKey.includes('your-anon')

export const supabase = !isPlaceholderEnv
  ? createClient(supabaseUrl, supabaseKey)
  : null

const DEMO_OBJECTS: ConstructionObject[] = [
  {
    id: 'obj-1',
    name: 'Квартира на Ленина',
    address: 'ул. Ленина, 45, кв. 12',
    client_name: 'Иванов И.И.',
    client_phone: '+7 (999) 123-45-67',
    status: 'active',
    budget_total: 450000,
    budget_spent: 187500,
    progress: 42,
    start_date: '2026-05-15',
    end_date: '2026-08-30',
    created_at: '2026-05-01T00:00:00Z',
  },
  {
    id: 'obj-2',
    name: 'Дом в Подмосковье',
    address: 'д. Васюки, Садовая 7',
    client_name: 'Петров П.П.',
    status: 'active',
    budget_total: 1200000,
    budget_spent: 320000,
    progress: 27,
    start_date: '2026-04-01',
    end_date: '2026-12-01',
    created_at: '2026-03-15T00:00:00Z',
  },
]

const DEMO_TASKS: Task[] = [
  {
    id: 'task-1',
    object_id: 'obj-1',
    title: 'Установка смесителя',
    room: 'Ванная',
    status: 'in_progress',
    priority: 'high',
    estimated_hours: 2,
    actual_hours: 1.5,
    created_at: '2026-06-01T00:00:00Z',
  },
  {
    id: 'task-2',
    object_id: 'obj-1',
    title: 'Замена стояка ГВС',
    room: 'Кухня',
    status: 'pending',
    priority: 'urgent',
    estimated_hours: 4,
    actual_hours: 0,
    created_at: '2026-06-02T00:00:00Z',
  },
  {
    id: 'task-3',
    object_id: 'obj-1',
    title: 'Разводка тёплого пола',
    room: 'Гостиная',
    status: 'pending',
    priority: 'medium',
    estimated_hours: 8,
    created_at: '2026-06-03T00:00:00Z',
  },
]

const DEMO_EXPENSES: Expense[] = []

function findDemoObject(objectId: string): ConstructionObject | null {
  const userObj = getProjects().find((o) => o.id === objectId)
  if (userObj) return userObj
  return [...DEMO_OBJECTS, ...DEMO_HIERARCHY_OBJECTS].find((o) => o.id === objectId) || null
}

function allDemoObjects(): ConstructionObject[] {
  const userIds = new Set(getProjects().map((o) => o.id))
  const builtins = [...DEMO_OBJECTS, ...DEMO_HIERARCHY_OBJECTS].filter((o) => !userIds.has(o.id))
  return [...getProjects(), ...builtins]
}

export async function getObjects(foremanId?: string): Promise<ConstructionObject[]> {
  if (!supabase) return allDemoObjects()
  try {
    let query = supabase.from('objects').select('*').order('created_at', { ascending: false })
    if (foremanId) query = query.eq('foreman_id', foremanId)
    const { data, error } = await query
    if (error || !data?.length) return allDemoObjects()
    const remote = data as ConstructionObject[]
    const userLocal = getProjects().filter(
      (u) => !remote.some((r) => r.id === u.id),
    )
    return [...userLocal, ...remote]
  } catch {
    return allDemoObjects()
  }
}

export async function getObjectById(objectId: string): Promise<ConstructionObject | null> {
  if (!supabase) return findDemoObject(objectId)
  try {
    const { data, error } = await supabase.from('objects').select('*').eq('id', objectId).single()
    if (error || !data) return findDemoObject(objectId)
    return data as ConstructionObject
  } catch {
    return findDemoObject(objectId)
  }
}

export async function createObject(object: Partial<ConstructionObject>): Promise<ConstructionObject> {
  if (!supabase) {
    const newObj: ConstructionObject = {
      id: `obj-${Date.now()}`,
      name: object.name || 'Новый объект',
      address: object.address || '',
      status: object.status || 'new',
      budget_total: object.budget_total ?? 0,
      budget_spent: object.budget_spent ?? 0,
      progress: object.progress ?? 0,
      created_at: new Date().toISOString(),
      ...object,
    }
    saveProject(newObj)
    try {
      const { useObjectStore } = await import('@store/objectStore')
      useObjectStore.setState((s) => ({
        userObjects: [newObj, ...s.userObjects.filter((o) => o.id !== newObj.id)],
      }))
    } catch {
      /* store not loaded */
    }
    return newObj
  }
  const { data, error } = await supabase.from('objects').insert(object).select().single()
  if (error) throw error
  return data as ConstructionObject
}

export async function getTasks(objectId: string): Promise<Task[]> {
  if (!supabase) return DEMO_TASKS.filter((t) => t.object_id === objectId)
  const { data, error } = await supabase.from('tasks').select('*').eq('object_id', objectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data as Task[]) || []
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!supabase) return DEMO_TASKS.find((t) => t.id === id) || null
  const { data, error } = await supabase.from('tasks').select('*').eq('id', id).single()
  if (error) throw error
  return data as Task
}

export async function createTask(task: Partial<Task>): Promise<Task> {
  if (!supabase) {
    const newTask: Task = {
      id: `task-${Date.now()}`,
      object_id: task.object_id || '',
      title: task.title || 'Задача',
      status: task.status || 'pending',
      priority: task.priority || 'medium',
      created_at: new Date().toISOString(),
      ...task,
    }
    DEMO_TASKS.push(newTask)
    return newTask
  }
  const { data, error } = await supabase.from('tasks').insert(task).select().single()
  if (error) throw error
  return data as Task
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task | void> {
  if (!supabase) {
    const task = DEMO_TASKS.find((t) => t.id === taskId)
    if (task) task.status = status
    return task
  }
  const { data, error } = await supabase
    .from('tasks')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', taskId)
    .select()
    .single()
  if (error) throw error
  return data as Task
}

export async function getExpenses(objectId: string): Promise<Expense[]> {
  if (!supabase) return DEMO_EXPENSES.filter((e) => e.object_id === objectId)
  const { data, error } = await supabase.from('expenses').select('*').eq('object_id', objectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data as Expense[]) || []
}

export async function addExpense(expense: Partial<Expense>): Promise<Expense> {
  if (!supabase) {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      object_id: expense.object_id || '',
      amount: expense.amount ?? 0,
      category: expense.category || 'other',
      description: expense.description || '',
      created_at: new Date().toISOString(),
      ...expense,
    }
    DEMO_EXPENSES.push(newExpense)
    return newExpense
  }
  const { data, error } = await supabase.from('expenses').insert(expense).select().single()
  if (error) throw error
  return data as Expense
}

/** @deprecated используйте addExpense */
export const createExpense = addExpense

export async function uploadPhoto(file: File, objectId: string): Promise<string> {
  if (!supabase) return URL.createObjectURL(file)
  const fileExt = file.name.split('.').pop()
  const fileName = `${objectId}/${Date.now()}.${fileExt}`
  const { error: uploadError } = await supabase.storage.from('photos').upload(fileName, file, { cacheControl: '3600', upsert: false })
  if (uploadError) throw uploadError
  const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName)
  return publicUrl
}

export async function savePhotoReport(photo: Partial<PhotoReport>): Promise<PhotoReport> {
  if (!supabase) {
    return {
      id: `photo-${Date.now()}`,
      object_id: photo.object_id || '',
      photo_url: photo.photo_url || '',
      thumbnail_url: photo.thumbnail_url || photo.photo_url || '',
      type: photo.type || 'progress',
      taken_at: photo.taken_at || new Date().toISOString(),
      ...photo,
    } as PhotoReport
  }
  const { data, error } = await supabase.from('photos').insert(photo).select().single()
  if (error) throw error
  return data as unknown as PhotoReport
}

export async function createMaterialRequest(request: Partial<MaterialRequest>): Promise<MaterialRequest> {
  if (!supabase) {
    return {
      id: `mr-${Date.now()}`,
      object_id: request.object_id || '',
      items: request.items || [],
      status: request.status || 'pending',
      requested_by: request.requested_by || '',
      created_at: new Date().toISOString(),
      ...request,
    } as MaterialRequest
  }
  const { data, error } = await supabase.from('material_requests' as 'objects').insert(request as never).select().single()
  if (error) throw error
  return data as unknown as MaterialRequest
}

export async function getMaterialRequests(objectId: string): Promise<MaterialRequest[]> {
  if (!supabase) return []
  const { data, error } = await supabase.from('material_requests' as 'objects').select('*').eq('object_id', objectId).order('created_at', { ascending: false })
  if (error) throw error
  return (data as unknown as MaterialRequest[]) || []
}
