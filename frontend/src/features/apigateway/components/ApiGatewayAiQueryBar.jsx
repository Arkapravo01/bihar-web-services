import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { runApiGatewayInvestigation } from '../api/apiGatewayApi'
import { AgentMessage } from '@/components/chat/AgentMessage'

const STORAGE_KEY = 'apigateway-ai-conversation'

export function ApiGatewayAiQueryBar({ apiName = null, apiId = null }) {
  const { activeEnvKey } = useActiveEnv()
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  function handleClear() {
    setMessages([])
    setHistory([])
    setInput('')
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // localStorage unavailable
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    const queryForAgent = apiName
      ? `[Context: the user is currently viewing REST API "${apiName}" (id: ${apiId}) — assume questions refer to it unless they name a different API.]\n${userText}`
      : userText
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userText }])
    setLoading(true)

    try {
      const data = await runApiGatewayInvestigation(queryForAgent, history)
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }])
      setHistory(data.history)
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message ?? 'Investigation failed.' }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { messages: savedMessages, history: savedHistory } = JSON.parse(stored)
        setMessages(savedMessages)
        setHistory(savedHistory)
      }
    } catch {
      // localStorage unavailable or corrupted — just start fresh
    }
  }, [])

  useEffect(() => {
    handleClear()
  }, [activeEnvKey])

  useEffect(() => {
    try {
      if (messages.length > 0 || history.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, history }))
      }
    } catch {
      // localStorage unavailable — silently fail
    }
  }, [messages, history])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5 flex flex-col overflow-hidden min-h-[120px] hover-lift">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <span className="text-base float-icon">🌐</span>
        <span className="text-sm font-semibold">API Gateway AI Advisor</span>
        {apiName && (
          <span className="text-xs text-muted-foreground font-mono bg-primary/10 rounded-lg px-2.5 py-0.5 ml-auto mr-auto ring-1 ring-primary/20">
            {apiName}
          </span>
        )}
        <span className="text-[10px] text-primary font-bold rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 ml-1 uppercase tracking-widest">New</span>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-xs h-7 px-2 text-muted-foreground hover:text-foreground transition-colors" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 px-4 py-4 max-h-[420px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-3.5 py-2.5 text-sm leading-relaxed transition-all duration-200 ${
                m.role === 'user'
                  ? 'max-w-[85%] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-xl shadow-sm ring-1 ring-primary/20'
                  : m.role === 'error'
                  ? 'max-w-[85%] bg-destructive/10 text-destructive border border-destructive/30 rounded-lg'
                  : 'w-full bg-muted/60 border border-border/50 text-foreground rounded-lg'
              }`}>
                {m.role === 'assistant' ? <AgentMessage text={m.text} /> : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2.5 bg-muted/60 border border-border/50 flex items-center gap-2">
                <span className="size-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-2 rounded-full bg-primary/70 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className={`flex gap-2 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent ${messages.length > 0 ? 'border-t border-border/50' : ''}`}>
        <Input
          placeholder={
            messages.length === 0
              ? apiName
                ? `Ask about this API — e.g. "What stages exist?", "Show all routes"`
                : 'Ask about your APIs — e.g. "Which APIs have a prod stage?"'
              : 'Follow up…'
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-sm rounded-lg border-border/50 bg-background/50 focus:bg-background transition-colors"
          disabled={loading}
          autoFocus
        />
        <Button
          type="submit"
          variant="secondary"
          size="sm"
          className="shrink-0 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all"
          disabled={!input.trim() || loading}
        >
          {loading ? 'Thinking…' : 'Send'}
        </Button>
      </form>

      {/* Idle hint */}
      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground px-4 pb-3">
          {apiName
            ? `Inspect ${apiName} — ask about stages, routes, deployments, or backend integrations.`
            : 'Analyze your REST APIs with natural language. Ask about stages, routes, or integration details.'}
        </p>
      )}
    </div>
  )
}
