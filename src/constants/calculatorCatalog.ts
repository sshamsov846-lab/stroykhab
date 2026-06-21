import type { CalculatorCatalogItem, CalculatorGroupId } from '@/types/workCalculator'
import type { SpecializationId } from '@/constants/specializations'
import type { VolumeUnit } from '@/types/workerPayroll'

type U = VolumeUnit

function item(
  specializationId: SpecializationId,
  id: string,
  groupId: CalculatorGroupId,
  label: string,
  unit: U,
  opts?: {
    workType?: CalculatorCatalogItem['workType']
    defaultRate?: number
    inputMode?: CalculatorCatalogItem['inputMode']
  },
): CalculatorCatalogItem {
  return {
    id,
    specializationId,
    groupId,
    label,
    unit,
    workType: opts?.workType,
    defaultRate: opts?.defaultRate,
    inputMode: opts?.inputMode,
  }
}

const PL: SpecializationId = 'plumbing'
const EL: SpecializationId = 'electrical'
const PST: SpecializationId = 'plaster'
const SCR: SpecializationId = 'screed'
const TL: SpecializationId = 'tiles'
const PT: SpecializationId = 'paint'
const MS: SpecializationId = 'masonry'
const DW: SpecializationId = 'drywall'
const WN: SpecializationId = 'windows'
const RF: SpecializationId = 'roofing'

