import { IAMOverviewPage } from './pages/IAMOverviewPage'
import { IAMUserDetailPage } from './pages/IAMUserDetailPage'

export const iamRoutes = [
  { path: '/iam', element: <IAMOverviewPage /> },
  { path: '/iam/users/:userName', element: <IAMUserDetailPage /> },
]
