import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore, GAME_PHASE } from '../store/gameStore'
import { getNode, NODES } from '../engine/nodes'
import { UPGRADES, UPGRADE_TYPE } from '../engine/upgrades'
import { THEMES } from '../themes'

const COMMANDS = [
  { id: 'status', label: '/status', description: 'View current build' },
  { id: 'settings', label: '/settings', description: 'Theme & sound' },
]

function StatusPanel() {
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const cache = useGameStore(s => s.cache)
  const entropy = useGameStore(s => s.entropy)
  const subroutines = useGameStore(s => s.subroutines)
  const exploits = useGameStore(s => s.exploits)
  const kernelLevels = useGameStore(s => s.kernelLevels)

  const node = getNode(currentNodeId)

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      {/* Node info */}
      <div>
        <div className="text-[var(--crt-green-dim)] text-xs mb-1">NODE {String(currentNodeId).padStart(2, '0')} / {NODES.length}</div>
        <div className="text-[var(--crt-amber)] glow-amber font-bold">{node.name}</div>
        <div className="text-[var(--crt-green-dim)] text-xs">{node.subtitle}</div>
      </div>

      {/* Stats */}
      <div className="border-t border-[var(--crt-green-dark)] pt-2 flex gap-6">
        <div>
          <span className="text-[var(--crt-green-dim)] text-xs">FIREWALL </span>
          <span className="text-[var(--crt-green)] font-bold">{firewalls}/{maxFirewalls}</span>
        </div>
        <div>
          <span className="text-[var(--crt-green-dim)] text-xs">CACHE </span>
          <span className="text-[var(--crt-amber)] font-bold">${cache}</span>
        </div>
        <div>
          <span className="text-[var(--crt-green-dim)] text-xs">ENTROPY </span>
          <span className="text-[var(--crt-cyan)] font-bold">{entropy}</span>
        </div>
      </div>

      {/* Subroutines */}
      {Object.keys(subroutines).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-2">
          <div className="text-[var(--crt-green-dim)] text-xs mb-1">SUBROUTINES</div>
          {Object.entries(subroutines).map(([id, level]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-0.5">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-xs">LVL {level}/{u.maxLevel}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Exploits */}
      {Object.keys(exploits).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-2">
          <div className="text-[var(--crt-green-dim)] text-xs mb-1">EXPLOITS</div>
          {Object.entries(exploits).map(([id, charges]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-0.5">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-xs">{charges} charge{charges !== 1 ? 's' : ''}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Kernel */}
      {Object.keys(kernelLevels).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-2">
          <div className="text-[var(--crt-green-dim)] text-xs mb-1">KERNEL</div>
          {Object.entries(kernelLevels).map(([id, level]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-0.5">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-xs">LVL {level}/{u.maxLevel}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {Object.keys(subroutines).length === 0 && Object.keys(exploits).length === 0 && Object.keys(kernelLevels).length === 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-2 text-[var(--crt-green-dim)] text-xs">
          No upgrades installed. Visit the terminal between nodes.
        </div>
      )}
    </div>
  )
}

function SettingsPanel() {
  const currentTheme = useGameStore(s => s.currentTheme)
  const setTheme = useGameStore(s => s.setTheme)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const themeEntries = Object.entries(THEMES)

  // Find initial index matching current theme
  useEffect(() => {
    const idx = themeEntries.findIndex(([id]) => id === currentTheme)
    if (idx >= 0) setSelectedIdx(idx)
  }, [currentTheme])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIdx(i => Math.min(i + 1, themeEntries.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIdx(i => Math.max(i - 1, 0))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const [id] = themeEntries[selectedIdx]
        setTheme(id)
      } else if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        toggleSound()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIdx, themeEntries, setTheme, toggleSound])

  return (
    <div className="flex flex-col gap-3 p-3 text-sm">
      <div className="text-[var(--crt-green-dim)] text-xs">THEME <span className="text-[var(--crt-green-dark)]">(arrow keys + enter)</span></div>
      {themeEntries.map(([id, theme], i) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`flex items-center gap-2 px-2 py-1 text-left transition-colors ${
            i === selectedIdx ? 'bg-[var(--crt-green)] text-[var(--crt-bg)]' : ''
          } ${currentTheme === id && i !== selectedIdx ? 'text-[var(--crt-green)]' : i !== selectedIdx ? 'text-[var(--crt-green-dim)]' : ''}`}
        >
          <span
            className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.primary }}
          />
          {theme.name}
          {currentTheme === id && ' *'}
        </button>
      ))}

      <div className="border-t border-[var(--crt-green-dark)] pt-2">
        <div className="text-[var(--crt-green-dim)] text-xs mb-1">SOUND <span className="text-[var(--crt-green-dark)]">(press S)</span></div>
        <button
          onClick={toggleSound}
          className="terminal-btn text-xs py-1 px-3"
        >
          {soundEnabled ? 'SND: ON' : 'SND: OFF'}
        </button>
      </div>
    </div>
  )
}

export default function CommandOverlay() {
  const phase = useGameStore(s => s.phase)
  const commandOverlayOpen = useGameStore(s => s.commandOverlayOpen)
  const openCommandOverlay = useGameStore(s => s.openCommandOverlay)
  const closeCommandOverlay = useGameStore(s => s.closeCommandOverlay)

  const [input, setInput] = useState('/')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [activeCommand, setActiveCommand] = useState(null)
  const inputRef = useRef(null)

  const allowedPhases = [GAME_PHASE.GRID, GAME_PHASE.TERMINAL]

  // Filter commands based on input
  const filter = input.startsWith('/') ? input.slice(1).toLowerCase() : input.toLowerCase()
  const filtered = COMMANDS.filter(c => c.id.includes(filter))

  // Global keydown to open overlay
  useEffect(() => {
    const handler = (e) => {
      if (e.key === '/' && !commandOverlayOpen && allowedPhases.includes(phase)) {
        // Don't open if user is typing in an input/textarea
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
        e.preventDefault()
        openCommandOverlay()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [phase, commandOverlayOpen, openCommandOverlay])

  // Focus input when opened, reset state
  useEffect(() => {
    if (commandOverlayOpen) {
      setInput('/')
      setSelectedIdx(0)
      setActiveCommand(null)
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        inputRef.current?.focus()
      })
    }
  }, [commandOverlayOpen])

  // Clamp selectedIdx when filtered list changes
  useEffect(() => {
    if (selectedIdx >= filtered.length) {
      setSelectedIdx(Math.max(0, filtered.length - 1))
    }
  }, [filtered.length, selectedIdx])

  const executeCommand = useCallback((cmd) => {
    setActiveCommand(cmd.id)
  }, [])

  const handleKeyDown = (e) => {
    if (activeCommand) {
      // In command view, Escape goes back to command list
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setActiveCommand(null)
        setInput('/')
        setSelectedIdx(0)
        requestAnimationFrame(() => inputRef.current?.focus())
      }
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      closeCommandOverlay()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx(i => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filtered.length > 0) {
        executeCommand(filtered[selectedIdx])
      }
    }
  }

  if (!commandOverlayOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={closeCommandOverlay}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Palette */}
      <div
        className="relative w-full max-w-md border border-[var(--crt-green-dim)] bg-[var(--crt-bg)] shadow-[0_0_30px_var(--crt-green-glow)]"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Input row */}
        <div className="flex items-center border-b border-[var(--crt-green-dark)] px-3 py-2">
          <span className="text-[var(--crt-green-dim)] mr-1">&gt;</span>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => {
              const val = e.target.value
              setInput(val.startsWith('/') ? val : '/' + val)
              setSelectedIdx(0)
              setActiveCommand(null)
            }}
            className="flex-1 bg-transparent text-[var(--crt-green)] caret-[var(--crt-green)] outline-none font-mono text-sm"
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Command list or active panel */}
        {activeCommand === 'status' ? (
          <div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--crt-green-dark)] bg-[var(--crt-bg-light)]">
              <span className="text-[var(--crt-green)] text-xs font-bold">/STATUS</span>
              <span className="text-[var(--crt-green-dark)] text-xs">ESC to go back</span>
            </div>
            <StatusPanel />
          </div>
        ) : activeCommand === 'settings' ? (
          <div>
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--crt-green-dark)] bg-[var(--crt-bg-light)]">
              <span className="text-[var(--crt-green)] text-xs font-bold">/SETTINGS</span>
              <span className="text-[var(--crt-green-dark)] text-xs">ESC to go back</span>
            </div>
            <SettingsPanel />
          </div>
        ) : (
          <div>
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                  i === selectedIdx
                    ? 'bg-[var(--crt-green)] text-[var(--crt-bg)]'
                    : 'text-[var(--crt-green-dim)] hover:bg-[var(--crt-bg-light)]'
                }`}
              >
                <span className={`font-bold ${i === selectedIdx ? '' : 'text-[var(--crt-green)]'}`}>
                  {i === selectedIdx ? '\u25B8' : '\u00A0'} {cmd.label}
                </span>
                <span className={i === selectedIdx ? 'opacity-80' : ''}>{cmd.description}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-3 text-[var(--crt-green-dim)] text-xs">
                No matching commands
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
