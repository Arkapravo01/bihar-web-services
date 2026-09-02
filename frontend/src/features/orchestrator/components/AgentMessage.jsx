import { motion } from 'motion/react'
import { Bot, User, AlertTriangle } from 'lucide-react'

// Minimal inline markdown: **bold**, `code`
function inlineFormat(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} className="font-semibold text-white/90">{part.slice(2, -2)}</strong>
    if (part.startsWith('`') && part.endsWith('`'))
      return <code key={i} className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-white/10 text-white/80">{part.slice(1, -1)}</code>
    return part
  })
}

function renderContent(text) {
  return text.split('\n').filter(Boolean).map((line, i) => {
    if (/^[-*•]\s/.test(line.trim())) {
      return (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-1.5 w-1 h-1 rounded-full bg-white/30 shrink-0" />
          <span>{inlineFormat(line.replace(/^[-*•]\s/, ''))}</span>
        </div>
      )
    }
    return <p key={i} className="leading-relaxed">{inlineFormat(line)}</p>
  })
}

const ThinkingDots = () => (
  <div className="flex items-center gap-1">
    {[0, 1, 2].map((i) => (
      <motion.span
        key={i}
        className="block w-1.5 h-1.5 rounded-full bg-white/30"
        animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: 'easeInOut' }}
      />
    ))}
  </div>
)

export function AgentMessage({ role, content, isLoading = false, isError = false }) {
  const isUser = role === 'user'

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div className={`shrink-0 flex items-center justify-center w-6 h-6 rounded-md mt-0.5 ${
        isUser
          ? 'bg-indigo-500/25 text-indigo-300'
          : isError
          ? 'bg-red-500/18 text-red-400'
          : 'bg-white/12 text-white/55'
      }`}>
        {isUser
          ? <User className="w-3 h-3" />
          : isError
          ? <AlertTriangle className="w-3 h-3" />
          : <Bot className="w-3 h-3" />
        }
      </div>

      {/* Bubble */}
      <div className={`max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
        isUser
          ? 'bg-indigo-500/20 text-white/80 rounded-tr-sm'
          : isError
          ? 'bg-red-500/10 border border-red-500/20 text-white/70 rounded-tl-sm'
          : 'bg-white/5 border border-white/8 text-white/65 rounded-tl-sm'
      }`}>
        {isLoading
          ? <ThinkingDots />
          : isUser
          ? <p>{content}</p>
          : <div className="space-y-0.5">{renderContent(content || '')}</div>
        }
      </div>
    </motion.div>
  )
}
