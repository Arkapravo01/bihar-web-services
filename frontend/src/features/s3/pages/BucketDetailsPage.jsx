import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BucketDetailsHeader } from '../components/BucketDetailsHeader'
import { ObjectBrowser } from '../components/ObjectBrowser'
import { MetricsPanel } from '../components/MetricsPanel'
import { PermissionsPanel } from '../components/PermissionsPanel'
import { S3AiQueryBar } from '../components/S3AiQueryBar'
import { useEnv } from '../hooks/useEnv'

const COMING_SOON_TABS = ['properties', 'events']

export function BucketDetailsPage() {
  const { bucketName } = useParams()
  const { data: env } = useEnv()
  const [activeTab, setActiveTab] = useState('objects')

  return (
    <PageContainer>
      <BucketDetailsHeader bucketName={bucketName} env={env} />

      <S3AiQueryBar bucketName={bucketName} />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="objects">Objects</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          {COMING_SOON_TABS.map((tab) => (
            <TabsTrigger key={tab} value={tab} disabled className="capitalize">
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="objects" className="mt-4">
          <ObjectBrowser bucketName={bucketName} env={env} />
        </TabsContent>

        <TabsContent value="metrics" className="mt-4">
          <MetricsPanel bucketName={bucketName} active={activeTab === 'metrics'} />
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <PermissionsPanel bucketName={bucketName} active={activeTab === 'permissions'} />
        </TabsContent>

        {COMING_SOON_TABS.map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4 text-sm text-muted-foreground">
            Coming soon.
          </TabsContent>
        ))}
      </Tabs>
    </PageContainer>
  )
}
