import { S3OverviewPage } from './pages/S3OverviewPage'
import { BucketDetailsPage } from './pages/BucketDetailsPage'

export const s3Routes = [
  { path: 's3', element: <S3OverviewPage /> },
  { path: 's3/buckets/:bucketName', element: <BucketDetailsPage /> },
]
