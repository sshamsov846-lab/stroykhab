import * as XLSX from 'xlsx'

const HEADERS = [
  'Подъезд',
  'Этаж',
  'Квартира',
  'Количество комнат',
  'Кухня',
  'Площадь квартиры (м²)',
  'Площадь этажа (м²)',
]

const SAMPLE_ROWS: (string | number)[][] = [
  [1, 1, 1, 2, 'да', 55, 220],
  [1, 1, 2, 3, 'да', 72, 220],
  [1, 1, 3, 1, 'нет', 38, 220],
  [1, 2, 4, 2, 'да', 58, 215],
  [2, 1, 5, 3, '1', 68, 210],
]

export function downloadExcelProjectTemplate(): void {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...SAMPLE_ROWS])
  ws['!cols'] = [{ wch: 10 }, { wch: 8 }, { wch: 10 }, { wch: 18 }, { wch: 8 }, { wch: 22 }, { wch: 20 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Квартиры')
  XLSX.writeFile(wb, 'шаблон_проекта_объекта.xlsx')
}
