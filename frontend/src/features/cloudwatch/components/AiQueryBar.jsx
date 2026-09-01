import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { runInvestigation } from '../api/cloudwatchApi'

export function AiQueryBar() {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])   // [{role, content}] sent to backend
  const [messages, setMessages] = useState([]) // [{role, text}] shown in UI
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userText }])
    setLoading(true)

    try {
      const data = await runInvestigation(userText, history)
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }])
      setHistory(data.history)
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message ?? 'Investigation failed.' }])
    } finally {
      setLoading(false)
    }
  }

  function handleClear() {
    setMessages([])
    setHistory([])
    setInput('')
  }

  return (
    <div className="rounded-lg border bg-card flex flex-col overflow-hidden min-h-[120px]">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b">
        <span className="text-base">🔍</span>
        <span className="text-sm font-medium">AI Investigation</span>
        <span className="text-xs text-muted-foreground rounded-full border px-2 py-0.5 ml-1">Phase 2</span>
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-xs h-7 px-2 text-muted-foreground" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="flex flex-col gap-3 px-4 py-4 max-h-[420px] overflow-y-auto">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`rounded-lg px-3 py-2 text-sm max-w-[85%] whitespace-pre-wrap leading-relaxed ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : m.role === 'error'
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-muted/40 border text-foreground'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-lg px-3 py-2 bg-muted/40 border flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className={`flex gap-2 px-4 py-3 ${messages.length > 0 ? 'border-t' : ''}`}>
        <Input
          placeholder={messages.length === 0 ? 'Ask about your logs — e.g. "Are there errors in the email service?"' : 'Follow up…'}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 text-sm"
          disabled={loading}
          autoFocus
        />
        <Button type="submit" variant="secondary" size="sm" className="shrink-0" disabled={!input.trim() || loading}>
          {loading ? 'Thinking…' : 'Send'}
        </Button>
      </form>

      {/* Idle hint */}
      {messages.length === 0 && (
        <p className="text-xs text-muted-foreground px-4 pb-3">
          Investigate your CloudWatch logs with natural language. The agent searches for you.
        </p>
      )}
    </div>
  )
}
