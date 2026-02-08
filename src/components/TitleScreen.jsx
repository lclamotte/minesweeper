import { useState, useEffect, useCallback } from 'react'
import { useGameStore } from '../store/gameStore'
import { hasSave, getSaveInfo } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'
import { THEMES } from '../themes'
import { DataStream, SignalWave, GlitchText, TerminalLog } from './AsciiAnim'

const ASCII_TITLE = `
 ██████╗  ██████╗  ██████╗ ████████╗
 ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝
 ██████╔╝██║   ██║██║   ██║   ██║
 ██╔══██╗██║   ██║██║   ██║   ██║
 ██║  ██║╚██████╔╝╚██████╔╝   ██║
 ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝
 ███████╗██╗    ██╗███████╗███████╗██████╗ ███████╗██████╗
 ██╔════╝██║    ██║██╔════╝██╔════╝██╔══██╗██╔════╝██╔══██╗
 ███████╗██║ █╗ ██║█████╗  █████╗  ██████╔╝█████╗  ██████╔╝
 ╚════██║██║███╗██║██╔══╝  ██╔══╝  ██╔═══╝ ██╔══╝  ██╔══██╗
 ███████║╚███╔███╔╝███████╗███████╗██║     ███████╗██║  ██║
 ╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝╚═╝     ╚══════╝╚═╝  ╚═╝`

const SWEEPER_FRAMES = [
  [
    '         ▄▄████▄▄         ',
    '       ▄█▀▀▀▀▀▀▀▀█▄       ',
    '      █▀  ▀▀▀▀▀▀  ▀█      ',
    '     █  ██▓▓▓▓▓▓██  █     ',
    '     █  ▓▓▓▓▓▓▓▓▓▓  █     ',
    '     ▀█ ▀▀▀▀▀▀▀▀▀▀ █▀     ',
    '      ▀█▄▄▄▄▄▄▄▄▄▄█▀      ',
    '       ▄█████████▄        ',
    '      █▀ ▐█▌  ▐█▌ ▀█      ',
    '     ▐█  ▐█▌  ▐█▌  █▌     ',
    '     ▐█▄▄▐█▌▄▄▐█▌▄▄█▌     ',
    '      ▀█▀▀▀▀▀▀▀▀▀▀█▀      ',
    '     ╱▐█▌  ╲╱╱╱   █▌      ',
    '    ╱  ▐█   ║     █▌      ',
    '   ╱    █▌  ║    ▐█       ',
    '  ╱▒▒▒   █  ║   ▐█        ',
    ' ╱▒▒▒▒▒  ▐█ ║  ▄█▀        ',
    '  ▔▔▔▔▔   ▀█║▄█▀          ',
    '            ║║             ',
    '           ▐██▌            ',
    '          ▐████▌           ',
  ],
  [
    '         ▄▄████▄▄         ',
    '       ▄█▀▀▀▀▀▀▀▀█▄       ',
    '      █▀  ▀▀▀▀▀▀  ▀█      ',
    '     █  ██▓▓▓▓▓▓██  █     ',
    '     █  ▓▓▓▓▓▓▓▓▓▓  █     ',
    '     ▀█ ▀▀▀▀▀▀▀▀▀▀ █▀     ',
    '      ▀█▄▄▄▄▄▄▄▄▄▄█▀      ',
    '       ▄█████████▄        ',
    '      █▀ ▐█▌  ▐█▌ ▀█      ',
    '     ▐█  ▐█▌  ▐█▌  █▌     ',
    '     ▐█▄▄▐█▌▄▄▐█▌▄▄█▌     ',
    '      ▀█▀▀▀▀▀▀▀▀▀▀█▀      ',
    '      █▌   ╲╱╱╱ ▐█▌╲      ',
    '      █▌     ║   █▌ ╲     ',
    '       █▌    ║  █▌   ╲    ',
    '        █▌   ║ █   ▒▒▒╲   ',
    '        ▀█▄  ║ █▌ ▒▒▒▒▒╲  ',
    '          ▀█▄║█▀   ▔▔▔▔▔  ',
    '            ║║             ',
    '           ▐██▌            ',
    '          ▐████▌           ',
  ],
]

