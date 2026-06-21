import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  DocumentCategory,
  DocumentAccessScope,
  ObjectDocument,
  DocumentVersion,
} from '@/types/objectDocuments'
import type { AppRole } from '@store/userStore'
import { notifyDocumentUploaded } from '@utils/objectDocumentNotifications'

interface UploadParams {
  objectId: string
  title: string
  category: DocumentCategory
  description?: string
  access: DocumentAccessScope
  allowedRoles?: AppRole[]
  taskId?: string
  taskTitle?: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedBy: string
  uploadedByRole: AppRole
  note?: string
}

interface AddVersionParams {
  documentId: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  uploadedBy: string
  uploadedByRole: AppRole
  note?: string
}

interface ObjectDocumentStoreState {
  documents: ObjectDocument[]

  uploadDocument: (params: UploadParams) => string
  addVersion: (params: AddVersionParams) => void
  getDocumentsForObject: (objectId: string) => ObjectDocument[]
  getDocumentsForTask: (taskId: string) => ObjectDocument[]
  getDocumentById: (id: string) => ObjectDocument | undefined
  findByTitle: (objectId: string, title: string, category: DocumentCategory) => ObjectDocument | undefined
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`
}

export const useObjectDocumentStore = create<ObjectDocumentStoreState>()(
  persist(
    (set, get) => ({
      documents: [],

      uploadDocument: (params) => {
        const id = uid('doc')
        const version: DocumentVersion = {
          id: uid('dv'),
          versionNumber: 1,
          fileName: params.fileName,
          fileUrl: params.fileUrl,
          mimeType: params.mimeType,
          fileSize: params.fileSize,
          uploadedBy: params.uploadedBy,
          uploadedByRole: params.uploadedByRole,
          uploadedAt: new Date().toISOString(),
          note: params.note,
        }
        const doc: ObjectDocument = {
          id,
          objectId: params.objectId,
          title: params.title.trim(),
          category: params.category,
          description: params.description?.trim(),
          access: params.access,
          allowedRoles: params.allowedRoles,
          taskId: params.taskId,
          taskTitle: params.taskTitle,
          versions: [version],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: params.uploadedBy,
          createdByRole: params.uploadedByRole,
        }
        set((s) => ({ documents: [doc, ...s.documents] }))
        notifyDocumentUploaded({
          objectId: params.objectId,
          documentTitle: doc.title,
          uploaderName: params.uploadedBy,
          uploaderRole: params.uploadedByRole,
          isNewVersion: false,
          taskId: params.taskId,
        })
        return id
      },

      addVersion: (params) => {
        const doc = get().documents.find((d) => d.id === params.documentId)
        if (!doc) return
        const versionNumber = doc.versions.length + 1
        const version: DocumentVersion = {
          id: uid('dv'),
          versionNumber,
          fileName: params.fileName,
          fileUrl: params.fileUrl,
          mimeType: params.mimeType,
          fileSize: params.fileSize,
          uploadedBy: params.uploadedBy,
          uploadedByRole: params.uploadedByRole,
          uploadedAt: new Date().toISOString(),
          note: params.note,
        }
        set((s) => ({
          documents: s.documents.map((d) =>
            d.id === params.documentId
              ? { ...d, versions: [...d.versions, version], updatedAt: new Date().toISOString() }
              : d,
          ),
        }))
        notifyDocumentUploaded({
          objectId: doc.objectId,
          documentTitle: doc.title,
          uploaderName: params.uploadedBy,
          uploaderRole: params.uploadedByRole,
          isNewVersion: true,
          taskId: doc.taskId,
        })
      },

      getDocumentsForObject: (objectId) =>
        get().documents.filter((d) => d.objectId === objectId),

      getDocumentsForTask: (taskId) =>
        get().documents.filter((d) => d.taskId === taskId),

      getDocumentById: (id) => get().documents.find((d) => d.id === id),

      findByTitle: (objectId, title, category) =>
        get().documents.find(
          (d) =>
            d.objectId === objectId &&
            d.title.toLowerCase() === title.toLowerCase() &&
            d.category === category,
        ),
    }),
    {
      name: STORAGE_KEYS.OBJECT_DOCUMENTS,
      storage: createJSONStorage(() => createZustandStorage()),
    },
  ),
)
