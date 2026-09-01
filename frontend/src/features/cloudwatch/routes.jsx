import { CloudWatchOverviewPage } from './pages/CloudWatchOverviewPage'
import { LogGroupDetailsPage } from './pages/LogGroupDetailsPage'

export const cloudwatchRoutes = [
  { path: 'cloudwatch', element: <CloudWatchOverviewPage /> },
  { path: 'cloudwatch/log-groups/*', element: <LogGroupDetailsPage /> },
]
