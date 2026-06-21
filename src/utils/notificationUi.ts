import type { NavigateFunction } from 'react-router-dom'
import {
  Bell,
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  RotateCcw,
  AlertTriangle,
  Users,
  Package,
  MinusCircle,
  PlusCircle,
  UserPlus,
  UserMinus,
  Building2,
  Play,
  Receipt,
  FileText,
  Calculator,
} from 'lucide-react'
import type { AppNotification, NotificationType } from '@store/notificationStore'

export const NOTIFICATION_ICONS: Record<NotificationType, typeof Bell> = {
  task_assigned: ClipboardList,
  contractor_assigned: Users,
  task_review: ClipboardList,
  task_accepted: CheckCircle2,
  task_rejected: RotateCcw,
  blueprint_changed: AlertTriangle,
  chat_message: MessageSquare,
  question: MessageSquare,
  approval: ClipboardList,
  photo: ClipboardList,
  payment: ClipboardList,
  material_request: Package,
  material_ordered: Package,
  material_delivered: Package,
  document_uploaded: FileText,
  document_updated: FileText,
  material_reimbursement: Receipt,
  material_reimbursement_approved: Receipt,
  payroll_fine: MinusCircle,
  payroll_bonus: PlusCircle,
  object_member_joined: UserPlus,
  object_member_revoked: UserMinus,
  member_join_request: UserPlus,
  member_join_approved: CheckCircle2,
  member_join_rejected: UserMinus,
  worker_joined: UserPlus,
  object_org_added: Building2,
  object_foreman_assigned: UserPlus,
  task_work_started: Play,
  brigade_task_assigned: Users,
  brigade_payroll: ClipboardList,
  brigade_member_joined: UserPlus,
  payment_report_submitted: ClipboardList,
  payment_act_sent_org: ClipboardList,
  payment_act_sent_client: ClipboardList,
  payment_act_returned: RotateCcw,
  payment_act_paid: CheckCircle2,
  work_calculator_submitted: Calculator,
  work_calculator_accepted: CheckCircle2,
  work_calculator_returned: RotateCcw,
}

export function formatNotificationDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'только что'
  if (diffMin < 60) return `${diffMin} мин. назад`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH} ч. назад`
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function navigateForNotification(n: AppNotification, navigate: NavigateFunction): void {
  if (n.type === 'member_join_request' || n.type === 'member_join_approved' || n.type === 'member_join_rejected') {
    navigate('/subcontractor/team')
    return
  }
  if (n.type === 'worker_joined') {
    navigate('/team')
    return
  }
  if (n.type === 'object_org_added' || n.type === 'object_foreman_assigned') {
    if (n.objectId) navigate(`/client/${n.objectId}`)
    return
  }
  if (n.type === 'task_work_started' && n.taskId) {
    navigate(`/workflow/${n.taskId}`)
    return
  }
  if (n.type === 'brigade_task_assigned' && n.taskId) {
    navigate(`/workflow/${n.taskId}`)
    return
  }
  if (n.type === 'brigade_payroll') {
    navigate('/worker/money')
    return
  }
  if (n.type === 'brigade_member_joined') {
    navigate('/settings')
    return
  }
  if (
    n.type === 'payment_report_submitted'
    || n.type === 'payment_act_sent_org'
    || n.type === 'payment_act_sent_client'
    || n.type === 'payment_act_returned'
    || n.type === 'payment_act_paid'
  ) {
    if (n.objectId) navigate(`/object/${n.objectId}/payment-acts`)
    else if (n.taskId) navigate(`/workflow/${n.taskId}`)
    return
  }
  if (n.type === 'work_calculator_submitted') {
    navigate('/foreman/calculator-reports')
    return
  }
  if (n.type === 'work_calculator_accepted' || n.type === 'work_calculator_returned') {
    navigate('/worker/calculators')
    return
  }
  if (n.type === 'object_member_joined' || n.type === 'object_member_revoked') {
    if (n.objectId) navigate(`/client/${n.objectId}`)
    return
  }
  if (
    n.type === 'material_request'
    || n.type === 'material_ordered'
    || n.type === 'material_delivered'
    || n.type === 'material_reimbursement'
    || n.type === 'material_reimbursement_approved'
    || n.type === 'document_uploaded'
    || n.type === 'document_updated'
  ) {
    navigate(n.objectId ? `/object/${n.objectId}/documents` : '/materials')
    return
  }
  if (n.type === 'payroll_fine' || n.type === 'payroll_bonus') {
    navigate('/worker/money')
    return
  }
  if (n.taskId && n.subWorkId) {
    navigate(`/workflow/${n.taskId}/sub/${n.subWorkId}`)
    return
  }
  if (n.taskId) {
    navigate(`/workflow/${n.taskId}`)
    return
  }
  if (n.objectId) {
    navigate(`/client/${n.objectId}`)
  }
}

export function isImportantNotification(n: AppNotification): boolean {
  return n.type === 'blueprint_changed' || n.type === 'task_rejected' || n.type === 'payroll_fine'
}
