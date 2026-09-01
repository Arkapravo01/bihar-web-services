import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'motion/react'
import hljs from 'highlight.js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useFunctionFiles } from '../hooks/useFunctionFiles'
import { useDeployFunction } from '../hooks/useDeployFunction'
import { Terminal, Folder, FolderOpen, FileWarning, UploadCloud, ChevronRight } from 'lucide-react'

const LANGUAGE_BY_EXT = {
  py: 'python',
  js: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  ts: 'typescript',
  json: 'json',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  sh: 'bash',
  sql: 'sql',
  go: 'go',
  java: 'java',
  rb: 'ruby',
}

function detectLanguage(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  return LANGUAGE_BY_EXT[ext] || 'plaintext'
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightCode(content, path) {
  const language = detectLanguage(path)
  let html
  try {
    html = hljs.highlight(content, { language, ignoreIllegals: true }).value
  } catch {
    try {
      html = hljs.highlightAuto(content).value
    } catch {
      html = escapeHtml(content)
    }
  }
  return content.endsWith('\n') ? `${html}\n` : html
}

const LANG_DOT = {
  py: 'bg-sky-400',
  js: 'bg-amber-400',
  mjs: 'bg-amber-400',
  cjs: 'bg-amber-400',
  ts: 'bg-blue-400',
  json: 'bg-orange-400',
  md: 'bg-slate-400',
  yml: 'bg-violet-400',
  yaml: 'bg-violet-400',
  env: 'bg-emerald-400',
  sh: 'bg-emerald-500',
  txt: 'bg-muted-foreground',
}

function langDot(path) {
  const ext = path.split('.').pop()?.toLowerCase()
  return LANG_DOT[ext] || 'bg-muted-foreground/50'
}

function buildTree(files) {
  const root = { name: '', path: '', children: new Map(), file: null }
  for (const file of files) {
    const parts = file.path.split('/')
    let node = root
    let currentPath = ''
    parts.forEach((part, i) => {
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLastPart = i === parts.length - 1
      if (!node.children.has(part)) {
        node.children.set(part, { name: part, path: currentPath, children: new Map(), file: isLastPart ? file : null })
      } else if (isLastPart) {
        node.children.get(part).file = file
      }
      node = node.children.get(part)
    })
  }
  return root
}

function guessDefaultFile(files) {
  const py = files.find((f) => f.path.endsWith('.py') && !f.path.includes('/') && !f.isBinary)
  const js = files.find((f) => f.path.endsWith('.js') && !f.path.includes('/') && !f.isBinary)
  const anyText = files.find((f) => !f.isBinary)
  return py || js || anyText || null
}

const rowVariants = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0 },
}

