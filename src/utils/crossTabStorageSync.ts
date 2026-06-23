import { STORAGE_KEYS } from '@services/storage'
import { useObjectAccessStore } from '@store/objectAccessStore'
import { rebuildInviteRegistryFromStores } from '@utils/inviteCodeRegistry'
import { syncOrganizationRegistryFromStores } from '@utils/objectChain'
import { loadInvitesFromDisk, loadObjectMetaFromDisk, loadUserObjectsFromDisk, buildObjectNameMap } from '@utils/objectAccessStorage'
import { useObjectStore } from '@store/objectStore'
import { useProjectWorkflowStore } from '@store/projectWorkflowStore'
import { useUserStore } from '@store/userStore'
import { usePersonProfileStore } from '@store/personProfileStore'
import { useOrganizationStore } from '@store/organizationStore'
import { useDirectoryStore } from '@store/directoryStore'
import { syncUsersFromAuth, useUsersStore } from '@store/usersStore'
import { syncDirectoryFromApp } from '@utils/directorySync'

type RehydrateFn = () => void | Promise<void>

const STORES_BY_KEY: Record<string, RehydrateFn> = {
  [STORAGE_KEYS.OBJECT_ACCESS]: () => {
    void (async () => {
      await useObjectAccessStore.persist.rehydrate()
      rebuildInviteRegistryFromStores(
        loadInvitesFromDisk(),
        loadObjectMetaFromDisk(),
        buildObjectNameMap(useObjectStore.getState().userObjects, loadUserObjectsFromDisk()),
      )
    })()
  },
  [STORAGE_KEYS.OBJECT]: () => useObjectStore.persist.rehydrate(),
  [STORAGE_KEYS.WORKFLOW]: () => {
    void (async () => {
      await useProjectWorkflowStore.persist.rehydrate()
      syncOrganizationRegistryFromStores()
    })()
  },
  [STORAGE_KEYS.USERS]: () => {
    void (async () => {
      await useUsersStore.persist.rehydrate()
      syncUsersFromAuth(useUserStore.getState().accounts)
    })()
  },
  [STORAGE_KEYS.USER]: () => {
    void (async () => {
      await useUserStore.persist.rehydrate()
      useUserStore.getState().recoverAccounts()
      syncUsersFromAuth(useUserStore.getState().accounts)
      syncDirectoryFromApp()
      useUserStore.getState().hydrateSession()
      syncOrganizationRegistryFromStores()
    })()
  },
  [STORAGE_KEYS.ACCOUNTS]: () => {
    useUserStore.getState().syncAccountsFromDisk()
    syncUsersFromAuth(useUserStore.getState().accounts)
  },
  [STORAGE_KEYS.PERSON_PROFILES]: () => {
    void (async () => {
      await usePersonProfileStore.persist.rehydrate()
      syncDirectoryFromApp()
      syncOrganizationRegistryFromStores()
    })()
  },
  [STORAGE_KEYS.ORGANIZATION]: () => {
    void (async () => {
      await useOrganizationStore.persist.rehydrate()
      syncDirectoryFromApp()
    })()
  },
  [STORAGE_KEYS.DIRECTORY]: () => {
    void (async () => {
      await useDirectoryStore.persist.rehydrate()
      syncDirectoryFromApp()
    })()
  },
  [STORAGE_KEYS.INVITE_REGISTRY]: () => {
    rebuildInviteRegistryFromStores(
      loadInvitesFromDisk(),
      loadObjectMetaFromDisk(),
      buildObjectNameMap(useObjectStore.getState().userObjects, loadUserObjectsFromDisk()),
    )
  },
  [STORAGE_KEYS.ORG_REGISTRY]: () => {
    syncOrganizationRegistryFromStores()
  },
}

/** Подтягивает данные из localStorage при изменении в другой вкладке */
export function initCrossTabStorageSync(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('storage', (event) => {
    if (!event.key || event.newValue == null) return
    const rehydrate = STORES_BY_KEY[event.key]
    if (rehydrate) void rehydrate()
  })
}

/** Принудительно перечитать ключевые сторы перед проверкой кода */
export async function refreshConnectStores(): Promise<void> {
  await Promise.all([
    useObjectAccessStore.persist.rehydrate(),
    useObjectStore.persist.rehydrate(),
  ])
  rebuildInviteRegistryFromStores(
    loadInvitesFromDisk(),
    loadObjectMetaFromDisk(),
    buildObjectNameMap(useObjectStore.getState().userObjects, loadUserObjectsFromDisk()),
  )
}
