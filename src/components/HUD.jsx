import { useEffect, useRef, useState } from 'react'
import { useGameStore } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { THEMES } from '../themes'

function StatRow({ label, value, valueClassName = '' }) {
  return (
    <div className="flex items-center justify-between gap-2 text-[0.7rem]">
      <span className="text-[var(--crt-green-dim)] tracking-wider">{label}</span>
      <span className={`font-bold tabular-nums text-[var(--crt-green)] ${valueClassName}`}>{value}</span>
    </div>
  )
}

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
  const hasLedgerLink = ledgerLevel > 0
  const overclockRemaining = Math.max(0, Math.ceil((overclockUntil - Date.now()) / 1000))
  const ledgerProgress = ledgerMineOrder.length % 5

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
    <div className="pointer-events-none absolute inset-y-1 left-1 right-1 z-20 flex justify-between gap-2">
      <aside className="pointer-events-auto w-[clamp(8.5rem,16vw,14.5rem)] border border-[var(--crt-green-dark)] bg-[#060a06e0] backdrop-blur-[1px] shadow-[0_0_16px_rgba(0,255,65,0.16)] flex flex-col overflow-hidden">
        <div className="px-2 py-1 border-b border-[var(--crt-green-dark)] text-[0.62rem] font-bold tracking-[0.2em] text-[var(--crt-green)]">
          SYSTEM
        </div>
        <div className="p-2 space-y-2 overflow-y-auto">
          <div className="space-y-1.5">
            <div className="text-[0.62rem] text-[var(--crt-green-dim)] tracking-wider">NODE</div>
            <div className="text-[var(--crt-amber)] font-bold text-[0.76rem] leading-tight break-all">
              {String(currentNodeId).padStart(2, '0')} // {node.name}
            </div>
          </div>

          <StatRow label="TIME" value={formatTime(elapsed)} valueClassName="glow" />
          {overclockRemaining > 0 && (
            <StatRow label="OVERCLOCK" value={`${overclockRemaining}s`} valueClassName="text-[var(--crt-red)] glow-red" />
          )}
          <StatRow
            label="MINES"
            value={String(minesLeft).padStart(3, '0')}
            valueClassName={minesLeft <= 3 ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-red)] glow-red'}
          />
          <StatRow label="CACHE" value={`$${cache}`} valueClassName="text-[var(--crt-amber)] glow-amber" />
          <StatRow label="ENTROPY" value={entropy} valueClassName="text-[var(--crt-cyan)]" />

          <div className="space-y-1">
            <div className="text-[var(--crt-green-dim)] tracking-wider text-[0.65rem]">SCAN</div>
            <div className="h-2 bg-[#111] border border-[var(--crt-green-dark)] overflow-hidden">
              <div
                className="h-full bg-[var(--crt-green)] transition-all duration-300"
                style={{ width: `${completion}%`, boxShadow: '0 0 4px var(--crt-green-glow)' }}
              />
            </div>
            <div className="text-right text-[0.7rem] text-[var(--crt-green)] tabular-nums">{completion}%</div>
          </div>

          <div className="space-y-1">
            <div className="text-[var(--crt-green-dim)] tracking-wider text-[0.65rem]">FIREWALLS</div>
            <div className="flex flex-wrap gap-1">
              {Array.from({ length: maxFirewalls }).map((_, i) => (
                <span
                  key={i}
                  className={`inline-block w-3 h-3 border ${
                    i < firewalls
                      ? 'border-[var(--crt-green)] bg-[var(--crt-green)] shadow-[0_0_4px_var(--crt-green-glow)]'
                      : 'border-[var(--crt-red)] bg-transparent opacity-50'
                  }`}
                />
              ))}
            </div>
          </div>

          {hasLedgerLink && (
            <div className="space-y-1 border-t border-[var(--crt-green-dark)] pt-2">
              <div className="text-[0.65rem] text-[var(--crt-green-dim)] tracking-wider">LEDGER</div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#39ff14] font-bold tabular-nums text-[0.8rem] drop-shadow-[0_0_4px_rgba(57,255,20,0.65)]">
                  {ledgerProgress}/5
                </span>
                <span className="text-[var(--crt-green-dim)] text-[0.65rem] tabular-nums">
                  BLOCKS {ledgerValidatedBlocks}
                </span>
              </div>
            </div>
          )}
        </div>
      </aside>

      <aside className="pointer-events-auto w-[clamp(8.5rem,16vw,14.5rem)] border border-[var(--crt-green-dark)] bg-[#060a06e0] backdrop-blur-[1px] shadow-[0_0_16px_rgba(0,255,65,0.16)] flex flex-col overflow-hidden">
        <div className="px-2 py-1 border-b border-[var(--crt-green-dark)] text-[0.62rem] font-bold tracking-[0.2em] text-[var(--crt-green)]">
          TOOLS
        </div>

        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          <div className="text-[0.65rem] text-[var(--crt-green-dim)] tracking-wider">EXPLOITS</div>
          {exploitButtons.length > 0 ? (
            <div className="space-y-1">
              {exploitButtons.map(btn => (
                <button
                  key={btn.id}
                  onClick={btn.action}
                  title={btn.title}
                  className={`w-full terminal-btn text-[0.63rem] px-2 py-1.5 flex items-center justify-between ${btn.active ? 'bg-[var(--crt-green)] text-black' : ''}`}
                >
                  <span>{btn.label}</span>
                  <span className="tabular-nums">{btn.charges}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-[0.7rem] text-[var(--crt-green-dark)]">none loaded</div>
          )}
        </div>

        <div className="mt-auto border-t border-[var(--crt-green-dark)] p-2 space-y-2">
          <div ref={themeRef} className="relative">
            <button
              onClick={() => setShowThemes(!showThemes)}
              className="terminal-btn w-full text-[0.63rem] px-2 py-1.5"
              title="Change color theme"
            >
              THEME: {THEMES[currentTheme]?.name || currentTheme}
            </button>
            {showThemes && (
              <div className="absolute right-0 bottom-full mb-1 w-full z-50 border border-[var(--crt-green-dim)] bg-[var(--crt-bg)] max-h-44 overflow-y-auto">
                {Object.entries(THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); setShowThemes(false) }}
                    className={`w-full flex items-center gap-2 px-2 py-1.5 text-[0.68rem] text-left hover:bg-[var(--crt-green)] hover:text-[var(--crt-bg)] transition-colors ${
                      currentTheme === id ? 'text-[var(--crt-green)]' : 'text-[var(--crt-green-dim)]'
                    }`}
                  >
                    <span className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: theme.primary }} />
                    <span className="truncate">{theme.name}</span>
                    {currentTheme === id && <span className="ml-auto">*</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={toggleSound}
            className="terminal-btn w-full text-[0.63rem] px-2 py-1.5"
            title="Toggle sound effects"
          >
            {soundEnabled ? 'SOUND: ON' : 'SOUND: OFF'}
          </button>
        </div>
      </aside>
    </div>
  )
}
