import { EcsOverviewPage } from './pages/EcsOverviewPage'
import { EcsClusterDetailPage } from './pages/EcsClusterDetailPage'
import { EcsServiceDetailPage } from './pages/EcsServiceDetailPage'

export const ecsRoutes = [
  { path: '/ecs', element: <EcsOverviewPage /> },
  { path: '/ecs/:clusterName', element: <EcsClusterDetailPage /> },
  { path: '/ecs/:clusterName/services/:serviceName', element: <EcsServiceDetailPage /> },
]
