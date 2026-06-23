export interface ExcelApartmentRow {
  entrance: number
  floor: number
  apartmentNumber: string
  rooms: number
  hasKitchen: boolean
  kitchenCount: number
  apartmentArea: number
  floorArea?: number
}

export interface ExcelFloorSummary {
  entrance: number
  floor: number
  apartmentCount: number
  floorArea: number
  apartmentAreaSum: number
}

export interface ExcelEntranceSummary {
  entrance: number
  floors: number
  apartments: number
  totalArea: number
}

export interface ExcelProjectPreview {
  apartmentCount: number
  totalApartmentArea: number
  totalRooms: number
  totalKitchens: number
  entrances: ExcelEntranceSummary[]
  floors: ExcelFloorSummary[]
  errors: string[]
  warnings: string[]
}

export interface ExcelProjectSummary extends ExcelProjectPreview {
  sourceFileName: string
  importedAt: string
}

export interface PendingProjectAttachment {
  id: string
  fileName: string
  fileUrl: string
  mimeType: string
  fileSize: number
  kind: 'excel' | 'attachment'
  description?: string
}

export interface ObjectProjectFileMeta {
  fileName: string
  mimeType: string
  kind: 'excel' | 'attachment'
  uploadedAt: string
}