export const DEFAULT_CALCULATOR_CATALOG: CalculatorCatalogItem[] = [
  ...(['16', '20', '25', '32', '40'] as const).flatMap((d) => [
    item(PL, `pl-h${d}`, 'pipes_heating', `Труба отопления Ø${d}`, 'lm', { workType: 'plumbing', defaultRate: 400 + Number(d) }),
    item(PL, `pl-w${d}`, 'pipes_water', `Труба водоснабжения Ø${d}`, 'lm', { workType: 'plumbing', defaultRate: 350 + Number(d) }),
  ]),
  item(PL, 'pl-s50', 'sewage', 'Канализация Ø50', 'lm', { workType: 'plumbing', defaultRate: 350 }),
  item(PL, 'pl-s110', 'sewage', 'Канализация Ø110', 'lm', { workType: 'plumbing', defaultRate: 520 }),
  item(PL, 'pl-ins', 'insulation', 'Изоляция труб', 'lm', { workType: 'plumbing', defaultRate: 120 }),
  item(PL, 'pl-comp-p', 'compensators', 'Компенсатор П-образный', 'pcs', { workType: 'plumbing', defaultRate: 1500 }),
  item(PL, 'pl-comp-l', 'compensators', 'Компенсатор петлевой', 'pcs', { workType: 'plumbing', defaultRate: 1200 }),
  item(PL, 'pl-sup-sl', 'supports', 'Опора скользящая', 'pcs', { workType: 'plumbing', defaultRate: 180 }),
  item(PL, 'pl-sup-fx', 'supports', 'Опора неподвижная', 'pcs', { workType: 'plumbing', defaultRate: 220 }),
  item(PL, 'pl-valve', 'valves', 'Кран / вентиль', 'pcs', { workType: 'plumbing', defaultRate: 800 }),
  item(PL, 'pl-rad', 'radiators', 'Радиатор / батарея (секция)', 'pcs', { workType: 'plumbing', defaultRate: 900 }),
  item(PL, 'pl-towel', 'meters', 'Полотенцесушитель', 'pcs', { workType: 'plumbing', defaultRate: 4000 }),
  item(PL, 'pl-meter', 'meters', 'Счётчик воды', 'pcs', { workType: 'plumbing', defaultRate: 2500 }),
  item(PL, 'pl-fit', 'fittings', 'Фитинг / отвод', 'pcs', { workType: 'plumbing', defaultRate: 200 }),

  ...([1.5, 2.5, 4, 6, 10] as const).map((s) =>
    item(EL, `el-cab${String(s).replace('.', '')}`, 'cable', `Кабель ${s} мм²`, 'lm', {
      workType: 'electrical',
      defaultRate: 60 + s * 20,
    }),
  ),
  item(EL, 'el-gof', 'conduit', 'Гофра / кабель-канал', 'lm', { workType: 'electrical', defaultRate: 95 }),
  item(EL, 'el-groove', 'grooving', 'Штробление', 'lm', { workType: 'electrical', defaultRate: 180 }),
  item(EL, 'el-sock', 'sockets', 'Розетка', 'pcs', { workType: 'electrical', defaultRate: 350 }),
  item(EL, 'el-sw', 'sockets', 'Выключатель', 'pcs', { workType: 'electrical', defaultRate: 300 }),
  item(EL, 'el-pt', 'points', 'Точка (розетка/выключатель)', 'point', { workType: 'electrical', defaultRate: 450 }),
  item(EL, 'el-light', 'lighting', 'Светильник', 'pcs', { workType: 'electrical', defaultRate: 500 }),
  item(EL, 'el-panel', 'panels', 'Щит / автомат / УЗО', 'pcs', { workType: 'electrical', defaultRate: 1500 }),
  item(EL, 'el-box', 'sockets', 'Подрозетник', 'pcs', { workType: 'electrical', defaultRate: 120 }),

  item(PST, 'pl-str', 'walls', 'Штукатурка стен (слой)', 'm2', { workType: 'plaster', defaultRate: 420, inputMode: 'area_thickness' }),
  item(PST, 'pl-ceil', 'ceilings', 'Штукатурка потолка', 'm2', { workType: 'plaster', defaultRate: 480 }),
  item(PST, 'pl-slope', 'slopes', 'Откосы', 'lm', { workType: 'plaster', defaultRate: 380 }),
  item(PST, 'pl-beacon', 'beacons', 'Маяки', 'lm', { workType: 'plaster', defaultRate: 120 }),
  item(PST, 'pl-corner', 'reinforcement', 'Армирование углов', 'lm', { workType: 'plaster', defaultRate: 150 }),

  item(SCR, 'sc-dry', 'floors', 'Стяжка полусухая', 'm2', { workType: 'screed', defaultRate: 480, inputMode: 'area_thickness' }),
  item(SCR, 'sc-wet', 'floors', 'Стяжка мокрая', 'm2', { workType: 'screed', defaultRate: 520, inputMode: 'area_thickness' }),
  item(SCR, 'sc-vol', 'concrete', 'Стяжка (объём м³)', 'm3', { workType: 'screed', defaultRate: 4200, inputMode: 'area_thickness' }),
  item(SCR, 'sc-bet', 'concrete', 'Бетон', 'm3', { workType: 'screed', defaultRate: 4500, inputMode: 'area_thickness' }),
  item(SCR, 'sc-arm', 'reinforcement', 'Армирование стяжки', 'm2', { workType: 'screed', defaultRate: 180 }),

  item(TL, 'tl-wall', 'walls', 'Плитка стены', 'm2', { workType: 'tiles', defaultRate: 720 }),
  item(TL, 'tl-floor', 'floors', 'Плитка пол', 'm2', { workType: 'tiles', defaultRate: 650 }),
  item(TL, 'tl-ker', 'floors', 'Керамогранит', 'm2', { workType: 'tiles', defaultRate: 850 }),
  item(TL, 'tl-grout', 'grout', 'Затирка', 'm2', { workType: 'tiles', defaultRate: 120 }),
  item(TL, 'tl-plint', 'plinth', 'Плинтус / бордюр', 'lm', { workType: 'tiles', defaultRate: 280 }),

  item(PT, 'pt-wall', 'finishing', 'Покраска стен (слой)', 'm2', { workType: 'paint', defaultRate: 200 }),
  item(PT, 'pt-ceil', 'finishing', 'Покраска потолка (слой)', 'm2', { workType: 'paint', defaultRate: 220 }),
  item(PT, 'pt-putty', 'finishing', 'Шпаклёвка', 'm2', { workType: 'paint', defaultRate: 280 }),
  item(PT, 'pt-prim', 'finishing', 'Грунтовка', 'm2', { workType: 'paint', defaultRate: 80 }),
  item(PT, 'pt-wallp', 'wallpaper', 'Обои', 'm2', { workType: 'paint', defaultRate: 320 }),

  item(MS, 'ms-brick', 'masonry_wall', 'Кирпич', 'm2', { workType: 'walls', defaultRate: 1200 }),
  item(MS, 'ms-block', 'masonry_wall', 'Блоки', 'm2', { workType: 'walls', defaultRate: 950 }),
  item(MS, 'ms-block-v', 'masonry_wall', 'Блоки (объём м³)', 'm3', { workType: 'walls', defaultRate: 3800 }),
  item(MS, 'ms-part', 'partitions', 'Перегородки', 'm2', { workType: 'walls', defaultRate: 1100 }),
  item(MS, 'ms-belt', 'belt', 'Армопояс', 'lm', { workType: 'walls', defaultRate: 850 }),

  item(DW, 'dw-wall', 'drywall_wall', 'Стены ГКЛ', 'm2', { workType: 'walls', defaultRate: 580 }),
  item(DW, 'dw-ceil', 'drywall_ceiling', 'Потолок ГКЛ', 'm2', { workType: 'ceiling', defaultRate: 620 }),
  item(DW, 'dw-box', 'boxes', 'Короба ГКЛ', 'lm', { workType: 'walls', defaultRate: 720 }),
  item(DW, 'dw-part', 'partitions', 'Перегородки ГКЛ', 'm2', { workType: 'walls', defaultRate: 680 }),

  item(WN, 'wn-win', 'windows_doors', 'Установка окна', 'pcs', { workType: 'windows', defaultRate: 3500 }),
  item(WN, 'wn-door', 'windows_doors', 'Установка двери', 'pcs', { workType: 'doors', defaultRate: 4000 }),
  item(WN, 'wn-slope', 'slopes', 'Откосы', 'lm', { workType: 'windows', defaultRate: 450 }),

  item(RF, 'rf-roof', 'roof', 'Кровля', 'm2', { workType: 'roof', defaultRate: 850 }),
  item(RF, 'rf-hydro', 'waterproofing', 'Гидроизоляция', 'm2', { workType: 'insulation', defaultRate: 420 }),
  item(RF, 'rf-ins', 'insulation', 'Утепление', 'm2', { workType: 'insulation', defaultRate: 380 }),
  item(RF, 'rf-gut', 'gutters', 'Водостоки', 'lm', { workType: 'roof', defaultRate: 650 }),

  item('universal', 'uni-m2', 'other', 'Работа (м²)', 'm2', { defaultRate: 400 }),
  item('universal', 'uni-lm', 'other', 'Работа (м.п.)', 'lm', { defaultRate: 350 }),
  item('universal', 'uni-pcs', 'other', 'Работа (шт)', 'pcs', { defaultRate: 500 }),
  item('universal', 'uni-m3', 'other', 'Работа (м³)', 'm3', { defaultRate: 4000 }),
  item('universal', 'uni-pt', 'other', 'Работа (точка)', 'point', { defaultRate: 450 }),
]

export function catalogForSpecializations(
  specIds: SpecializationId[],
  customItems: CalculatorCatalogItem[],
): CalculatorCatalogItem[] {
  const ids = new Set(specIds.length ? specIds : (['universal'] as SpecializationId[]))
  const base = DEFAULT_CALCULATOR_CATALOG.filter(
    (c) => ids.has(c.specializationId) || c.specializationId === 'universal',
  )
  const custom = customItems.filter((c) => ids.has(c.specializationId))
  const byId = new Map<string, CalculatorCatalogItem>()
  for (const i of [...base, ...custom]) byId.set(i.id, i)
  return [...byId.values()]
}

export function fullCalculatorCatalog(customItems: CalculatorCatalogItem[]): CalculatorCatalogItem[] {
  const byId = new Map<string, CalculatorCatalogItem>()
  for (const i of [...DEFAULT_CALCULATOR_CATALOG, ...customItems]) byId.set(i.id, i)
  return [...byId.values()]
}

export function catalogForSpec(
  specId: SpecializationId | 'all',
  customItems: CalculatorCatalogItem[],
): CalculatorCatalogItem[] {
  if (specId === 'all') return fullCalculatorCatalog(customItems)
  return catalogForSpecializations([specId], customItems)
}
