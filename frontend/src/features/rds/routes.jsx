import { RdsOverviewPage } from './pages/RdsOverviewPage'
import { RdsInstanceDetailPage } from './pages/RdsInstanceDetailPage'

export const rdsRoutes = [
  { path: '/rds', element: <RdsOverviewPage /> },
  { path: '/rds/:instanceId', element: <RdsInstanceDetailPage /> },
]
