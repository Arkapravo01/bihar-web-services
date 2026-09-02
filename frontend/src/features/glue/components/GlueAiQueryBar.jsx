import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Send, Loader } from 'lucide-react'
import { runGlueInvestigation } from '../api/glueApi'

export function GlueAiQueryBar({ databaseName = null }) {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState([])
  const messagesEndRef = useRef(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSubmit(e) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userText = input.trim()
    const queryForAgent = databaseName
      ? `[Context: the user is currently viewing Glue database "${databaseName}" — assume questions refer to it unless they name a different one.]\n${userText}`
      : userText

    setMessages((m) => [...m, { role: 'user', text: userText }])
    setInput('')
    setLoading(true)

    try {
      const data = await runGlueInvestigation(queryForAgent, history)
      setMessages((m) => [...m, { role: 'assistant', text: data.reply }])
      setHistory(data.history || [])
    } catch (err) {
      setMessages((m) => [...m, { role: 'error', text: `Error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Glue AI Assistant</h3>
      </div>

      <div className="max-h-64 overflow-y-auto space-y-2 text-sm">
        <AnimatePresence>
          {messages.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400 text-xs">Ask about databases, jobs, crawlers, or data quality...</p>
          ) : (
            messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-2 rounded ${
                  msg.role === 'user'
                    ? 'bg-blue-100 dark:bg-blue-900 text-slate-900 dark:text-slate-50 ml-4'
                    : msg.role === 'error'
                      ? 'bg-red-100 dark:bg-red-900 text-red-900 dark:text-red-100'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-50 mr-4'
                }`}
              >
                {msg.text}
              </motion.div>
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your Glue resources..."
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={loading}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  )
}
