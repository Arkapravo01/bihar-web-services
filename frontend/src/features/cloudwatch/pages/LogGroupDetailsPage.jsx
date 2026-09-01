import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageContainer } from '@/components/layout/PageContainer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import { useLogStreams } from '../hooks/useLogStreams'
import { useLogEvents } from '../hooks/useLogEvents'
import { LogStreamsTable } from '../components/LogStreamsTable'
import { LogEventsViewer } from '../components/LogEventsViewer'
import { CloudWatchAiBar } from '../components/CloudWatchAiBar'

export function LogGroupDetailsPage() {
  const params = useParams()
  const navigate = useNavigate()
  // params['*'] captures the path after /cloudwatch/log-groups/
  // AWS log group names start with "/", so we prepend it back
  const logGroupName = '/' + params['*']

  const [selectedStream, setSelectedStream] = useState(null)
  const [activeTab, setActiveTab] = useState('streams')

  const { data: streamsData, isLoading: streamsLoading } = useLogStreams(logGroupName, { limit: 50, orderBy: 'LastEventTime', descending: true })
  const { data: eventsData, isLoading: eventsLoading } = useLogEvents(
    logGroupName,
    selectedStream?.name,
    { limit: 100, startFromHead: false }
  )

  const logStreams = streamsData?.logStreams ?? []
  const logEvents = eventsData?.events ?? []

  function handleSelectStream(stream) {
    setSelectedStream(stream)
    setActiveTab('events')
  }

  return (
    <PageContainer>
      <div className="flex items-center gap-4 justify-between min-w-0">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold font-mono truncate">{logGroupName}</h1>
          <p className="text-sm text-muted-foreground">Log streams</p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4 mr-2" />
          Back
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="max-w-full w-auto">
          <TabsTrigger value="streams" className="shrink-0">Streams</TabsTrigger>
          <TabsTrigger value="events" disabled={!selectedStream} className="min-w-0 max-w-[240px]">
            <span className="truncate block">
              Events {selectedStream ? `(${selectedStream.name})` : ''}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="streams" className="mt-4">
          <div className="rounded-lg border">
            <LogStreamsTable
              logStreams={logStreams}
              loading={streamsLoading}
              onSelect={handleSelectStream}
            />
          </div>
        </TabsContent>

        <TabsContent value="events" className="mt-4">
          {selectedStream && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 justify-between min-w-0">
                <p className="text-sm font-mono text-muted-foreground truncate min-w-0 flex-1">{selectedStream.name}</p>
                <Button variant="outline" size="sm" className="shrink-0 whitespace-nowrap" onClick={() => { setSelectedStream(null); setActiveTab('streams') }}>
                  Change stream
                </Button>
              </div>
              <CloudWatchAiBar logGroupName={logGroupName} logStreamName={selectedStream.name} events={logEvents} />
              <LogEventsViewer events={logEvents} loading={eventsLoading} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
