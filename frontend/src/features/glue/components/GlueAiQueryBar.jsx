import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { runGlueInvestigation } from '../api/glueApi'
import { AgentMessage } from '@/components/chat/AgentMessage'

const STORAGE_KEY = 'glue-ai-conversation'

export function GlueAiQueryBar({ contextName = null, contextType = null }) {
  const { activeEnvKey } = useActiveEnv()
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  function handleClear() {
    setMessages([]); setHistory([]); setInput('')
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const userText = input.trim()
    const queryForAgent = contextName
      ? `[Context: the user is currently viewing Glue ${contextType ?? 'resource'} "${contextName}" — assume questions refer to it unless they name a different one.]\n${userText}`
      : userText
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userText }])
    setLoading(true)
    try {
      const data = await runGlueInvestigation(queryForAgent, history)
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
      if (stored) { const { messages: m, history: h } = JSON.parse(stored); setMessages(m); setHistory(h) }
    } catch {}
  }, [])

  useEffect(() => { handleClear() }, [activeEnvKey])

  useEffect(() => {
    try {
      if (messages.length > 0 || history.length > 0)
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, history }))
    } catch {}
  }, [messages, history])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5 flex flex-col overflow-hidden min-h-[120px] hover-lift">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <span className="text-base float-icon">🔄</span>
        <span className="text-sm font-semibold">Glue AI Advisor</span>
        {contextName && (
          <span className="text-xs text-muted-foreground font-mono bg-primary/10 rounded-lg px-2.5 py-0.5 ml-auto mr-auto ring-1 ring-primary/20">
            {contextName}
          </span>
        )}
        <span className="text-[10px] text-primary font-bold rounded-full border border-primary/30 bg-primary/5 px-2.5 py-0.5 ml-1 uppercase tracking-widest">Beta</span>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-xs h-7 px-2 text-muted-foreground hover:text-foreground" onClick={handleClear}>Clear</Button>
        )}
      </div>

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

      <form onSubmit={handleSubmit} className={`flex gap-2 px-4 py-3 bg-gradient-to-r from-primary/5 to-transparent ${messages.length > 0 ? 'border-t border-border/50' : ''}`}>
        <Input
          placeholder={messages.length === 0
            ? contextName ? `Ask about this ${contextType ?? 'resource'} — e.g. "Why did it fail?", "Show run history"`
            : 'Ask about Glue — e.g. "Which jobs failed today?", "List all crawlers"'
            : 'Follow up…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-sm rounded-lg border-border/50 bg-background/50 focus:bg-background transition-colors"
          disabled={loading}
          autoFocus
        />
        <Button type="submit" variant="secondary" size="sm"
          className="shrink-0 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all"
          disabled={!input.trim() || loading}>
          {loading ? 'Thinking…' : 'Send'}
        </Button>
      </form>

      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground px-4 pb-3">
          {contextName
            ? `Investigate ${contextName} — ask about configuration, run history, errors, or performance.`
            : 'Analyze your Glue jobs, crawlers, and databases with natural language.'}
        </p>
      )}
    </div>
  )
}
