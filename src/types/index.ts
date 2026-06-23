// ============================================
// МНОГОУРОВНЕВАЯ СТРУКТУРА: Блок → Объект → Дом → Подъезд → Этаж → Квартира → Работы
// ============================================

export type UserRole = 'foreman' | 'worker' | 'client' | 'supplier' | 'developer'
export type ObjectStatus =
  | 'new'
  | 'active'
  | 'delayed'
  | 'done'
  | 'planning'
  | 'paused'
  | 'completed'
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'done' | 'rejected'
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type ExpenseCategory = 'materials' | 'tools' | 'salary' | 'transport' | 'other' | string
export type PhotoType = 'before' | 'after' | 'progress' | 'defect' | 'hidden_work'
export type WorkType =
  | 'walls'
  | 'plaster'
  | 'electrical'
  | 'plumbing'
  | 'screed'
  | 'windows'
  | 'ceiling'
  | 'paint'
  | 'doors'
  | 'floor'
  | 'tiles'
  | 'heating'
  | 'ventilation'
  | 'facade'
  | 'roof'
  | 'insulation'

export interface User {
  id: string
  telegram_id?: number
  phone?: string
  full_name?: string
  name?: string
  role: UserRole
  avatar_url?: string
  created_at?: string
}

// === БЛОК (крупный ЖК, район) ===
export interface Block {
  id: string
  name: string
  description?: string
  address: string
  developer_id: string
  status: ObjectStatus
  progress: number
  total_objects: number
  completed_objects: number
  photo_url?: string
  created_at: string
}

// === ОБЪЕКТ (конкретный дом/строение в блоке) ===
export interface ConstructionObject {
  id: string
  block_id?: string
  name: string
  address: string
  client_name?: string
  client_phone?: string
  foreman_id?: string
  status: ObjectStatus
  progress?: number
  total_houses?: number
  completed_houses?: number
  budget_total: number
  budget_spent: number
  start_date?: string
  end_date?: string
  photo_url?: string
  /** Фото объекта (конструктор) */
  photo_urls?: string[]
  /** Тип объекта из конструктора */
  object_type?: import('@/types/objectWizard').ObjectWizardType
  /** Описание / особенности */
  description?: string
  /** Контакт на объекте */
  site_contact_name?: string
  site_contact_phone?: string
  work_scope_mode?: import('@/types/objectWizard').ObjectWorkScopeMode
  selected_work_types?: WorkType[]
  created_at: string
  updated_at?: string
  /** Подработка прораба — не видна заказчику и организациям */
  isSideJob?: boolean
  /** Тип мини-объекта */
  sideJobType?: 'apartment' | 'house' | 'premises' | 'other'
  /** Ключ прораба-создателя (phone|role|contractorId|name) */
  ownerForemanKey?: string
}

// === ДОМ (конкретное строение) ===
export interface House {
  id: string
  object_id: string
  block_id: string
  name: string
  address: string
  total_entrances: number
  completed_entrances: number
  total_floors: number
  progress: number
  status: ObjectStatus
  photo_url?: string
  created_at: string
}

// === ПОДЪЕЗД ===
export interface Entrance {
  id: string
  house_id: string
  object_id: string
  block_id: string
  number: number
  total_floors: number
  total_apartments: number
  completed_apartments: number
  progress: number
  status: ObjectStatus
  photo_url?: string
  created_at: string
}

// === ЭТАЖ ===
export interface Floor {
  id: string
  entrance_id: string
  house_id: string
  object_id: string
  block_id: string
  number: number
  total_apartments: number
  completed_apartments: number
  progress: number
  status: ObjectStatus
  created_at: string
}

// === КВАРТИРА ===
export interface Apartment {
  id: string
  floor_id: string
  entrance_id: string
  house_id: string
  object_id: string
  block_id: string
  number: string
  total_works: number
  completed_works: number
  progress: number
  status: ObjectStatus
  budget_total: number
  budget_spent: number
  photo_url?: string
  created_at: string
}

export interface MaterialItem {
  name: string
  quantity: number
  unit: string
  price: number
  total: number
}

// === РАБОТЫ (виды работ по квартире) ===
export interface WorkItem {
  id: string
  apartment_id: string
  floor_id: string
  entrance_id: string
  house_id: string
  object_id: string
  block_id: string
  type: WorkType
  name: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  estimated_hours?: number
  actual_hours?: number
  assigned_to?: string
  photos: string[]
  materials: MaterialItem[]
  start_date?: string
  end_date?: string
  created_by: string
  created_at: string
  updated_at: string
}

// === ЗАДАЧИ (для мастеров) ===
export interface Task {
  id: string
  object_id: string
  title: string
  description?: string
  room?: string
  assigned_to?: string
  status: TaskStatus
  priority: TaskPriority
  estimated_hours?: number
  actual_hours?: number
  start_date?: string
  end_date?: string
  due_date?: string
  created_by?: string
  created_at: string
  updated_at?: string
}

export interface ReceiptItem {
  name: string
  quantity: number
  price: number
  sum: number
}

export interface ReceiptData {
  store_name?: string
  store_address?: string
  date?: string
  items: ReceiptItem[]
  total: number
}

// === РАСХОДЫ ===
export interface Expense {
  id: string
  object_id: string
  amount: number
  category: ExpenseCategory
  description: string
  date?: string
  receipt_url?: string
  receipt_data?: ReceiptData
  created_by?: string
  created_at: string
}

// === ФОТООТЧЁТЫ ===
export interface PhotoReport {
  id: string
  work_id?: string
  apartment_id?: string
  task_id?: string
  object_id: string
  room?: string
  photo_url: string
  thumbnail_url?: string
  type: PhotoType
  description?: string
  taken_by?: string
  taken_at: string
  geolocation?: { lat: number; lng: number }
}

/** @deprecated используйте PhotoReport */
export interface Photo {
  id: string
  object_id: string
  task_id?: string
  url: string
  type: 'before' | 'after' | 'progress'
  caption?: string
  created_at: string
}

export interface MaterialRequestItem {
  name: string
  quantity: number
  unit: string
  urgency: 'normal' | 'urgent' | 'critical'
  notes?: string
}

export interface MaterialRequest {
  id: string
  object_id: string
  task_id?: string
  items: MaterialRequestItem[]
  status: 'pending' | 'approved' | 'ordered' | 'delivered' | 'cancelled'
  requested_by: string
  approved_by?: string
  created_at: string
}

// === КОММЕНТАРИИ ===
export interface Comment {
  id: string
  object_id: string
  work_id?: string
  task_id?: string
  user_id: string
  user_name: string
  text: string
  attachments?: string[]
  created_at: string
}

export interface Warranty {
  id: string
  object_id: string
  task_id: string
  work_type: string
  duration_months: number
  start_date: string
  end_date: string
  status: 'active' | 'expired' | 'claimed'
  claim_description?: string
  claim_date?: string
}
