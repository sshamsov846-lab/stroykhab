import type { SpecializationId } from '@/constants/specializations'
import type { VolumeUnit } from '@/types/workerPayroll'

export interface VolumeUnitPreset {
  unit: VolumeUnit
  label: string
  placeholder: string
}

export const VOLUME_UNIT_LABELS: Record<VolumeUnit, string> = {
  m2: 'м²',
  pcs: 'шт',
  lm: 'м.п.',
  m3: 'м³',
  point: 'точка',
}

export const SPEC_VOLUME_PRESETS: Record<SpecializationId, VolumeUnitPreset[]> = {
  plumbing: [
    { unit: 'lm', label: 'м (стояки, канализация)', placeholder: '12.5' },
    { unit: 'pcs', label: 'шт (радиаторы, краны)', placeholder: '4' },
  ],
  electrical: [
    { unit: 'lm', label: 'м (кабель)', placeholder: '45' },
    { unit: 'pcs', label: 'шт (розетки, выключатели, щиты)', placeholder: '8' },
    { unit: 'point', label: 'точка', placeholder: '6' },
  ],
  plaster: [
    { unit: 'm2', label: 'м² (стены)', placeholder: '28' },
    { unit: 'lm', label: 'м.п. (откосы)', placeholder: '14' },
  ],
  tiles: [
    { unit: 'm2', label: 'м² (плитка)', placeholder: '18' },
  ],
  paint: [
    { unit: 'm2', label: 'm² (окраска)', placeholder: '32' },
  ],
  screed: [
    { unit: 'm2', label: 'м² (стяжка/пол)', placeholder: '24' },
    { unit: 'm3', label: 'м³ (бетон)', placeholder: '3' },
  ],
  roofing: [
    { unit: 'm2', label: 'м²', placeholder: '50' },
  ],
  facade: [
    { unit: 'm2', label: 'м²', placeholder: '40' },
  ],
  windows: [
    { unit: 'pcs', label: 'шт (окна/двери)', placeholder: '6' },
  ],
  masonry: [
    { unit: 'm2', label: 'м² (кладка)', placeholder: '20' },
    { unit: 'm3', label: 'м³ (объём)', placeholder: '5' },
  ],
  drywall: [
    { unit: 'm2', label: 'м² (ГКЛ)', placeholder: '25' },
    { unit: 'lm', label: 'м.п. (короба)', placeholder: '12' },
  ],
  ventilation: [
    { unit: 'lm', label: 'м (воздуховоды)', placeholder: '20' },
    { unit: 'pcs', label: 'шт (решётки)', placeholder: '4' },
  ],
  low_voltage: [
    { unit: 'lm', label: 'м (кабель)', placeholder: '30' },
    { unit: 'pcs', label: 'шт (камеры, датчики)', placeholder: '3' },
  ],
  landscaping: [
    { unit: 'm2', label: 'м²', placeholder: '100' },
  ],
  universal: [
    { unit: 'm2', label: 'м²', placeholder: '10' },
    { unit: 'lm', label: 'м.п.', placeholder: '10' },
    { unit: 'pcs', label: 'шт', placeholder: '5' },
  ],
}

export function presetsForSpecs(specIds: SpecializationId[]): VolumeUnitPreset[] {
  if (!specIds.length) return SPEC_VOLUME_PRESETS.universal
  const seen = new Set<VolumeUnit>()
  const out: VolumeUnitPreset[] = []
  for (const id of specIds) {
    for (const p of SPEC_VOLUME_PRESETS[id] ?? []) {
      if (!seen.has(p.unit)) {
        seen.add(p.unit)
        out.push(p)
      }
    }
  }
  return out.length ? out : SPEC_VOLUME_PRESETS.universal
}
