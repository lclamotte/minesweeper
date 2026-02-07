import { useState, useEffect, useRef, useCallback } from 'react'
import { useGameStore, GAME_PHASE } from '../store/gameStore'
import { getNode, NODES } from '../engine/nodes'
import { UPGRADES, UPGRADE_TYPE } from '../engine/upgrades'
import { THEMES } from '../themes'

const COMMANDS = [
  { id: 'status', label: '/status', description: 'View current build' },
  { id: 'settings', label: '/settings', description: 'Theme & sound' },
  { id: 'quit', label: '/quit', description: 'Abandon run' },
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
    <div className="flex flex-col gap-4 p-4 text-base">
      {/* Node info */}
      <div>
        <div className="text-[var(--crt-green-dim)] text-sm mb-1">NODE {String(currentNodeId).padStart(2, '0')} / {NODES.length}</div>
        <div className="text-[var(--crt-amber)] glow-amber font-bold text-lg">{node.name}</div>
        <div className="text-[var(--crt-green-dim)] text-sm">{node.subtitle}</div>
      </div>

      {/* Stats */}
      <div className="border-t border-[var(--crt-green-dark)] pt-3 flex gap-8">
        <div>
          <span className="text-[var(--crt-green-dim)] text-sm">FIREWALL </span>
          <span className="text-[var(--crt-green)] font-bold">{firewalls}/{maxFirewalls}</span>
        </div>
        <div>
          <span className="text-[var(--crt-green-dim)] text-sm">CACHE </span>
          <span className="text-[var(--crt-amber)] font-bold">${cache}</span>
        </div>
        <div>
          <span className="text-[var(--crt-green-dim)] text-sm">ENTROPY </span>
          <span className="text-[var(--crt-cyan)] font-bold">{entropy}</span>
        </div>
      </div>

      {/* Subroutines */}
      {Object.keys(subroutines).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-3">
          <div className="text-[var(--crt-green-dim)] text-sm mb-2">SUBROUTINES</div>
          {Object.entries(subroutines).map(([id, level]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-1">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-sm">LVL {level}/{u.maxLevel}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Exploits */}
      {Object.keys(exploits).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-3">
          <div className="text-[var(--crt-green-dim)] text-sm mb-2">EXPLOITS</div>
          {Object.entries(exploits).map(([id, charges]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-1">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-sm">{charges} charge{charges !== 1 ? 's' : ''}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Kernel */}
      {Object.keys(kernelLevels).length > 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-3">
          <div className="text-[var(--crt-green-dim)] text-sm mb-2">KERNEL</div>
          {Object.entries(kernelLevels).map(([id, level]) => {
            const u = UPGRADES[id]
            if (!u) return null
            return (
              <div key={id} className="flex items-center justify-between py-1">
                <span className="text-[var(--crt-green)]">{u.name}</span>
                <span className="text-[var(--crt-green-dim)] text-sm">LVL {level}/{u.maxLevel}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Empty state */}
      {Object.keys(subroutines).length === 0 && Object.keys(exploits).length === 0 && Object.keys(kernelLevels).length === 0 && (
        <div className="border-t border-[var(--crt-green-dark)] pt-3 text-[var(--crt-green-dim)] text-sm">
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
    <div className="flex flex-col gap-4 p-4 text-base">
      <div className="text-[var(--crt-green-dim)] text-sm">THEME <span className="text-[var(--crt-green-dark)]">(arrow keys + enter)</span></div>
      {themeEntries.map(([id, theme], i) => (
        <button
          key={id}
          onClick={() => setTheme(id)}
          className={`flex items-center gap-3 px-3 py-2 text-left transition-colors ${
            i === selectedIdx ? 'bg-[var(--crt-green)] text-[var(--crt-bg)]' : ''
          } ${currentTheme === id && i !== selectedIdx ? 'text-[var(--crt-green)]' : i !== selectedIdx ? 'text-[var(--crt-green-dim)]' : ''}`}
        >
          <span
            className="inline-block w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: theme.primary }}
          />
          {theme.name}
          {currentTheme === id && ' *'}
        </button>
      ))}

      <div className="border-t border-[var(--crt-green-dark)] pt-3">
        <div className="text-[var(--crt-green-dim)] text-sm mb-2">SOUND <span className="text-[var(--crt-green-dark)]">(press S)</span></div>
        <button
          onClick={toggleSound}
          className="terminal-btn text-sm py-1.5 px-4"
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

  const allowedPhases = [GAME_PHASE.TERMINAL, GAME_PHASE.NODE_COMPLETE]

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

  const abandonRun = useGameStore(s => s.abandonRun)

  const executeCommand = useCallback((cmd) => {
    if (cmd.id === 'quit') {
      closeCommandOverlay()
      abandonRun()
      return
    }
    setActiveCommand(cmd.id)
  }, [closeCommandOverlay, abandonRun])

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
      className="fixed inset-0 z-50 flex items-end justify-center"
      onClick={closeCommandOverlay}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Palette — anchored to bottom */}
      <div
        className="relative w-full max-w-lg border border-[var(--crt-green-dim)] bg-[var(--crt-bg)] shadow-[0_0_30px_var(--crt-green-glow)] flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Command list or active panel — above input */}
        {activeCommand === 'status' ? (
          <div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--crt-green-dark)] bg-[var(--crt-bg-light)]">
              <span className="text-[var(--crt-green)] text-sm font-bold">/STATUS</span>
              <span className="text-[var(--crt-green-dark)] text-sm">ESC to go back</span>
            </div>
            <StatusPanel />
          </div>
        ) : activeCommand === 'settings' ? (
          <div>
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--crt-green-dark)] bg-[var(--crt-bg-light)]">
              <span className="text-[var(--crt-green)] text-sm font-bold">/SETTINGS</span>
              <span className="text-[var(--crt-green-dark)] text-sm">ESC to go back</span>
            </div>
            <SettingsPanel />
          </div>
        ) : (
          <div>
            {filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => executeCommand(cmd)}
                className={`w-full flex items-center gap-4 px-4 py-3 text-base text-left transition-colors ${
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
              <div className="px-4 py-4 text-[var(--crt-green-dim)] text-sm">
                No matching commands
              </div>
            )}
          </div>
        )}

        {/* Input row — at the bottom */}
        <div className="flex items-center border-t border-[var(--crt-green-dark)] px-4 py-3">
          <span className="text-[var(--crt-green-dim)] mr-2 text-lg">&gt;</span>
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
            className="flex-1 bg-transparent text-[var(--crt-green)] caret-[var(--crt-green)] outline-none font-mono text-base"
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>
    </div>
  )
}
