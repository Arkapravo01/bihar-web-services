import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AgentMessage } from '@/components/chat/AgentMessage'
import { useActiveEnv } from '@/app/providers/ActiveEnvProvider'
import { runEventBridgeInvestigation } from '../api/eventbridgeApi'

const STORAGE_KEY = 'eventbridge-ai-conversation'

/**
 * The EventBridge agent, on the page.
 *
 * The agent has no idea which page it was asked from, so whatever the operator is
 * looking at is prefixed to the outgoing question as context while the chat
 * bubble keeps showing exactly what they typed. Sending the decorated string and
 * displaying the plain one is the whole trick, and skipping the first half is the
 * mistake this app has made before: a bus name shown in a header badge tells the
 * operator something and the backend nothing.
 *
 * The conversation is kept in localStorage so a page reload does not lose an
 * investigation, and cleared whenever the environment changes, because an answer
 * about QA is wrong about prod and stale context is worse than no context.
 */
export function EventBridgeAiQueryBar({ eventBusName = null, ruleName = null }) {
  const { activeEnvKey } = useActiveEnv()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const [messages, setMessages] = useState([])
  const bottomRef = useRef(null)

  const scope = ruleName ? `rule "${ruleName}" on the "${eventBusName}" bus` : eventBusName ? `the "${eventBusName}" event bus` : null

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
    const queryForAgent = scope
      ? `[Context: the user is currently viewing ${scope} — assume questions refer to it unless they name a different bus or rule.]\n${userText}`
      : userText

    setInput('')
    setMessages((m) => [...m, { role: 'user', text: userText }])
    setLoading(true)

    try {
      const data = await runEventBridgeInvestigation(queryForAgent, history)
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }])
      setHistory(data.history)
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: err.message ?? 'The investigation could not be completed.' }])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const { messages: savedMessages, history: savedHistory } = JSON.parse(stored)
        setMessages(savedMessages ?? [])
        setHistory(savedHistory ?? [])
      }
    } catch {
      // localStorage unavailable or corrupted
    }
  }, [])

  useEffect(() => {
    try {
      if (messages.length > 0 || history.length > 0) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ messages, history }))
      }
    } catch {
      // localStorage unavailable
    }
  }, [messages, history])

  useEffect(() => {
    handleClear()
  }, [activeEnvKey])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [messages, loading])

  const placeholder = messages.length
    ? 'Follow up…'
    : ruleName
      ? 'Ask about this rule — why it might not be firing, what it delivers to'
      : eventBusName
        ? `Ask about ${eventBusName} — what publishes to it, which rules listen`
        : 'Ask about event routing — "which rules are disabled?", "what fires overnight?"'

  return (
    <section className="overflow-hidden rounded-md border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
        <Sparkles className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
        <h2 className="text-sm font-medium text-foreground">Ask the EventBridge agent</h2>
        {scope && (
          <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground" title={scope}>
            {ruleName ?? eventBusName}
          </span>
        )}
        {messages.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 text-xs" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="flex max-h-[420px] flex-col gap-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={
                  m.role === 'user'
                    ? 'max-w-[85%] rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : m.role === 'error'
                      ? 'max-w-[85%] rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive'
                      : 'w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-foreground'
                }
              >
                {m.role === 'assistant' ? <AgentMessage text={m.text} /> : m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 py-2.5">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="size-1.5 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
              <span className="sr-only">The agent is working</span>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className={`flex gap-2 px-4 py-3 ${messages.length > 0 ? 'border-t border-border' : ''}`}
      >
        <Input
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="h-8 flex-1 text-sm"
          disabled={loading}
        />
        <Button type="submit" size="sm" className="shrink-0" disabled={!input.trim() || loading}>
          {loading ? 'Working…' : 'Ask'}
        </Button>
      </form>
    </section>
  )
}
