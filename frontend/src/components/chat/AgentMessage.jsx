/**
 * AgentMessage — renders an agent reply with proper formatting.
 *
 * Handles:
 *  - Download: <url>  → styled download button
 *  - **bold** inline text
 *  - Bullet lists  (lines starting with "- ")  → <ul>
 *  - Code blocks   (``` ... ```)               → <pre><code>
 *  - Plain text paragraphs                     → <p>
 *
 * No external deps — pure React.
 */

// Render a string with **bold** spans inline
function renderInline(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    }
    return part
  })
}

function renderBulletList(items, key) {
  return (
    <ul key={key} className="my-1.5 space-y-1 pl-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm text-foreground/90 leading-relaxed">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" />
          <span>{renderInline(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function renderCodeBlock(code, key) {
  return (
    <pre key={key} className="my-2 rounded-lg bg-muted/80 border border-border/40 px-3 py-2.5 text-xs font-mono overflow-x-auto text-foreground/90 whitespace-pre">
      <code>{code.trim()}</code>
    </pre>
  )
}

function parseBlocks(text) {
  const blocks = []
  const lines = text.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Code block
    if (line.startsWith('```')) {
      const codeLines = []
      i++
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing ```
      blocks.push({ type: 'code', content: codeLines.join('\n') })
      continue
    }

    // Bullet list — collect consecutive "- " lines (allow leading spaces)
    if (/^\s*-\s/.test(line)) {
      const items = []
      while (i < lines.length && /^\s*-\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*-\s/, '').trim())
        i++
      }
      blocks.push({ type: 'bullets', content: items })
      continue
    }

    // Plain text — collect until next special block
    const textLines = []
    while (
      i < lines.length &&
      !lines[i].startsWith('```') &&
      !/^\s*-\s/.test(lines[i])
    ) {
      textLines.push(lines[i])
      i++
    }
    const chunk = textLines.join('\n').trim()
    if (chunk) blocks.push({ type: 'text', content: chunk })
  }

  return blocks
}

export function AgentMessage({ text }) {
  const blocks = parseBlocks(text)

  return (
    <div className="text-sm leading-relaxed space-y-1">
      {blocks.map((block, i) => {
        if (block.type === 'bullets') {
          return renderBulletList(block.content, i)
        }
        if (block.type === 'code') {
          return renderCodeBlock(block.content, i)
        }
        // plain text — preserve line breaks, render inline bold
        return (
          <p key={i} className="whitespace-pre-wrap text-foreground/90">
            {renderInline(block.content)}
          </p>
        )
      })}
    </div>
  )
}
