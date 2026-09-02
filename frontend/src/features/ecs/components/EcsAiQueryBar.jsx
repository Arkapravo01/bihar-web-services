import { useState } from 'react'
import { motion } from 'motion/react'
import { Send, Loader2 } from 'lucide-react'
import { runEcsInvestigation } from '../api/ecsApi'

export function EcsAiQueryBar({ clusterName = null, onResult = null, isLoading: externalLoading = false }) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const query = input.trim()
    if (!query || isLoading) return

    const contextualQuery = clusterName
      ? `[Context: the user is currently viewing ECS cluster "${clusterName}" — assume questions refer to it unless they name a different one.]\n${query}`
      : query

    setIsLoading(true)
    try {
      const result = await runEcsInvestigation(contextualQuery, [])
      setInput('')
      if (onResult) onResult(result)
    } catch (err) {
      console.error('Investigation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loading = isLoading || externalLoading

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask about${clusterName ? ` ${clusterName}` : ' your ECS infrastructure'}...`}
          disabled={loading}
          className="flex-1 bg-transparent text-slate-900 dark:text-slate-50 placeholder-slate-500 dark:placeholder-slate-400 outline-none"
        />
        <motion.button
          type="submit"
          disabled={!input.trim() || loading}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="p-2 rounded text-slate-900 dark:text-slate-50 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </motion.button>
      </div>
    </form>
  )
}
