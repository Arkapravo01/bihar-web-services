import { useEffect, useRef, useMemo } from 'react'

// ── Agent definitions ─────────────────────────────────────────────────
const AGENTS = [
  { id: 'lambda',     label: 'Lambda',     icon: 'λ',  color: [168, 85,  247] },  // purple
  { id: 's3',         label: 'S3',         icon: '◈',  color: [6,   182, 212] },  // cyan
  { id: 'iam',        label: 'IAM',        icon: '⬡',  color: [245, 158, 11]  },  // amber
  { id: 'rds',        label: 'RDS',        icon: '⬡',  color: [16,  185, 129] },  // emerald
  { id: 'cloudwatch', label: 'CloudWatch', icon: '◎',  color: [139, 92,  246] },  // violet
  { id: 'secrets',    label: 'Secrets',    icon: '⬟',  color: [236, 72,  153] },  // pink
]

const TAU = Math.PI * 2

// ── Parse trace → per-agent state ────────────────────────────────────
function parseDelegation(trace) {
  const map = {}
  AGENTS.forEach(({ id }) => { map[id] = { called: false, done: false, order: -1 } })
  trace.forEach((entry, i) => {
    if (entry.tool_name === 'delegate_to_agent' && entry.agent && map[entry.agent]) {
      map[entry.agent] = {
        called: true,
        done: entry.status === 'success',
        order: i,
      }
    }
  })
  return map
}

// ── Particle pool ─────────────────────────────────────────────────────
function makeParticles(ax, ay, cx, cy, color, count = 18) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * TAU + Math.random() * 0.5
    const speed = 1.2 + Math.random() * 2.2
    return {
      x: ax, y: ay,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      decay: 0.012 + Math.random() * 0.018,
      r: 1.5 + Math.random() * 2.5,
      color,
    }
  })
}

// ── rgba helper ───────────────────────────────────────────────────────
const rgba = ([r, g, b], a) => `rgba(${r},${g},${b},${a})`

