import { useEffect, useMemo, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { THEMES } from '../themes'
import GameGrid from './GameGrid'

const MAX_LOG_LINES = 80

function ReadonlyStatusTerminal() {
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const cache = useGameStore(s => s.cache)
  const entropy = useGameStore(s => s.entropy)
  const elapsed = useGameStore(s => s.elapsed)
  const engine = useGameStore(s => s.engine)
  const exploits = useGameStore(s => s.exploits)
  const subroutines = useGameStore(s => s.subroutines)

  const node = getNode(currentNodeId)
  const minesLeft = engine ? Math.max(0, engine.mineCount - engine.flaggedCount) : 0
  const completion = engine ? engine.getCompletionPercent() : 0

  const exploitLines = useMemo(
    () => Object.entries(exploits).filter(([, charges]) => charges > 0).slice(0, 6),
    [exploits]
  )
  const subroutineLines = useMemo(
    () => Object.entries(subroutines).filter(([, lvl]) => lvl > 0).slice(0, 4),
    [subroutines]
  )

  return (
    <aside className="hidden lg:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-64 xl:w-72 h-[28rem] xl:h-[32rem] max-h-[74vh] border border-[var(--crt-green-dark)] bg-[#060a06e6] backdrop-blur-[1px] shadow-[0_0_18px_rgba(0,255,65,0.2)] flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--crt-green-dark)] text-[var(--crt-green)] font-bold tracking-widest text-xs">
        STATUS // READONLY
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3 text-sm">
        <div>
          <div className="text-[var(--crt-green-dim)] text-xs">NODE</div>
          <div className="text-[var(--crt-green)] font-bold">{String(currentNodeId).padStart(2, '0')} // {node?.name}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[0.82rem]">
          <div>
            <div className="text-[var(--crt-green-dark)]">FIREWALL</div>
            <div className="text-[var(--crt-green)]">{firewalls}/{maxFirewalls}</div>
          </div>
          <div>
            <div className="text-[var(--crt-green-dark)]">MINES</div>
            <div className="text-[var(--crt-red)]">{String(minesLeft).padStart(3, '0')}</div>
          </div>
          <div>
            <div className="text-[var(--crt-green-dark)]">CACHE</div>
            <div className="text-[var(--crt-amber)]">${cache}</div>
          </div>
          <div>
            <div className="text-[var(--crt-green-dark)]">ENT</div>
            <div className="text-[var(--crt-cyan)]">{entropy}</div>
          </div>
          <div>
            <div className="text-[var(--crt-green-dark)]">TIME</div>
            <div className="text-[var(--crt-green)]">T+{String(elapsed).padStart(3, '0')}s</div>
          </div>
          <div>
            <div className="text-[var(--crt-green-dark)]">SCAN</div>
            <div className="text-[var(--crt-green)]">{completion}%</div>
          </div>
        </div>

        <div className="border-t border-[var(--crt-green-dark)] pt-2">
          <div className="text-[var(--crt-green-dim)] text-xs mb-1">ACTIVE EXPLOITS</div>
          {exploitLines.length > 0 ? (
            <div className="space-y-1 text-[0.78rem]">
              {exploitLines.map(([id, charges]) => (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--crt-green)] truncate">{id.toUpperCase()}</span>
                  <span className="text-[var(--crt-amber)] tabular-nums">x{charges}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--crt-green-dark)] text-[0.78rem]">none loaded</div>
          )}
        </div>

        <div className="border-t border-[var(--crt-green-dark)] pt-2">
          <div className="text-[var(--crt-green-dim)] text-xs mb-1">SUBROUTINES</div>
          {subroutineLines.length > 0 ? (
            <div className="space-y-1 text-[0.78rem]">
              {subroutineLines.map(([id, lvl]) => (
                <div key={id} className="flex items-center justify-between gap-2">
                  <span className="text-[var(--crt-green)] truncate">{id.toUpperCase()}</span>
                  <span className="text-[var(--crt-cyan)] tabular-nums">L{lvl}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[var(--crt-green-dark)] text-[0.78rem]">none compiled</div>
          )}
        </div>
      </div>
    </aside>
  )
}

function CommandsTerminal() {
  const abandonRun = useGameStore(s => s.abandonRun)
  const toggleSound = useGameStore(s => s.toggleSound)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const setTheme = useGameStore(s => s.setTheme)
  const currentTheme = useGameStore(s => s.currentTheme)
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const cache = useGameStore(s => s.cache)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const engine = useGameStore(s => s.engine)

  const [input, setInput] = useState('/')
  const [log, setLog] = useState([
    { type: 'sys', text: 'GRID COMMAND TERMINAL READY' },
    { type: 'sys', text: 'TYPE /help FOR COMMANDS' },
  ])

  const inputRef = useRef(null)
  const endRef = useRef(null)

  const appendLog = (type, text) => {
    setLog(prev => [...prev.slice(-MAX_LOG_LINES + 1), { type, text }])
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  useEffect(() => {
    const onSlashFocus = (e) => {
      if (e.key !== '/') return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      e.preventDefault()
      inputRef.current?.focus()
      setInput('/')
    }

    window.addEventListener('keydown', onSlashFocus)
    return () => window.removeEventListener('keydown', onSlashFocus)
  }, [])

  const runCommand = (raw) => {
    const cmdline = raw.trim()
    if (!cmdline) return

    appendLog('in', `> ${cmdline}`)

    if (!cmdline.startsWith('/')) {
      appendLog('err', 'Commands must start with /')
      return
    }

    const [cmdRaw, ...args] = cmdline.slice(1).split(/\s+/)
    const cmd = (cmdRaw || '').toLowerCase()

    if (cmd === 'help') {
      appendLog('out', '/help, /status, /sound, /theme [id], /clear, /quit')
      return
    }

    if (cmd === 'status') {
      const minesLeft = engine ? Math.max(0, engine.mineCount - engine.flaggedCount) : 0
      appendLog('out', `NODE ${currentNodeId} // FW ${firewalls}/${maxFirewalls} // MINES ${minesLeft} // CACHE $${cache}`)
      return
    }

    if (cmd === 'sound') {
      toggleSound()
      appendLog('out', `AUDIO ${soundEnabled ? 'OFF' : 'ON'}`)
      return
    }

    if (cmd === 'theme') {
      const ids = Object.keys(THEMES)
      if (ids.length === 0) {
        appendLog('err', 'NO THEMES AVAILABLE')
        return
      }

      if (args.length === 0) {
        const idx = Math.max(0, ids.indexOf(currentTheme))
        const nextId = ids[(idx + 1) % ids.length]
        setTheme(nextId)
        appendLog('out', `THEME -> ${nextId}`)
        return
      }

      const requested = args[0].toLowerCase()
      const resolved = ids.find(id => id.toLowerCase() === requested)
      if (!resolved) {
        appendLog('err', `UNKNOWN THEME: ${requested}`)
        appendLog('out', `AVAILABLE: ${ids.join(', ')}`)
        return
      }

      setTheme(resolved)
      appendLog('out', `THEME SET: ${resolved}`)
      return
    }

    if (cmd === 'clear') {
      setLog([])
      return
    }

    if (cmd === 'quit') {
      appendLog('err', 'ABANDONING RUN...')
      abandonRun()
      return
    }

    appendLog('err', `UNKNOWN COMMAND: /${cmd}`)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    runCommand(input)
    setInput('/')
  }

  return (
    <aside className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-30 w-72 xl:w-80 h-[28rem] xl:h-[32rem] max-h-[74vh] border border-[var(--crt-green-dark)] bg-[#060a06e6] backdrop-blur-[1px] shadow-[0_0_18px_rgba(0,255,65,0.2)] flex-col overflow-hidden">
      <div className="px-3 py-2 border-b border-[var(--crt-green-dark)] text-[var(--crt-green)] font-bold tracking-widest text-xs">
        CMD // INTERACTIVE
      </div>

      <div className="px-3 py-2 text-[0.72rem] text-[var(--crt-green-dark)] border-b border-[var(--crt-green-dark)]">
        TIP: press <span className="text-[var(--crt-green)]">/</span> to focus
      </div>

      <div className="flex-1 overflow-y-auto p-3 font-mono text-[0.78rem] leading-5">
        {log.map((line, idx) => (
          <div
            key={`${line.text}-${idx}`}
            className={
              line.type === 'err'
                ? 'text-[var(--crt-red)]'
                : line.type === 'in'
                  ? 'text-[var(--crt-amber)]'
                  : line.type === 'out'
                    ? 'text-[var(--crt-cyan)]'
                    : 'text-[var(--crt-green-dim)]'
            }
          >
            {line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-[var(--crt-green-dark)] p-2">
        <div className="flex items-center gap-2 border border-[var(--crt-green-dark)] px-2 py-1 bg-[#030603]">
          <span className="text-[var(--crt-green)] text-xs">&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1 bg-transparent text-[var(--crt-green)] text-xs outline-none font-mono"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </form>
    </aside>
  )
}

export default function GridWorkspace() {
  return (
    <div className="flex-1 min-h-0 p-3 overflow-hidden">
      <div className="relative h-full w-full">
        <ReadonlyStatusTerminal />
        <div className="h-full w-full min-w-0 min-h-0 border border-[var(--crt-green-dark)] bg-[#050805] lg:px-[17rem] xl:px-[19rem]">
          <GameGrid />
        </div>
        <CommandsTerminal />
      </div>
    </div>
  )
}
