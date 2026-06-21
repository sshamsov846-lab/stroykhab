import type { NavigateFunction } from 'react-router-dom'
import { useClientPortalStore } from '@store/clientPortalStore'
import { useObjectStore } from '@store/objectStore'
import type { HierarchyNavState } from '@/types/hierarchyNav'

export function openWorkflowTask(
  navigate: NavigateFunction,
  objectId: string,
  taskId: string,
  nav: HierarchyNavState,
) {
  useClientPortalStore.getState().setHierarchyNav(objectId, nav)
  navigate(`/workflow/${taskId}`)
}

export function openWorkflowSubWork(
  navigate: NavigateFunction,
  objectId: string,
  taskId: string,
  subWorkId: string,
  nav: HierarchyNavState,
) {
  useClientPortalStore.getState().setHierarchyNav(objectId, nav)
  navigate(`/workflow/${taskId}/sub/${subWorkId}`)
}

export function returnFromWorkflow(navigate: NavigateFunction, objectId: string) {
  const obj = useObjectStore.getState().userObjects.find((o) => o.id === objectId)
  if (obj?.isSideJob) {
    navigate(`/side-job/${objectId}`)
    return
  }
  navigate(`/client/${objectId}`)
}
