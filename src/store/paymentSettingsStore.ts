import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createZustandStorage, STORAGE_KEYS } from '@services/storage'
import type {
  CompanyRequisites,
  ForemanPaymentProfile,
  OrgPaymentProfile,
  PaymentLevelSettings,
} from '@/types/paymentSettings'
import {
  defaultForemanProfile,
  defaultOrgProfile,
} from '@/types/paymentSettings'

interface PaymentSettingsState {
  foremanProfiles: Record<string, ForemanPaymentProfile>
  orgProfiles: Record<string, OrgPaymentProfile>

  getForemanProfile: (foremanUserKey: string) => ForemanPaymentProfile
  getOrgProfile: (contractorId: string) => OrgPaymentProfile

  updateForemanPayWorkers: (foremanUserKey: string, settings: PaymentLevelSettings) => void
  updateForemanRequisites: (foremanUserKey: string, requisites: CompanyRequisites) => void

  updateOrgPayForemen: (contractorId: string, settings: PaymentLevelSettings) => void
  updateOrgChargeClient: (contractorId: string, settings: PaymentLevelSettings) => void
  updateOrgRequisites: (contractorId: string, requisites: CompanyRequisites) => void
}

export const usePaymentSettingsStore = create<PaymentSettingsState>()(
  persist(
    (set, get) => ({
      foremanProfiles: {},
      orgProfiles: {},

      getForemanProfile: (foremanUserKey) =>
        get().foremanProfiles[foremanUserKey] ?? defaultForemanProfile(),

      getOrgProfile: (contractorId) =>
        get().orgProfiles[contractorId] ?? defaultOrgProfile(),

      updateForemanPayWorkers: (foremanUserKey, settings) => {
        const cur = get().getForemanProfile(foremanUserKey)
        set({
          foremanProfiles: {
            ...get().foremanProfiles,
            [foremanUserKey]: {
              ...cur,
              payWorkers: { ...settings, updatedAt: new Date().toISOString() },
            },
          },
        })
      },

      updateForemanRequisites: (foremanUserKey, requisites) => {
        const cur = get().getForemanProfile(foremanUserKey)
        set({
          foremanProfiles: {
            ...get().foremanProfiles,
            [foremanUserKey]: { ...cur, requisites },
          },
        })
      },

      updateOrgPayForemen: (contractorId, settings) => {
        const cur = get().getOrgProfile(contractorId)
        set({
          orgProfiles: {
            ...get().orgProfiles,
            [contractorId]: {
              ...cur,
              payForemen: { ...settings, updatedAt: new Date().toISOString() },
            },
          },
        })
      },

      updateOrgChargeClient: (contractorId, settings) => {
        const cur = get().getOrgProfile(contractorId)
        set({
          orgProfiles: {
            ...get().orgProfiles,
            [contractorId]: {
              ...cur,
              chargeClient: { ...settings, updatedAt: new Date().toISOString() },
            },
          },
        })
      },

      updateOrgRequisites: (contractorId, requisites) => {
        const cur = get().getOrgProfile(contractorId)
        set({
          orgProfiles: {
            ...get().orgProfiles,
            [contractorId]: { ...cur, requisites },
          },
        })
      },
    }),
    {
      name: STORAGE_KEYS.PAYMENT_SETTINGS,
      storage: createJSONStorage(() => createZustandStorage()),
      version: 1,
    },
  ),
)
