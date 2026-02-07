import { useState, useEffect, useRef } from 'react'

// ── Scrolling data stream ────────────────────────────
// A column of random hex/binary that scrolls upward continuously
const STREAM_CHARS = '0123456789ABCDEF'
const randChar = () => STREAM_CHARS[Math.floor(Math.random() * STREAM_CHARS.length)]
const randRow = (w) => Array.from({ length: w }, () => Math.random() < 0.35 ? randChar() : ' ').join('')

export function DataStream({ width = 20, height = 8, speed = 120, className = '' }) {
  const [rows, setRows] = useState(() =>
    Array.from({ length: height }, () => randRow(width))
  )

  useEffect(() => {
    const id = setInterval(() => {
      setRows(prev => [...prev.slice(1), randRow(width)])
    }, speed)
    return () => clearInterval(id)
  }, [width, speed])

  return (
    <pre className={`leading-[1.2] select-none font-mono ${className}`}>
      {rows.map((row, i) => {
        const opacity = 0.15 + (i / height) * 0.85
        return (
          <div key={i} style={{ opacity }} className="whitespace-pre">
            {row}
          </div>
        )
      })}
    </pre>
  )
}

// ── Animated ASCII frame player ──────────────────────
// Cycles through an array of string frames
export function AsciiFrames({ frames, interval = 400, className = '' }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIdx(i => (i + 1) % frames.length)
    }, interval)
    return () => clearInterval(id)
  }, [frames.length, interval])

  return (
    <pre className={`leading-[1.15] select-none font-mono whitespace-pre ${className}`}>
      {frames[idx]}
    </pre>
  )
}

// ── Radar sweep ──────────────────────────────────────
const RADAR_FRAMES = [
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+    │ ',
    ' │         │ ',
    '  \\       /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |/   │ ',
    ' │----+    │ ',
    ' │         │ ',
    '  \\       /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+----│ ',
    ' │         │ ',
    '  \\       /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+    │ ',
    ' │    |\\   │ ',
    '  \\   |  /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+    │ ',
    ' │    |    │ ',
    '  \\   |  /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+    │ ',
    ' │   /|    │ ',
    '  \\ / |  /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /   |   \\  ',
    ' │    |    │ ',
    ' │----+----│ ',
    ' │    |    │ ',
    '  \\   |  /  ',
    '    `───´    ',
  ],
  [
    '    .───.    ',
    '  /  \\|   \\  ',
    ' │    |    │ ',
    ' │----+    │ ',
    ' │         │ ',
    '  \\       /  ',
    '    `───´    ',
  ],
]

export function RadarSweep({ className = '' }) {
  return (
    <AsciiFrames
      frames={RADAR_FRAMES.map(f => f.join('\n'))}
      interval={250}
      className={className}
    />
  )
}

// ── Spinning lock / keyhole ──────────────────────────
const LOCK_FRAMES = [
  '  ┌──┐  \n' +
  '  │╶╴│  \n' +
  '┌─┤  ├─┐\n' +
  '│ │──│ │\n' +
  '│ │  │ │\n' +
  '└─┴──┴─┘',

  '  ┌──┐  \n' +
  '  │╴╶│  \n' +
  '┌─┤  ├─┐\n' +
  '│ │──│ │\n' +
  '│ │  │ │\n' +
  '└─┴──┴─┘',

  '  ┌──┐  \n' +
  '  │──│  \n' +
  '┌─┤  ├─┐\n' +
  '│ │──│ │\n' +
  '│ │  │ │\n' +
  '└─┴──┴─┘',

  '  ┌──┐  \n' +
  '  │╶╴│  \n' +
  '┌─┤  ├─┐\n' +
  '│ │╶╴│ │\n' +
  '│ │  │ │\n' +
  '└─┴──┴─┘',
]

export function LockAnim({ className = '' }) {
  return <AsciiFrames frames={LOCK_FRAMES} interval={500} className={className} />
}

// ── Signal waveform ──────────────────────────────────
const WAVE_CHARS = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']