export function AgentNetworkVisualization({ trace = [], isLoading = false }) {
  const canvasRef   = useRef(null)
  const stateRef    = useRef({
    frame: 0,
    particles: [],
    prevDone: {},      // track new "done" transitions for burst
  })
  const rafRef = useRef(null)
  const delegation = useMemo(() => parseDelegation(trace), [trace])

  // ── Detect newly-completed agents → emit burst ──────────────────────
  useEffect(() => {
    const prev = stateRef.current.prevDone
    const canvas = canvasRef.current
    if (!canvas) return
    const w = canvas.width, h = canvas.height
    const cx = w / 2, cy = h / 2
    const ringR = Math.min(w, h) * 0.36

    AGENTS.forEach(({ id, color }, idx) => {
      const ds = delegation[id]
      if (ds.done && !prev[id]) {
        const angle = (idx / AGENTS.length) * TAU - Math.PI / 2
        const ax = cx + Math.cos(angle) * ringR
        const ay = cy + Math.sin(angle) * ringR
        stateRef.current.particles.push(...makeParticles(ax, ay, cx, cy, color, 22))
      }
    })
    stateRef.current.prevDone = Object.fromEntries(
      AGENTS.map(({ id }) => [id, delegation[id].done])
    )
  }, [delegation])

  // ── Main draw loop ───────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const s = stateRef.current
      s.frame++
      const t = s.frame
      const w = canvas.width, h = canvas.height
      const cx = w / 2, cy = h / 2

      // ── Background ──────────────────────────────────────────────────
      ctx.fillStyle = '#0e1521'
      ctx.fillRect(0, 0, w, h)

      // Hex grid
      drawHexGrid(ctx, w, h)

      const orchR = Math.min(w, h) * 0.075
      const ringR = Math.min(w, h) * 0.36

      // ── Edges ────────────────────────────────────────────────────────
      AGENTS.forEach(({ id, color }, idx) => {
        const angle = (idx / AGENTS.length) * TAU - Math.PI / 2
        const ax = cx + Math.cos(angle) * ringR
        const ay = cy + Math.sin(angle) * ringR
        const ds = delegation[id]

        if (ds.called) {
          // Glowing beam
          const alpha = ds.done ? 0.55 : 0.25
          const grad = ctx.createLinearGradient(cx, cy, ax, ay)
          grad.addColorStop(0, rgba(color, alpha))
          grad.addColorStop(1, rgba(color, alpha * 0.3))

          ctx.strokeStyle = grad
          ctx.lineWidth = ds.done ? 2 : 1.5
          ctx.setLineDash([])
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(ax, ay)
          ctx.stroke()

          // Outer glow beam
          ctx.strokeStyle = rgba(color, 0.08)
          ctx.lineWidth = ds.done ? 8 : 5
          ctx.stroke()

          // Travelling pulse — one per active edge, looping
          if (ds.done) {
            const speed = 0.007
            const progress = (t * speed * (1 + idx * 0.03)) % 1
            const px = cx + (ax - cx) * progress
            const py = cy + (ay - cy) * progress
            const pr = ctx.createRadialGradient(px, py, 0, px, py, 7)
            pr.addColorStop(0, rgba(color, 0.95))
            pr.addColorStop(0.4, rgba(color, 0.5))
            pr.addColorStop(1, rgba(color, 0))
            ctx.fillStyle = pr
            ctx.beginPath()
            ctx.arc(px, py, 7, 0, TAU)
            ctx.fill()

            // second offset pulse for richness
            const p2 = ((t * speed * (1 + idx * 0.03)) + 0.45) % 1
            const px2 = cx + (ax - cx) * p2
            const py2 = cy + (ay - cy) * p2
            const pr2 = ctx.createRadialGradient(px2, py2, 0, px2, py2, 4)
            pr2.addColorStop(0, rgba(color, 0.6))
            pr2.addColorStop(1, rgba(color, 0))
            ctx.fillStyle = pr2
            ctx.beginPath()
            ctx.arc(px2, py2, 4, 0, TAU)
            ctx.fill()
          } else if (ds.called) {
            // Pending pulse — slower, dimmer
            const progress = (t * 0.004) % 1
            const px = cx + (ax - cx) * progress
            const py = cy + (ay - cy) * progress
            const pr = ctx.createRadialGradient(px, py, 0, px, py, 5)
            pr.addColorStop(0, rgba(color, 0.5))
            pr.addColorStop(1, rgba(color, 0))
            ctx.fillStyle = pr
            ctx.beginPath()
            ctx.arc(px, py, 5, 0, TAU)
            ctx.fill()
          }
        } else {
          // Dormant edge — very faint
          ctx.strokeStyle = 'rgba(255,255,255,0.09)'
          ctx.lineWidth = 1
          ctx.setLineDash([4, 8])
          ctx.lineDashOffset = -(t * 0.15)
          ctx.beginPath()
          ctx.moveTo(cx, cy)
          ctx.lineTo(ax, ay)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.lineDashOffset = 0
        }
      })

      // ── Orchestrator node ─────────────────────────────────────────
      const orchPulse = isLoading
        ? 1 + Math.sin(t * 0.055) * 0.08
        : 1 + Math.sin(t * 0.02) * 0.03

      // Outermost ambient ring
      const ambR = orchR * 3.8 * orchPulse
      const amb = ctx.createRadialGradient(cx, cy, orchR * 1.2, cx, cy, ambR)
      amb.addColorStop(0, 'rgba(120,120,255,0.05)')
      amb.addColorStop(1, 'rgba(120,120,255,0)')
      ctx.fillStyle = amb
      ctx.beginPath()
      ctx.arc(cx, cy, ambR, 0, TAU)
      ctx.fill()

      // Glow halo
      const hR = orchR * 2.2
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, hR)
      halo.addColorStop(0, 'rgba(100,100,255,0.18)')
      halo.addColorStop(0.5, 'rgba(80,80,220,0.08)')
      halo.addColorStop(1, 'rgba(80,80,220,0)')
      ctx.fillStyle = halo
      ctx.beginPath()
      ctx.arc(cx, cy, hR, 0, TAU)
      ctx.fill()

      // Spinning outer dashed ring
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(t * 0.004)
      ctx.strokeStyle = 'rgba(140,140,255,0.18)'
      ctx.lineWidth = 1
      ctx.setLineDash([6, 10])
      ctx.beginPath()
      ctx.arc(0, 0, orchR * 1.65, 0, TAU)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.restore()

      // Solid node
      const nGrad = ctx.createRadialGradient(cx - orchR * 0.3, cy - orchR * 0.3, 0, cx, cy, orchR)
      nGrad.addColorStop(0, '#6d6aff')
      nGrad.addColorStop(0.6, '#4b48cc')
      nGrad.addColorStop(1, '#2a2880')
      ctx.fillStyle = nGrad
      ctx.beginPath()
      ctx.arc(cx, cy, orchR, 0, TAU)
      ctx.fill()

      // Node border ring
      ctx.strokeStyle = 'rgba(180,180,255,0.4)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Label
      ctx.fillStyle = '#ffffff'
      ctx.font = `bold ${Math.max(10, orchR * 0.32)}px system-ui`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('Orchestrator', cx, cy - 3)
      if (isLoading) {
        const dots = '.'.repeat(1 + Math.floor(t / 18) % 3)
        ctx.fillStyle = 'rgba(200,200,255,0.6)'
        ctx.font = `${Math.max(8, orchR * 0.22)}px system-ui`
        ctx.fillText('thinking' + dots, cx, cy + orchR * 0.45)
      }

      // ── Agent nodes ───────────────────────────────────────────────
      AGENTS.forEach(({ id, label, icon, color }, idx) => {
        const angle = (idx / AGENTS.length) * TAU - Math.PI / 2
        const ax = cx + Math.cos(angle) * ringR
        const ay = cy + Math.sin(angle) * ringR
        const ds = delegation[id]
        const nodeR = Math.min(w, h) * 0.072

        // ── Glow layers ───────────────────────────────────────────
        if (ds.called) {
          // Outer ambient spill
          const glowSize = ds.done
            ? nodeR * (3.5 + Math.sin(t * 0.04 + idx) * 0.6)
            : nodeR * 2.5
          const outer = ctx.createRadialGradient(ax, ay, 0, ax, ay, glowSize)
          outer.addColorStop(0, rgba(color, ds.done ? 0.18 : 0.08))
          outer.addColorStop(1, rgba(color, 0))
          ctx.fillStyle = outer
          ctx.beginPath()
          ctx.arc(ax, ay, glowSize, 0, TAU)
          ctx.fill()

          // Inner glow corona
          const corona = ctx.createRadialGradient(ax, ay, nodeR * 0.5, ax, ay, nodeR * 1.8)
          corona.addColorStop(0, rgba(color, ds.done ? 0.45 : 0.2))
          corona.addColorStop(1, rgba(color, 0))
          ctx.fillStyle = corona
          ctx.beginPath()
          ctx.arc(ax, ay, nodeR * 1.8, 0, TAU)
          ctx.fill()
        }

        // Pulsing outer ring — only when done
        if (ds.done) {
          const rScale = 1 + ((t * 0.025 + idx * 0.7) % 1) * 1.4
          const rAlpha = Math.max(0, 0.5 - ((t * 0.025 + idx * 0.7) % 1) * 0.5)
          ctx.strokeStyle = rgba(color, rAlpha)
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.arc(ax, ay, nodeR * rScale, 0, TAU)
          ctx.stroke()
        }

        // ── Node fill ─────────────────────────────────────────────
        const active  = ds.done
        const pending = ds.called && !ds.done
        const dormant = !ds.called

        const nFill = ctx.createRadialGradient(
          ax - nodeR * 0.3, ay - nodeR * 0.3, 0,
          ax, ay, nodeR
        )
        if (active) {
          nFill.addColorStop(0, rgba(color, 1))
          nFill.addColorStop(0.6, rgba(color, 0.85))
          nFill.addColorStop(1, rgba(color, 0.55))
        } else if (pending) {
          nFill.addColorStop(0, rgba(color, 0.5))
          nFill.addColorStop(1, rgba(color, 0.25))
        } else {
          nFill.addColorStop(0, 'rgba(42,55,85,0.95)')
          nFill.addColorStop(1, 'rgba(24,34,58,0.95)')
        }
        ctx.fillStyle = nFill
        ctx.beginPath()
        ctx.arc(ax, ay, nodeR, 0, TAU)
        ctx.fill()

        // ── Node border ───────────────────────────────────────────
        if (active) {
          const borderPulse = 0.5 + Math.sin(t * 0.06 + idx) * 0.3
          ctx.strokeStyle = rgba(color, 0.6 + borderPulse * 0.4)
          ctx.lineWidth = 2.5
        } else if (pending) {
          ctx.strokeStyle = rgba(color, 0.35)
          ctx.lineWidth = 1.5
        } else {
          ctx.strokeStyle = 'rgba(255,255,255,0.13)'
          ctx.lineWidth = 1
        }
        ctx.stroke()

        // ── Label ─────────────────────────────────────────────────
        const labelAlpha = dormant ? 0.45 : 1
        ctx.fillStyle = `rgba(255,255,255,${labelAlpha})`
        ctx.font = `${active ? 'bold ' : ''}${Math.max(9, nodeR * 0.255)}px system-ui`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(label, ax, ay)

        // ── Status indicator ──────────────────────────────────────
        if (ds.called) {
          const dotColor = ds.done ? '#34d399' : '#fbbf24'
          const dotR = nodeR * 0.18
          const dotX = ax + nodeR * 0.7
          const dotY = ay - nodeR * 0.7

          // Dot glow
          const dg = ctx.createRadialGradient(dotX, dotY, 0, dotX, dotY, dotR * 3)
          dg.addColorStop(0, ds.done ? 'rgba(52,211,153,0.4)' : 'rgba(251,191,36,0.3)')
          dg.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = dg
          ctx.beginPath()
          ctx.arc(dotX, dotY, dotR * 3, 0, TAU)
          ctx.fill()

          ctx.fillStyle = dotColor
          ctx.beginPath()
          ctx.arc(dotX, dotY, dotR, 0, TAU)
          ctx.fill()
        }
      })

      // ── Particles ─────────────────────────────────────────────────
      s.particles = s.particles.filter((p) => p.life > 0)
      s.particles.forEach((p) => {
        p.x  += p.vx
        p.y  += p.vy
        p.vx *= 0.96
        p.vy *= 0.96
        p.life -= p.decay

        const pr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2)
        pr.addColorStop(0, rgba(p.color, p.life * 0.9))
        pr.addColorStop(1, rgba(p.color, 0))
        ctx.fillStyle = pr
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r * 2, 0, TAU)
        ctx.fill()
      })

      rafRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [delegation, isLoading])

  // ── Resize observer ───────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const obs = new ResizeObserver(() => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    })
    obs.observe(canvas)
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    return () => obs.disconnect()
  }, [])

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}

// ── Subtle hexagonal grid background ─────────────────────────────────
function drawHexGrid(ctx, w, h) {
  const size = 36
  const col  = size * Math.sqrt(3)
  const row  = size * 1.5

  ctx.strokeStyle = 'rgba(255,255,255,0.04)'
  ctx.lineWidth   = 1

  for (let y = -size; y < h + size; y += row) {
    for (let x = -col; x < w + col; x += col) {
      const offset = Math.floor((y / row + 0.5)) % 2 === 0 ? 0 : col / 2
      hexPath(ctx, x + offset, y, size * 0.95)
      ctx.stroke()
    }
  }
}

function hexPath(ctx, cx, cy, r) {
  ctx.beginPath()
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3
    const x = cx + r * Math.cos(a)
    const y = cy + r * Math.sin(a)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  ctx.closePath()
}