// Explosion lifecycle: ✱ → ✱+sparks → *+sparks → · fading → gone
const EXPLOSION_STAGES = [
  // stage 0: initial flash
  { ch: '✱', color: 'var(--crt-red)', glow: 'rgba(255,60,60,0.9)', size: 1.1, sparks: [] },
  // stage 1: burst
  { ch: '✱', color: 'var(--crt-red)', glow: 'rgba(255,60,60,0.7)', size: 1.3,
    sparks: [
      { dx: -1.2, dy: -1.0, ch: '·' }, { dx: 1.2, dy: -1.0, ch: '·' },
      { dx: -1.0, dy: 1.2, ch: '·' }, { dx: 1.0, dy: 1.2, ch: '·' },
    ]},
  // stage 2: expanding
  { ch: '*', color: 'var(--crt-amber)', glow: 'rgba(255,176,0,0.6)', size: 1.2,
    sparks: [
      { dx: -2.0, dy: -1.6, ch: '·' }, { dx: 2.0, dy: -1.6, ch: '·' },
      { dx: -1.6, dy: 2.0, ch: '·' }, { dx: 1.6, dy: 2.0, ch: '·' },
      { dx: 0, dy: -2.2, ch: '˙' }, { dx: 0, dy: 2.2, ch: '˙' },
    ]},
  // stage 3: fading
  { ch: '·', color: 'var(--crt-amber)', glow: 'rgba(255,176,0,0.3)', size: 1.0,
    sparks: [
      { dx: -2.8, dy: -2.2, ch: '˙' }, { dx: 2.8, dy: -2.2, ch: '˙' },
      { dx: -2.2, dy: 2.8, ch: '˙' }, { dx: 2.2, dy: 2.8, ch: '˙' },
    ]},
  // stage 4: dim residue
  { ch: '·', color: 'var(--crt-green-dark)', glow: 'none', size: 0.9, sparks: [] },
]

const EXPLOSION_DURATION = EXPLOSION_STAGES.length