export function SignalWave({ width = 32, speed = 80, className = '' }) {
  const [offset, setOffset] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setOffset(o => o + 1)
    }, speed)
    return () => clearInterval(id)
  }, [speed])

  const wave = Array.from({ length: width }, (_, i) => {
    const v = Math.sin((i + offset) * 0.4) * 0.5 + 0.5
    const noise = Math.sin((i + offset) * 1.7) * 0.15
    const idx = Math.max(0, Math.min(7, Math.floor((v + noise) * 8)))
    return WAVE_CHARS[idx]
  }).join('')

  return (
    <pre className={`leading-none select-none font-mono whitespace-pre ${className}`}>
      {wave}
    </pre>
  )
}

// ── Network topology map ─────────────────────────────
// Shows nodes being scanned with a blinking active node
export function NetworkMap({ activeNode = 1, className = '' }) {
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 600)
    return () => clearInterval(id)
  }, [])

  const nodeChar = (n) => {
    if (n < activeNode) return '◉'
    if (n === activeNode) return blink ? '◎' : '◉'
    return '○'
  }

  const line = `${nodeChar(1)}──${nodeChar(2)}──${nodeChar(3)}──${nodeChar(4)}──${nodeChar(5)}──${nodeChar(6)}──${nodeChar(7)}`

  return (
    <pre className={`leading-none select-none font-mono whitespace-pre ${className}`}>
      {line}
    </pre>
  )
}

// ── Glitching text ───────────────────────────────────
// Text that randomly corrupts characters briefly
const GLITCH_CHARS = '░▒▓█▄▀╳╱╲─│┤├┼'

export function GlitchText({ text, intensity = 0.06, speed = 100, className = '' }) {
  const [display, setDisplay] = useState(text)
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setDisplay(
        text
          .split('')
          .map(ch => {
            if (ch === ' ' || ch === '\n') return ch
            return Math.random() < intensity
              ? GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)]
              : ch
          })
          .join('')
      )
    }, speed)
    return () => clearInterval(timerRef.current)
  }, [text, intensity, speed])

  return (
    <span className={`select-none ${className}`}>
      {display}
    </span>
  )
}

// ── Orbiting mine ────────────────────────────────────
const ORBIT_FRAMES = [
  '  ◆    \n' +
  '      \n' +
  '  ◇   ',
  '    ◆  \n' +
  '      \n' +
  '◇     ',
  '      \n' +
  '    ◆ \n' +
  '◇     ',
  '      \n' +
  '      ◆\n' +
  ' ◇    ',
  '      \n' +
  '      \n' +
  ' ◇  ◆ ',
  '      \n' +
  '◆     \n' +
  '   ◇  ',
  '◆     \n' +
  '      \n' +
  '   ◇  ',
  ' ◆    \n' +
  '      \n' +
  '    ◇ ',
]

export function OrbitMine({ className = '' }) {
  return <AsciiFrames frames={ORBIT_FRAMES} interval={200} className={className} />
}

// ── Typing prompt ────────────────────────────────────
// Simulates a cursor blinking at the end of scrolling log lines
const PROMPT_LINES = [
  '> scanning ports...',
  '> 443/tcp OPEN [ssl]',
  '> 22/tcp FILTERED',
  '> 8080/tcp OPEN [http]',
  '> enumerating services...',
  '> fingerprint: OpenSSH 8.9',
  '> injecting payload...',
  '> ACK received',
  '> tunneling established',
  '> probing firewall rules...',
  '> bypass vector found',
  '> escalating privileges...',
]

export function TerminalLog({ lines = 5, speed = 1800, className = '' }) {
  const [offset, setOffset] = useState(0)
  const [blink, setBlink] = useState(true)

  useEffect(() => {
    const id = setInterval(() => setOffset(o => (o + 1) % PROMPT_LINES.length), speed)
    return () => clearInterval(id)
  }, [speed])

  useEffect(() => {
    const id = setInterval(() => setBlink(b => !b), 530)
    return () => clearInterval(id)
  }, [])

  const visible = []
  for (let i = 0; i < lines; i++) {
    visible.push(PROMPT_LINES[(offset + i) % PROMPT_LINES.length])
  }

  return (
    <pre className={`leading-relaxed select-none font-mono whitespace-pre ${className}`}>
      {visible.map((l, i) => {
        const isLast = i === lines - 1
        const opacity = 0.3 + (i / lines) * 0.7
        return (
          <div key={i + offset} style={{ opacity }}>
            {l}{isLast && blink ? '█' : isLast ? ' ' : ''}
          </div>
        )
      })}
    </pre>
  )
}
