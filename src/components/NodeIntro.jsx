import { useEffect, useMemo, useState } from 'react'
import { useGameStore } from '../store/gameStore'

const INTRO_DURATION_MS = 2000
const MATRIX_CHARS = '01ABCDEF$#@*+-<>[]{}'
const MATRIX_WIDTH = 72
const MATRIX_ROWS = 22

function randomMatrixLine(width) {
  return Array.from({ length: width }, () => {
    if (Math.random() < 0.2) return ' '
    return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]
  }).join('')
}

export default function NodeIntro() {
  const nodeIntroData = useGameStore(s => s.nodeIntroData)
  const initNode = useGameStore(s => s.initNode)
  const [progress, setProgress] = useState(0)
  const [matrixLines, setMatrixLines] = useState(() =>
    Array.from({ length: MATRIX_ROWS }, () => randomMatrixLine(MATRIX_WIDTH))
  )

  useEffect(() => {
    if (!nodeIntroData) return

    setProgress(0)
    const raf = requestAnimationFrame(() => setProgress(100))

    const tick = setInterval(() => {
      setMatrixLines(prev => [...prev.slice(1), randomMatrixLine(MATRIX_WIDTH)])
    }, 70)

    const timer = setTimeout(() => {
      initNode(nodeIntroData.nextNodeId)
    }, INTRO_DURATION_MS)

    return () => {
      cancelAnimationFrame(raf)
      clearInterval(tick)
      clearTimeout(timer)
    }
  }, [nodeIntroData, initNode])

  const firewallCells = useMemo(() => {
    if (!nodeIntroData) return []
    return Array.from({ length: nodeIntroData.maxFirewalls })
  }, [nodeIntroData])

  if (!nodeIntroData) return null

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,255,65,0.08),transparent_60%)]" />
      <pre className="absolute inset-0 p-4 overflow-hidden text-[0.72rem] leading-[1.05rem] text-[var(--crt-green-dark)] select-none pointer-events-none">
        {matrixLines.join('\n')}
      </pre>

      <div className="relative z-10 w-full max-w-2xl border border-[var(--crt-green-dim)] bg-[#040804ee] p-5 md:p-6 shadow-[0_0_24px_rgba(0,255,65,0.22)]">
        <div className="text-center">
          <div className="text-[var(--crt-green-dim)] text-sm tracking-[0.28em]">HANDSHAKE // NEXT NODE</div>
          <div className="mt-2 text-[var(--crt-green)] glow-strong text-2xl md:text-3xl tracking-[0.2em] font-bold">
            {nodeIntroData.nodeName}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm md:text-base">
          <div className="border border-[var(--crt-green-dark)] p-3">
            <div className="text-[var(--crt-green-dim)] tracking-[0.18em]">GRID SIZE</div>
            <div className="mt-1 text-[var(--crt-green)] font-bold text-xl tabular-nums">
              {nodeIntroData.rows} x {nodeIntroData.cols}
            </div>
          </div>
          <div className="border border-[var(--crt-green-dark)] p-3">
            <div className="text-[var(--crt-green-dim)] tracking-[0.18em]">MINES</div>
            <div className="mt-1 text-[var(--crt-red)] glow-red font-bold text-xl tabular-nums">
              {nodeIntroData.mines}
            </div>
          </div>
          <div className="border border-[var(--crt-green)] p-3 shadow-[0_0_10px_var(--crt-green-glow)]">
            <div className="text-[var(--crt-green)] tracking-[0.18em]">FIREWALLS</div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[var(--crt-green)] glow font-bold text-xl tabular-nums">
                {nodeIntroData.firewalls}/{nodeIntroData.maxFirewalls}
              </span>
              <div className="flex gap-1.5">
                {firewallCells.map((_, i) => (
                  <span
                    key={i}
                    className={`inline-block w-2.5 h-2.5 border ${
                      i < nodeIntroData.firewalls
                        ? 'border-[var(--crt-green)] bg-[var(--crt-green)] shadow-[0_0_5px_var(--crt-green-glow)]'
                        : 'border-[var(--crt-red)] bg-transparent opacity-60'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-[var(--crt-green-dim)] text-xs tracking-[0.2em] mb-1">
            MATRIX LINK ESTABLISHING...
          </div>
          <div className="h-2 border border-[var(--crt-green-dark)] bg-[#0a120a] overflow-hidden">
            <div
              className="h-full bg-[var(--crt-green)] transition-[width] ease-linear"
              style={{ width: `${progress}%`, transitionDuration: `${INTRO_DURATION_MS - 100}ms` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