function MineExplosions() {
  const [explosions, setExplosions] = useState([])

  const spawn = useCallback(() => {
    let x, y
    const zone = Math.random()
    if (zone < 0.08) {
      // far left edge
      x = 1 + Math.random() * 8
      y = 5 + Math.random() * 90
    } else if (zone < 0.16) {
      // left strip
      x = 9 + Math.random() * 12
      y = 8 + Math.random() * 84
    } else if (zone < 0.24) {
      // left-center
      x = 21 + Math.random() * 10
      y = 15 + Math.random() * 70
    } else if (zone < 0.32) {
      // far right edge
      x = 91 + Math.random() * 8
      y = 5 + Math.random() * 90
    } else if (zone < 0.40) {
      // right strip
      x = 79 + Math.random() * 12
      y = 8 + Math.random() * 84
    } else if (zone < 0.48) {
      // right-center
      x = 69 + Math.random() * 10
      y = 15 + Math.random() * 70
    } else if (zone < 0.56) {
      // top strip
      x = 15 + Math.random() * 70
      y = 2 + Math.random() * 10
    } else if (zone < 0.64) {
      // bottom strip
      x = 15 + Math.random() * 70
      y = 88 + Math.random() * 10
    } else if (zone < 0.72) {
      // near sweeper — left side
      x = 38 + Math.random() * 8
      y = 35 + Math.random() * 30
    } else if (zone < 0.80) {
      // near sweeper — right side
      x = 54 + Math.random() * 8
      y = 35 + Math.random() * 30
    } else if (zone < 0.88) {
      // near sweeper — above
      x = 42 + Math.random() * 16
      y = 28 + Math.random() * 8
    } else {
      // near sweeper — below
      x = 42 + Math.random() * 16
      y = 65 + Math.random() * 10
    }

    setExplosions(prev => [
      ...prev.slice(-15),
      { id: Date.now() + Math.random(), x, y, birth: Date.now() },
    ])
  }, [])

  useEffect(() => {
    const id = setTimeout(spawn, 300 + Math.random() * 200)
    const iv = setInterval(spawn, 600 + Math.random() * 600)
    return () => { clearTimeout(id); clearInterval(iv) }
  }, [spawn])

  // Tick to advance animations
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 140)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
      {explosions.map(exp => {
        const age = Math.floor((now - exp.birth) / 140)
        if (age >= EXPLOSION_DURATION) return null
        const stage = EXPLOSION_STAGES[age]

        return (
          <div key={exp.id} className="absolute font-mono" style={{ left: `${exp.x}%`, top: `${exp.y}%` }}>
            {/* Sparks */}
            {stage.sparks.map((spark, si) => (
              <span
                key={si}
                className="absolute"
                style={{
                  left: `${spark.dx}em`,
                  top: `${spark.dy}em`,
                  color: stage.color,
                  fontSize: `${stage.size * 0.7}rem`,
                  opacity: age <= 2 ? 0.8 : 0.4,
                }}
              >
                {spark.ch}
              </span>
            ))}
            {/* Center */}
            <span
              style={{
                color: stage.color,
                fontSize: `${stage.size}rem`,
                textShadow: `0 0 8px ${stage.glow}`,
              }}
            >
              {stage.ch}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function SweeperArt() {
  const [frame, setFrame] = useState(0)
  const [scanLine, setScanLine] = useState(-1)

  useEffect(() => {
    const id = setInterval(() => setFrame(f => (f + 1) % 2), 900)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setScanLine(s => {
        if (s >= SWEEPER_FRAMES[0].length + 3) return -3
        return s + 1
      })
    }, 70)
    return () => clearInterval(id)
  }, [])

  const lines = SWEEPER_FRAMES[frame]

  return (
    <pre className="leading-[1.15] select-none text-[clamp(0.45rem,0.85vw,0.72rem)]" aria-hidden="true">
      {lines.map((line, i) => {
        const dist = Math.abs(i - scanLine)
        let cls = 'text-[var(--crt-green-dim)]'
        if (dist === 0) cls = 'text-[var(--crt-green)] brightness-150'
        else if (dist === 1) cls = 'text-[var(--crt-green)]'
        return (
          <div key={i} className={cls} style={dist === 0 ? { textShadow: '0 0 8px var(--crt-green-glow)' } : undefined}>
            {line}
          </div>
        )
      })}
    </pre>
  )
}

export default function TitleScreen() {
  const startNewRun = useGameStore(s => s.startNewRun)
  const resumeRun = useGameStore(s => s.resumeRun)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)
  const currentTheme = useGameStore(s => s.currentTheme)
  const setTheme = useGameStore(s => s.setTheme)

  const [saveExists, setSaveExists] = useState(false)
  const [saveInfo, setSaveInfo] = useState(null)

  useEffect(() => {
    const exists = hasSave()
    setSaveExists(exists)
    if (exists) setSaveInfo(getSaveInfo())
  }, [])

  const handleStart = () => {
    if (soundEnabled) playClick()
    startNewRun()
  }

  const handleResume = () => {
    if (soundEnabled) playClick()
    resumeRun()
  }

  const handleCycleTheme = () => {
    const ids = Object.keys(THEMES)
    if (ids.length === 0) return
    const currentIdx = Math.max(0, ids.indexOf(currentTheme))
    const nextIdx = (currentIdx + 1) % ids.length
    if (soundEnabled) playClick()
    setTheme(ids[nextIdx])
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Ambient mine explosions */}
      <MineExplosions />

      {/* Flanking data streams */}
      <div className="absolute left-[3%] top-[10%] opacity-20 pointer-events-none hidden lg:block">
        <DataStream width={16} height={20} speed={100} className="text-[0.7rem] text-[var(--crt-green)]" />
      </div>
      <div className="absolute right-[3%] top-[8%] opacity-20 pointer-events-none hidden lg:block">
        <DataStream width={16} height={22} speed={130} className="text-[0.7rem] text-[var(--crt-green)]" />
      </div>

      {/* Scrolling terminal log — bottom-left ambient */}
      <div className="absolute left-[3%] bottom-[8%] opacity-15 pointer-events-none hidden lg:block">
        <TerminalLog lines={4} speed={2200} className="text-[0.65rem] text-[var(--crt-green-dim)]" />
      </div>

      {/* Title */}
      <pre className="text-[var(--crt-green)] glow-strong leading-none select-none whitespace-pre text-[1.4vw] lg:text-[1.1vw]">
        {ASCII_TITLE}
      </pre>

      {/* Signal wave under title */}
      <div className="mt-[1vh]">
        <SignalWave width={40} speed={90} className="text-[0.8rem] text-[var(--crt-green-dark)]" />
      </div>

      {/* Sweeper character */}
      <div className="mt-[1.5vh]">
        <SweeperArt />
      </div>

      <div className="text-center space-y-3 mt-[1.5vh]">
        <p className="text-[var(--crt-green-dim)] text-[clamp(0.85rem,1.5vw,1.15rem)] tracking-[0.22em] uppercase">
          CLEAR THE GRID. AVOID THE MINES. REACH ROOT ACCESS.
        </p>
        <p className="text-[var(--crt-amber)] text-[clamp(1rem,2vw,1.6rem)] tracking-widest glow-amber">
          &gt;&gt; <GlitchText text="ROOT ACCESS REQUIRED" intensity={0.04} speed={120} /> &lt;&lt;
        </p>
      </div>

      <div className="flex flex-col items-center gap-3 mt-[3vh]">
        {saveExists ? (
          <>
            <button
              onClick={handleResume}
              className="terminal-btn terminal-btn-amber text-[clamp(1.05rem,2vw,1.6rem)] tracking-[0.45em] px-16 py-4 shadow-[0_0_14px_var(--crt-green-glow)]"
            >
              [ RESUME ]
            </button>
            {saveInfo && (
              <p className="text-[var(--crt-green-dim)] text-[clamp(0.7rem,1.1vw,0.9rem)] tracking-wider">
                Node {saveInfo.currentNodeId} — {getNode(saveInfo.currentNodeId).name} — ${saveInfo.cache} cache
              </p>
            )}
            <button
              onClick={handleStart}
              className="terminal-btn text-[clamp(0.95rem,1.55vw,1.2rem)] tracking-[0.34em] px-11 py-3"
            >
              [ NEW RUN ]
            </button>
          </>
        ) : (
          <button
            onClick={handleStart}
            className="terminal-btn terminal-btn-amber text-[clamp(1.05rem,2vw,1.6rem)] tracking-[0.45em] px-16 py-4 shadow-[0_0_14px_var(--crt-green-glow)]"
          >
            [ INFILTRATE ]
          </button>
        )}

        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={toggleSound}
            className="border border-[var(--crt-green-dark)] text-[var(--crt-green-dim)] text-[clamp(0.72rem,1.05vw,0.88rem)] px-3 py-1.5 tracking-[0.18em] uppercase hover:text-[var(--crt-green)] hover:border-[var(--crt-green-dim)] transition-colors"
          >
            Audio: {soundEnabled ? 'On' : 'Off'}
          </button>
          <button
            onClick={handleCycleTheme}
            className="border border-[var(--crt-green-dark)] text-[var(--crt-green-dim)] text-[clamp(0.72rem,1.05vw,0.88rem)] px-3 py-1.5 tracking-[0.18em] uppercase hover:text-[var(--crt-green)] hover:border-[var(--crt-green-dim)] transition-colors"
          >
            Theme: {THEMES[currentTheme]?.name || currentTheme}
          </button>
        </div>
      </div>
    </div>
  )
}
