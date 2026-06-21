import type { AppRole } from '@store/userStore'
import type { ObjectDocument, DocumentAccessScope } from '@/types/objectDocuments'

export function canViewDocument(
  doc: ObjectDocument,
  viewerRole: AppRole,
  viewerName: string,
): boolean {
  const latest = doc.versions[doc.versions.length - 1]
  if (latest && (latest.uploadedBy === viewerName || doc.createdBy === viewerName)) return true

  switch (doc.access) {
    case 'all':
      return viewerRole === 'client' || viewerRole === 'foreman' || viewerRole === 'subcontractor' || viewerRole === 'worker'
    case 'organization':
      return viewerRole === 'subcontractor' || viewerRole === 'client'
    case 'foreman':
      return viewerRole === 'foreman' || viewerRole === 'client'
    case 'roles':
      return doc.allowedRoles?.includes(viewerRole) ?? false
    default:
      return false
  }
}

export function roleLabelForAccess(scope: DocumentAccessScope): string {
  switch (scope) {
    case 'all':
      return 'всем'
    case 'organization':
      return 'организации'
    case 'foreman':
      return 'прорабу'
    case 'roles':
      return 'выбранным ролям'
  }
}
