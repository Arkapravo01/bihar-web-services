import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Bot, Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { OrchestratorQueryBar } from '../components/OrchestratorQueryBar'
import { AgentMessage } from '../components/AgentMessage'
import { AgentNetworkVisualization } from '../components/AgentNetworkVisualization'
import { useOrchestratorInvestigation } from '../hooks/useOrchestratorInvestigation'

const SUGGESTIONS = [
  'Which Lambda functions have the highest error rates?',
  'Are there RDS instances with low storage space?',
  'List IAM users with administrator access',
  'Show CloudWatch alarms currently in ALARM state',
]

export function AgentCenterPage() {
  const [messages, setMessages] = useState([])
  const [currentTrace, setCurrentTrace] = useState([])
  const [chatOpen, setChatOpen] = useState(false)
  const [conversationId] = useState(() => `orch-${Date.now()}`)
  const bottomRef = useRef(null)
  const investigation = useOrchestratorInvestigation()

  useEffect(() => {
    const saved = localStorage.getItem(`orchestrator-${conversationId}`)
    if (saved) {
      try {
        const { messages: savedMessages } = JSON.parse(saved)
        setMessages(savedMessages)
        if (savedMessages.length > 0) setChatOpen(true)
      } catch { /* ignore */ }
    }
  }, [conversationId])

  useEffect(() => {
    if (messages.length > 0) setChatOpen(true)
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, investigation.isPending])

  const history = useMemo(
    () => messages.map((m) => ({ role: m.role, content: m.content })),
    [messages]
  )

  function handleSubmit(query) {
    const userMessage = { role: 'user', content: query }
    setMessages((m) => [...m, userMessage])
    setCurrentTrace([])

    investigation.mutate(
      { query, history },
      {
        onSuccess: (data) => {
          const agentMessage = {
            role: 'assistant',
            content: data.reply,
            trace: data.orchestration_trace || [],
          }
          setMessages((m) => [...m, agentMessage])
          setCurrentTrace(data.orchestration_trace || [])
          localStorage.setItem(
            `orchestrator-${conversationId}`,
            JSON.stringify({ messages: [...messages, userMessage, agentMessage] })
          )
        },
        onError: (error) => {
          setMessages((m) => [
            ...m,
            { role: 'assistant', content: `Error: ${error.message}`, isError: true },
          ])
        },
      }
    )
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] overflow-hidden bg-[#0e1521]">

      {/* ── VISUALIZATION (fills remaining space) ─────────────── */}
      <div className="flex-1 min-h-0 relative">
        <AgentNetworkVisualization
          trace={currentTrace}
          isLoading={investigation.isPending}
        />

        {/* Idle hint — shown only before first message */}
        <AnimatePresence>
          {isEmpty && !investigation.isPending && (
            <motion.div
              key="idle-hint"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: 0.6 }}
              className="absolute inset-x-0 top-6 flex flex-col items-center gap-2 pointer-events-none"
            >
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/8 border border-white/15 backdrop-blur-sm">
                <Sparkles className="w-3.5 h-3.5 text-white/60" />
                <span className="text-xs text-white/60 font-mono">Ask a question below to activate agents</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggestion chips — idle state only */}
        <AnimatePresence>
          {isEmpty && !investigation.isPending && (
            <motion.div
              key="suggestions"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ delay: 0.8 }}
              className="absolute inset-x-0 bottom-4 flex flex-wrap justify-center gap-2 px-6 pointer-events-auto"
            >
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSubmit(s)}
                  className="text-xs px-3.5 py-1.5 rounded-full border border-white/15 bg-white/8 text-white/60 hover:text-white/90 hover:border-white/30 hover:bg-white/14 transition-all duration-150 backdrop-blur-sm"
                >
                  {s}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CHAT PANEL (collapsible strip above input) ─────────── */}
      <div className="shrink-0 border-t border-white/10 bg-[#131d2e]/95 backdrop-blur-xl">

        {/* Chat toggle row */}
        {messages.length > 0 && (
          <button
            onClick={() => setChatOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-2 hover:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-3.5 h-3.5 text-white/40 group-hover:text-white/65 transition-colors" />
              <span className="text-[11px] font-mono text-white/40 group-hover:text-white/65 transition-colors">
                {messages.length} message{messages.length !== 1 ? 's' : ''}
              </span>
            </div>
            {chatOpen
              ? <ChevronDown className="w-3.5 h-3.5 text-white/30 group-hover:text-white/55 transition-colors" />
              : <ChevronUp   className="w-3.5 h-3.5 text-white/30 group-hover:text-white/55 transition-colors" />
            }
          </button>
        )}

        {/* Scrollable message list */}
        <AnimatePresence initial={false}>
          {chatOpen && messages.length > 0 && (
            <motion.div
              key="chat"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 200, opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="h-[200px] overflow-y-auto px-4 py-3 space-y-2.5 scrollbar-thin">
                {messages.map((msg, idx) => (
                  <AgentMessage
                    key={idx}
                    role={msg.role}
                    content={msg.content}
                    isError={msg.isError}
                  />
                ))}
                {investigation.isPending && <AgentMessage role="assistant" isLoading />}
                <div ref={bottomRef} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input */}
        <div className="px-4 py-3">
          <OrchestratorQueryBar
            onSubmit={handleSubmit}
            isLoading={investigation.isPending}
          />
        </div>
      </div>
    </div>
  )
}
