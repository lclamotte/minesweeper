import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { THEMES } from '../themes'

export default function HUD() {
  const [showThemes, setShowThemes] = useState(false)
  const themeRef = useRef(null)

  useEffect(() => {
    if (!showThemes) return
    const handler = (e) => {
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setShowThemes(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [showThemes])

  const currentNodeId = useGameStore(s => s.currentNodeId)
  const firewalls = useGameStore(s => s.firewalls)
  const maxFirewalls = useGameStore(s => s.maxFirewalls)
  const cache = useGameStore(s => s.cache)
  const entropy = useGameStore(s => s.entropy)
  const elapsed = useGameStore(s => s.elapsed)
  const engine = useGameStore(s => s.engine)
  const exploits = useGameStore(s => s.exploits)
  const activateDeepScan = useGameStore(s => s.activateDeepScan)
  const activateSqlInject = useGameStore(s => s.activateSqlInject)
  const useBitShift = useGameStore(s => s.useBitShift)
  const useDefrag = useGameStore(s => s.useDefrag)
  const useOverclock = useGameStore(s => s.useOverclock)
  const useSystemRestore = useGameStore(s => s.useSystemRestore)
  const useForkChain = useGameStore(s => s.useForkChain)
  const useSignalJammer = useGameStore(s => s.useSignalJammer)
  const useReboot = useGameStore(s => s.useReboot)
  const useDockerCompose = useGameStore(s => s.useDockerCompose)
  const deepScanActive = useGameStore(s => s.deepScanActive)
  const sqlInjectActive = useGameStore(s => s.sqlInjectActive)
  const overclockUntil = useGameStore(s => s.overclockUntil)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)
  const currentTheme = useGameStore(s => s.currentTheme)
  const setTheme = useGameStore(s => s.setTheme)
  const ledgerLevel = useGameStore(s => s.subroutines.ledger_link || 0)
  const ledgerMineOrder = useGameStore(s => s.ledgerMineOrder)
  const ledgerValidatedBlocks = useGameStore(s => s.ledgerValidatedBlocks)

  const node = getNode(currentNodeId)
  const completion = engine ? engine.getCompletionPercent() : 0
  const minesLeft = engine ? engine.mineCount - engine.flaggedCount : 0
  const ledgerProgress = ledgerMineOrder.length % 5
  const hasLedgerLink = ledgerLevel > 0
  const hasExploits = Object.keys(exploits).length > 0
  const overclockRemaining = Math.max(0, Math.ceil((overclockUntil - Date.now()) / 1000))

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const exploitButtons = [
    { id: 'deep_scan', label: 'SCAN', charges: exploits.deep_scan || 0, action: activateDeepScan, active: deepScanActive, title: 'Reveal mine info in a 3x3 area' },
    { id: 'sql_inject', label: 'SQL', charges: exploits.sql_inject || 0, action: activateSqlInject, active: sqlInjectActive, title: 'Select a row to expose mines' },
    { id: 'bit_shift', label: 'SHIFT', charges: exploits.bit_shift || 0, action: useBitShift, title: 'Reveal a random safe cell' },
    { id: 'defrag', label: 'DEFRAG', charges: exploits.defrag || 0, action: useDefrag, title: 'Reveal hidden zero-value cells' },
    { id: 'overclock', label: 'OC', charges: exploits.overclock || 0, action: useOverclock, title: '15s entropy overclock' },
    { id: 'fork_chain', label: 'FORK', charges: exploits.fork_chain || 0, action: useForkChain, title: 'Mass-validate chain blocks' },
    { id: 'signal_jammer', label: 'JAM', charges: exploits.signal_jammer || 0, action: useSignalJammer, title: 'Add 30s timer drift' },
    { id: 'reboot', label: 'REBOOT', charges: exploits.reboot || 0, action: useReboot, title: 'Reshuffle hidden tiles' },
    { id: 'system_restore', label: 'RESTORE', charges: exploits.system_restore || 0, action: useSystemRestore, title: 'Clear transient overlays' },
    { id: 'docker_compose', label: 'DOCKER', charges: exploits.docker_compose || 0, action: useDockerCompose, title: 'Containerization stub' },
  ].filter(btn => btn.charges > 0)

  return (
    <div className="w-full shrink-0 border-b border-[var(--crt-green-dim)] bg-[#0c0c0c]">
      <div className="flex items-center justify-between px-4 py-2 gap-5 text-sm flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-[var(--crt-green-dim)]">NODE</span>
          <span className="text-[var(--crt-green)] glow font-bold text-base">
            {String(currentNodeId).padStart(2, '0')}
          </span>
          <span className="text-[var(--crt-green-dim)]">//</span>
          <span className="text-[var(--crt-amber)] glow-amber font-bold">{node.name}</span>
          <span className="text-[var(--crt-green-dim)] ml-1">T+</span>
          <span className="text-[var(--crt-green)] glow font-bold text-base tabular-nums">
            {formatTime(elapsed)}
          </span>
          {overclockRemaining > 0 && (
            <span className="text-[var(--crt-red)] glow-red font-bold tabular-nums text-xs">
              OC:{overclockRemaining}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">FW</span>
            <div className="flex gap-1">
              {Array.from({ length: maxFirewalls }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3.5 h-3.5 border-2 ${
                    i < firewalls
                      ? 'border-[var(--crt-green)] bg-[var(--crt-green)] shadow-[0_0_4px_var(--crt-green-glow)]'
                      : 'border-[var(--crt-red)] bg-transparent opacity-50'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">MINES</span>
            <span className={`font-bold text-base tabular-nums ${minesLeft <= 3 ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-red)] glow-red'}`}>
              {String(minesLeft).padStart(3, '0')}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">SCAN</span>
            <div className="w-20 h-2.5 bg-[#111] border border-[var(--crt-green-dim)] overflow-hidden">
              <div
                className="h-full bg-[var(--crt-green)] transition-all duration-300"
                style={{ width: `${completion}%`, boxShadow: '0 0 4px var(--crt-green-glow)' }}
              />
            </div>
            <span className="text-[var(--crt-green)] glow font-bold tabular-nums">{completion}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">CACHE</span>
            <span className="text-[var(--crt-amber)] glow-amber font-bold text-base tabular-nums">${cache}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">ENT</span>
            <span className="text-[var(--crt-cyan)] font-bold text-base tabular-nums">{entropy}</span>
          </div>

          {hasLedgerLink && (
            <div className="flex items-center gap-2">
              <span className="text-[var(--crt-green-dim)]">LEDGER</span>
              <span className="font-bold text-base tabular-nums text-[#39ff14] drop-shadow-[0_0_4px_rgba(57,255,20,0.65)]">
                {ledgerProgress}/5
              </span>
              <span className="text-[var(--crt-green-dim)] text-xs">
                B{ledgerValidatedBlocks}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {hasExploits && exploitButtons.length > 0 && (
            <>
              {exploitButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={btn.action}
                  className={`terminal-btn text-xs py-1 px-2 ${btn.active ? 'bg-[var(--crt-green)] text-black' : ''}`}
                  title={btn.title}
                >
                  {btn.label}[{btn.charges}]
                </button>
              ))}
              <span className="text-[var(--crt-green-dark)]">|</span>
            </>
          )}

          <div ref={themeRef} className="relative">
            <button
              onClick={() => setShowThemes(!showThemes)}
              title="Change color theme"
              className="text-[var(--crt-green-dim)] hover:text-[var(--crt-green)] transition-colors"
            >
              THM
            </button>
            {showThemes && (
              <div className="absolute right-0 top-full mt-1 z-50 border border-[var(--crt-green-dim)] bg-[var(--crt-bg)] min-w-[160px]">
                {Object.entries(THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); setShowThemes(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[var(--crt-green)] hover:text-[var(--crt-bg)] transition-colors ${
                      currentTheme === id ? 'text-[var(--crt-green)]' : 'text-[var(--crt-green-dim)]'
                    }`}
                  >
                    <span
                      className="inline-block w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: theme.primary }}
                    />
                    {theme.name}
                    {currentTheme === id && ' *'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleSound}
            title="Toggle sound effects"
            className="text-[var(--crt-green-dim)] hover:text-[var(--crt-green)] transition-colors"
          >
            {soundEnabled ? 'SND' : 'MUTE'}
          </button>
        </div>
      </div>
    </div>
  )
}
