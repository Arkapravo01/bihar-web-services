import { GlueOverviewPage }          from './pages/GlueOverviewPage'
import { GlueJobDetailPage }         from './pages/GlueJobDetailPage'
import { GlueCrawlerDetailPage }     from './pages/GlueCrawlerDetailPage'
import { GlueDatabaseDetailPage }    from './pages/GlueDatabaseDetailPage'
import { GlueWorkflowDetailPage }    from './pages/GlueWorkflowDetailPage'

export const glueRoutes = [
  { path: '/glue',                               element: <GlueOverviewPage /> },
  { path: '/glue/workflows/:workflowName',       element: <GlueWorkflowDetailPage /> },
  { path: '/glue/jobs/:jobName',                 element: <GlueJobDetailPage /> },
  { path: '/glue/crawlers/:crawlerName',         element: <GlueCrawlerDetailPage /> },
  { path: '/glue/databases/:dbName',             element: <GlueDatabaseDetailPage /> },
]