function TreeNode({ node, depth, selectedPath, dirtyPaths, expanded, onToggle, onSelectFile }) {
  const entries = [...node.children.values()].sort((a, b) => {
    const aIsFolder = a.children.size > 0
    const bIsFolder = b.children.size > 0
    if (aIsFolder !== bIsFolder) return aIsFolder ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return (
    <motion.div initial="hidden" animate="visible" variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.02 } } }}>
      {entries.map((entry) => {
        const isFolder = entry.children.size > 0
        if (isFolder) {
          const isOpen = expanded.has(entry.path)
          return (
            <div key={entry.path}>
              <motion.button
                variants={rowVariants}
                whileHover={{ x: 1 }}
                onClick={() => onToggle(entry.path)}
                style={{ paddingLeft: `${depth * 14 + 10}px` }}
                className="flex w-full items-center gap-1.5 py-1.5 text-left text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className={`size-3 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
                {isOpen ? <FolderOpen className="size-3.5 shrink-0 text-primary/70" /> : <Folder className="size-3.5 shrink-0" />}
                <span className="truncate">{entry.name}</span>
              </motion.button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="overflow-hidden"
                  >
                    <TreeNode
                      node={entry}
                      depth={depth + 1}
                      selectedPath={selectedPath}
                      dirtyPaths={dirtyPaths}
                      expanded={expanded}
                      onToggle={onToggle}
                      onSelectFile={onSelectFile}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        }
        const isSelected = entry.path === selectedPath
        const isDirty = dirtyPaths.has(entry.path)
        return (
          <motion.button
            key={entry.path}
            variants={rowVariants}
            whileHover={{ x: 1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelectFile(entry.file)}
            style={{
              paddingLeft: `${depth * 14 + 26}px`,
              boxShadow: isSelected ? 'inset 2px 0 0 0 var(--primary)' : 'none',
            }}
            className={`relative flex w-full items-center gap-2 py-1.5 pr-2.5 text-left text-xs transition-colors duration-150 ${
              isSelected ? 'bg-primary/10 text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {entry.file?.isBinary ? (
              <FileWarning className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <span className={`size-1.5 rounded-full shrink-0 ${langDot(entry.name)}`} />
            )}
            <span className="truncate flex-1 font-mono">{entry.name}</span>
            {isDirty && (
              <span className="relative flex size-1.5 shrink-0">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-500/60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-amber-500" />
              </span>
            )}
          </motion.button>
        )
      })}
    </motion.div>
  )
}

function LineNumbers({ content, scrollTop }) {
  const lineCount = Math.max(content.split('\n').length, 1)
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = scrollTop
  }, [scrollTop])

  return (
    <div
      ref={ref}
      className="select-none overflow-hidden bg-black/[0.03] dark:bg-black/20 px-3 py-3 text-right font-mono text-[13px] leading-[1.65] text-muted-foreground/40"
      style={{ width: '3.25rem' }}
    >
      {Array.from({ length: lineCount }, (_, i) => (
        <div key={i}>{i + 1}</div>
      ))}
    </div>
  )
}

export function FunctionCodeExplorer({ functionName }) {
  const { data, isLoading, isError } = useFunctionFiles(functionName)
  const { mutate: deploy, isPending: isDeploying } = useDeployFunction()

  const files = useMemo(() => data?.files ?? [], [data])
  const tree = useMemo(() => buildTree(files), [files])

  const [selectedFile, setSelectedFile] = useState(null)
  const [edits, setEdits] = useState({})
  const [expanded, setExpanded] = useState(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    if (files.length > 0 && !selectedFile) {
      setSelectedFile(guessDefaultFile(files))
      setExpanded(new Set(files.map((f) => f.path.split('/').slice(0, -1).join('/')).filter(Boolean)))
    }
  }, [files, selectedFile])

  const dirtyPaths = useMemo(() => new Set(Object.keys(edits)), [edits])
  const hasChanges = dirtyPaths.size > 0

  function toggleFolder(path) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function selectFile(file) {
    setScrollTop(0)
    setSelectedFile(file)
  }

  function handleContentChange(value) {
    if (!selectedFile) return
    setEdits((prev) => {
      const next = { ...prev }
      if (value === selectedFile.content) {
        delete next[selectedFile.path]
      } else {
        next[selectedFile.path] = value
      }
      return next
    })
  }

  function handleDiscard() {
    setEdits({})
    toast.info('Changes discarded')
  }

  function handleDeploy() {
    setConfirmOpen(false)
    const count = Object.keys(edits).length
    deploy(
      { functionName, edits },
      {
        onSuccess: () => {
          toast.success('Deployed', { description: `${count} file${count !== 1 ? 's' : ''} pushed to ${functionName}.` })
          setEdits({})
        },
        onError: (err) => {
          toast.error('Deploy failed', { description: err.message })
        },
      }
    )
  }

  const currentContent = selectedFile ? (edits[selectedFile.path] ?? selectedFile.content ?? '') : ''
  const highlightedHtml = useMemo(() => {
    if (!selectedFile || selectedFile.isBinary) return ''
    return highlightCode(currentContent, selectedFile.path)
  }, [currentContent, selectedFile])

  const preRef = useRef(null)
  function handleEditorScroll(e) {
    setScrollTop(e.target.scrollTop)
    if (preRef.current) {
      preRef.current.scrollTop = e.target.scrollTop
      preRef.current.scrollLeft = e.target.scrollLeft
    }
  }

  return (
    <Card className="rounded-xl border border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-sm ring-1 ring-white/5 overflow-hidden">
      <CardHeader className="pb-2 border-b border-border/50 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0">
            <Terminal className="w-4 h-4 shrink-0 text-primary" />
            <span className="font-mono text-xs text-muted-foreground truncate">{selectedFile?.path || 'Source Code'}</span>
            <AnimatePresence>
              {selectedFile && dirtyPaths.has(selectedFile.path) && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5"
                >
                  Modified
                </motion.span>
              )}
            </AnimatePresence>
          </CardTitle>
          <div className="flex items-center gap-2 shrink-0">
            <AnimatePresence>
              {hasChanges && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleDiscard} disabled={isDeploying}>
                    Discard
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            <Button
              size="sm"
              className={`h-7 text-xs gap-1.5 rounded-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all ${
                hasChanges ? 'glow-pulse' : ''
              }`}
              disabled={!hasChanges || isDeploying}
              onClick={() => setConfirmOpen(true)}
            >
              <UploadCloud className="size-3.5" />
              {isDeploying ? 'Deploying…' : 'Deploy'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-full" />
            <Skeleton className="h-6 w-3/4" />
          </div>
        ) : isError ? (
          <div className="p-4 text-xs text-muted-foreground">Unable to load function files.</div>
        ) : (
          <div className="flex" style={{ height: '480px' }}>
            {/* Sidebar */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
              }}
              className="w-56 shrink-0 border-r border-border/40 overflow-y-auto bg-gradient-to-b from-muted/40 via-muted/10 to-transparent py-2"
            >
              <TreeNode
                node={tree}
                depth={0}
                selectedPath={selectedFile?.path}
                dirtyPaths={dirtyPaths}
                expanded={expanded}
                onToggle={toggleFolder}
                onSelectFile={selectFile}
              />
            </motion.div>

            {/* Editor */}
            <div className="flex-1 overflow-hidden bg-background/60 relative">
              <AnimatePresence mode="wait">
                {!selectedFile ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 text-xs text-muted-foreground">
                    Select a file to view its contents.
                  </motion.div>
                ) : selectedFile.isBinary ? (
                  <motion.div
                    key="binary"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex h-full flex-col items-center justify-center gap-2 text-center px-6"
                  >
                    <FileWarning className="size-6 text-muted-foreground/50" />
                    <p className="text-xs text-muted-foreground">Binary file — cannot preview or edit.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedFile.path}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="code-editor-syntax flex h-full"
                  >
                    <LineNumbers content={currentContent} scrollTop={scrollTop} />
                    <div className="relative flex-1 h-full overflow-hidden">
                      <pre
                        ref={preRef}
                        aria-hidden="true"
                        className="absolute inset-0 m-0 overflow-hidden whitespace-pre px-3 py-3 font-mono text-[13px] leading-[1.65] text-foreground/90"
                        style={{ tabSize: 4 }}
                      >
                        <code dangerouslySetInnerHTML={{ __html: highlightedHtml }} />
                      </pre>
                      <textarea
                        value={currentContent}
                        onChange={(e) => handleContentChange(e.target.value)}
                        onScroll={handleEditorScroll}
                        spellCheck={false}
                        className="absolute inset-0 h-full w-full resize-none overflow-auto whitespace-pre border-0 bg-transparent px-3 py-3 font-mono text-[13px] leading-[1.65] text-transparent caret-foreground outline-none"
                        style={{ tabSize: 4 }}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deploy code changes?</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>This overwrites the <strong>live code</strong> for <span className="font-mono">{functionName}</span>.</p>
            <p className="text-muted-foreground">
              {Object.keys(edits).length} file{Object.keys(edits).length !== 1 ? 's' : ''} will be updated. This cannot be undone from here.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={isDeploying}>
              {isDeploying ? 'Deploying…' : 'Deploy'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
