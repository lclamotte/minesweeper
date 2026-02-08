import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { THEMES } from '../themes'
import GameGrid from './GameGrid'
import HUD from './HUD'

const MAX_LOG_LINES = 80
const SHOW_GRID_COMMAND_TERMINAL = false

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

  const [input, setInput] = useState('')
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
      if (document.activeElement === inputRef.current) {
        e.preventDefault()
        return
      }

      const tag = (e.target?.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return

      e.preventDefault()
      inputRef.current?.focus()
    }

    window.addEventListener('keydown', onSlashFocus)
    return () => window.removeEventListener('keydown', onSlashFocus)
  }, [])

  const runCommand = (raw) => {
    const cmdline = raw.trim().replace(/^\/+/, '')
    if (!cmdline) return

    appendLog('in', `> ${cmdline}`)
    const [cmdRaw, ...args] = cmdline.split(/\s+/)
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
    setInput('')
  }

  return (
    <aside className="hidden lg:flex absolute right-2 bottom-2 z-30 w-56 xl:w-64 max-h-[54vh] border border-[var(--crt-green-dark)] bg-[#060a06e6] backdrop-blur-[1px] shadow-[0_0_18px_rgba(0,255,65,0.2)] flex-col overflow-hidden">
      <div className="px-2 py-1.5 border-b border-[var(--crt-green-dark)] text-[var(--crt-green)] font-bold tracking-widest text-[0.65rem]">
        CMD // INTERACTIVE
      </div>

      <div className="px-2 py-1 text-[0.65rem] text-[var(--crt-green-dark)] border-b border-[var(--crt-green-dark)]">
        TIP: press <span className="text-[var(--crt-green)]">/</span> to focus
      </div>

      <div className="flex-1 overflow-y-auto p-2 font-mono text-[0.72rem] leading-4">
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

      <form onSubmit={handleSubmit} className="border-t border-[var(--crt-green-dark)] p-1.5">
        <div className="flex items-center gap-1.5 border border-[var(--crt-green-dark)] px-1.5 py-0.5 bg-[#030603]">
          <span className="text-[var(--crt-green)] text-[0.65rem]">&gt;</span>
          <input
            ref={inputRef}
            value={input}
            onKeyDown={(e) => {
              if (e.key === '/') {
                e.preventDefault()
              }
            }}
            onChange={(e) => setInput(e.target.value.replaceAll('/', ''))}
            className="flex-1 bg-transparent text-[var(--crt-green)] text-[0.7rem] outline-none font-mono"
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
    <div className="flex-1 min-h-0 p-1.5 overflow-hidden">
      <div className="relative h-full w-full">
        <div className="relative h-full w-full min-w-0 min-h-0 flex flex-col border border-[var(--crt-green-dark)] bg-[#050805]">
          <GameGrid />
          <HUD />
        </div>
        {SHOW_GRID_COMMAND_TERMINAL && <CommandsTerminal />}
      </div>
    </div>
  )
}
