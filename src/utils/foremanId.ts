import { useUserStore } from '@store/userStore'
import { useOrganizationStore } from '@store/organizationStore'

/** Стабильный ключ прораба по телефону */
export function foremanIdFromPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits ? `foreman-${digits}` : 'default-foreman'
}

/** Текущий залогиненный прораб */
export function resolveCurrentForemanId(): string {
  const { phone, fullName, role } = useUserStore.getState()
  if (role === 'foreman' && phone) return foremanIdFromPhone(phone)
  if (role === 'foreman' && fullName) return `foreman-${fullName.trim().toLowerCase().replace(/\s+/g, '-')}`
  return 'default-foreman'
}

export function resolveCurrentForemanName(): string {
  const { fullName, role } = useUserStore.getState()
  if (role === 'foreman' && fullName) return fullName
  return 'Прораб'
}

/** Прораб для начисления по задаче (один прораб на объект в MVP) */
export function resolveForemanForTask(contractorId?: string): { foremanId: string; foremanName: string } {
  const user = useUserStore.getState()
  if (user.role === 'foreman') {
    return {
      foremanId: resolveCurrentForemanId(),
      foremanName: user.fullName || 'Прораб',
    }
  }

  if (contractorId) {
    const foremen = useOrganizationStore.getState().getForemenForContractor(contractorId)
    if (foremen.length > 0) {
      const f = foremen[0]
      return {
        foremanId: foremanIdFromPhone(f.phone) || f.id,
        foremanName: f.fullName,
      }
    }
  }

  return { foremanId: 'default-foreman', foremanName: 'Прораб' }
}
