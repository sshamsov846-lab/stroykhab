import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useClientPortalStore } from '@store/clientPortalStore'
import { getApartmentArea } from '@utils/apartmentDisplay'

/** Площадь квартиры задачи — для автоподстановки объёма в оплате по м² */
export function getApartmentAreaForTask(taskId: string): number | undefined {
  const task = useProjectWorkflowStore.getState().tasks[taskId]
  if (!task?.objectId || !task.apartmentNumber) return undefined
  const structure = useClientPortalStore.getState().customStructures[task.objectId]
  if (!structure) return undefined
  const apt = Object.values(structure.apartments).find((a) => a.number === task.apartmentNumber)
  if (!apt) return undefined
  return getApartmentArea(apt)
}
