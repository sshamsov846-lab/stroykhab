import React from 'react'

import { useUserStore } from '@store/userStore'

import { Dashboard } from '@screens/Dashboard'

import { WorkerDashboard } from '@screens/WorkerDashboard'

import { ClientHome } from '@screens/client/ClientHome'

import { SubcontractorDashboard } from '@screens/subcontractor/SubcontractorDashboard'

export const RoleHome: React.FC = () => {

  const role = useUserStore((s) => s.role)

  if (role === 'client') return <ClientHome />

  if (role === 'worker') return <WorkerDashboard />

  if (role === 'subcontractor') return <SubcontractorDashboard />

  return <Dashboard />

}
