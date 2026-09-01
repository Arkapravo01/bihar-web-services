import { useMemo, useState } from 'react'
import { useQueries } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { PageContainer } from '@/components/layout/PageContainer'
import { ActivityTimeline } from '@/components/data-display/ActivityTimeline'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useActivity } from '@/app/providers/ActivityProvider'
import { useBuckets } from '../hooks/useBuckets'
import { useEnv } from '../hooks/useEnv'
import { listObjects } from '../api/s3Api'
import { BucketStats } from '../components/BucketStats'
import { BucketToolbar } from '../components/BucketToolbar'
import { BucketTable } from '../components/BucketTable'
import { S3AiQueryBar } from '../components/S3AiQueryBar'
import { Cloud } from 'lucide-react'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export function S3OverviewPage() {
  const { data: env } = useEnv()
  const { data: buckets = [], isLoading: bucketsLoading, error: bucketsError } = useBuckets()
  const [search, setSearch] = useState('')
  const { events: activity } = useActivity()

  const objectQueries = useQueries({
    queries: buckets.map((bucket) => ({
      queryKey: ['s3', 'objects', bucket.name, ''],
      queryFn: () => listObjects(bucket.name, ''),
      enabled: buckets.length > 0,
    })),
  })

  const { objectCount, totalBytes } = useMemo(() => {
    let count = 0
    let bytes = 0
    for (const q of objectQueries) {
      for (const file of q.data?.files ?? []) {
        count += 1
        bytes += file.size ?? 0
      }
    }
    return { objectCount: count, totalBytes: bytes }
  }, [objectQueries])

  const filteredBuckets = buckets.filter((b) => b.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="space-y-6"
      >
        {/* Hero Section */}
        <motion.div variants={itemVariants} className="relative overflow-hidden">
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 blur-3xl" />
          <div className="relative space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 ring-1 ring-primary/20">
                <Cloud className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">S3 Storage</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Manage and analyze your AWS S3 buckets</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants}>
          <BucketStats bucketCount={buckets.length} objectCount={objectCount} totalBytes={totalBytes} />
        </motion.div>

        {/* AI Query Bar */}
        <motion.div variants={itemVariants}>
          <S3AiQueryBar />
        </motion.div>

        {/* Buckets Section */}
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Buckets</h2>
              <p className="text-xs text-muted-foreground mt-1">{filteredBuckets.length} of {buckets.length} buckets</p>
            </div>
            <BucketToolbar value={search} onChange={setSearch} />
          </div>
          <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden ring-1 ring-white/5">
            <BucketTable buckets={filteredBuckets} loading={bucketsLoading} env={env} error={bucketsError} />
          </div>
        </motion.div>

        {/* Activity Section */}
        <motion.div variants={itemVariants}>
          <Card className="rounded-xl border bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5">
            <CardHeader className="border-b border-border/50">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <ActivityTimeline events={activity} />
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}
