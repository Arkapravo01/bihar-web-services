import { SecretsOverviewPage } from './pages/SecretsOverviewPage'
import { SecretDetailPage } from './pages/SecretDetailPage'

export const secretsRoutes = [
  { path: '/secrets', element: <SecretsOverviewPage /> },
  { path: '/secrets/:secretName', element: <SecretDetailPage /> },
]
