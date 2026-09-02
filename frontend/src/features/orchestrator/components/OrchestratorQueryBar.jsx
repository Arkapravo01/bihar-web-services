import { useState, useRef } from 'react'
import { motion } from 'motion/react'
import { Send, Loader2 } from 'lucide-react'

export function OrchestratorQueryBar({ onSubmit, isLoading = false }) {
  const [input, setInput] = useState('')
  const inputRef = useRef(null)

  function handleSubmit(e) {
    e.preventDefault()
    const query = input.trim()
    if (!query || isLoading) return
    onSubmit(query)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const canSubmit = input.trim().length > 0 && !isLoading

  return (
    <form onSubmit={handleSubmit}>
      <div
        className={`flex items-center gap-3 rounded-xl px-4 py-2.5 transition-all duration-200 ${
          isLoading
            ? 'bg-white/5 border border-white/10'
            : 'bg-white/5 border border-white/10 hover:border-white/20 focus-within:border-white/25 focus-within:bg-white/7'
        }`}
      >
        {/* Bouncing dots while loading */}
        {isLoading && (
          <div className="flex items-center gap-0.5 shrink-0">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block w-1 h-1 rounded-full bg-white/40"
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 0.55, repeat: Infinity, delay: i * 0.13, ease: 'easeInOut' }}
              />
            ))}
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Agents are working…' : 'Ask about your AWS infrastructure…'}
          disabled={isLoading}
          className="flex-1 bg-transparent text-sm text-white/80 placeholder-white/25 outline-none disabled:opacity-50 min-w-0"
        />

        <motion.button
          type="submit"
          disabled={!canSubmit}
          whileHover={canSubmit ? { scale: 1.08 } : {}}
          whileTap={canSubmit ? { scale: 0.92 } : {}}
          className={`shrink-0 flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150 ${
            canSubmit
              ? 'bg-indigo-500 text-white shadow-[0_0_12px_rgba(99,102,241,0.5)] hover:bg-indigo-400 hover:shadow-[0_0_18px_rgba(99,102,241,0.7)]'
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          {isLoading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />
          }
        </motion.button>
      </div>
    </form>
  )
}
