import { useForemanPayrollStore } from '@store/foremanPayrollStore'
import { useWorkerPayrollStore } from '@store/workerPayrollStore'

/** Догоняющая синхронизация начислений прорабу для уже принятых задач */
export function syncForemanAccrualsFromAcceptedTasks(): void {
  const records = useWorkerPayrollStore.getState().records
  const accrue = useForemanPayrollStore.getState().accrueOnTaskAccepted
  for (const rec of Object.values(records)) {
    if (rec.isAccrued) {
      accrue(rec.taskId, rec)
    }
  }
}
