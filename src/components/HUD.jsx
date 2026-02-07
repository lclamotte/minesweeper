import { useState, useRef, useEffect } from 'react'
import { useGameStore } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { THEMES } from '../themes'

export default function HUD() {
  const [showThemes, setShowThemes] = useState(false)
  const themeRef = useRef(null)

  // Close dropdown on outside click
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
  const useBitShift = useGameStore(s => s.useBitShift)
  const useDefrag = useGameStore(s => s.useDefrag)
  const deepScanActive = useGameStore(s => s.deepScanActive)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)
  const currentTheme = useGameStore(s => s.currentTheme)
  const setTheme = useGameStore(s => s.setTheme)

  const node = getNode(currentNodeId)
  const completion = engine ? engine.getCompletionPercent() : 0
  const minesLeft = engine ? engine.mineCount - engine.flaggedCount : 0

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  return (
    <div className="w-full border-b-2 border-[var(--crt-green-dim)] bg-[#0c0c0c]">
      {/* Top bar: Node + Timer + Sound */}
      <div className="flex items-center justify-between px-5 py-2.5 text-sm tracking-wider">
        <div className="flex items-center gap-3">
          <span className="text-[var(--crt-green-dim)] text-xs">NODE</span>
          <span className="text-[var(--crt-green)] glow font-bold text-lg">
            {String(currentNodeId).padStart(2, '0')}
          </span>
          <span className="text-[var(--crt-green-dim)]">//</span>
          <span className="text-[var(--crt-amber)] glow-amber font-bold">{node.name}</span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Elapsed time since first click">T+</span>
          <span className="text-[var(--crt-green)] glow font-bold text-lg tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div ref={themeRef} className="relative">
            <button
              onClick={() => setShowThemes(!showThemes)}
              title="Change color theme"
              className="text-[var(--crt-green-dim)] hover:text-[var(--crt-green)] transition-colors text-xs"
            >
              THM
            </button>
            {showThemes && (
              <div className="absolute right-0 top-full mt-1 z-50 border border-[var(--crt-green-dim)] bg-[var(--crt-bg)] min-w-[140px]">
                {Object.entries(THEMES).map(([id, theme]) => (
                  <button
                    key={id}
                    onClick={() => { setTheme(id); setShowThemes(false) }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left hover:bg-[var(--crt-green)] hover:text-[var(--crt-bg)] transition-colors ${
                      currentTheme === id ? 'text-[var(--crt-green)]' : 'text-[var(--crt-green-dim)]'
                    }`}
                  >
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
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
            className="text-[var(--crt-green-dim)] hover:text-[var(--crt-green)] transition-colors text-xs"
          >
            {soundEnabled ? 'SND:ON' : 'SND:OFF'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between px-5 py-2 border-t border-[var(--crt-green-dark)] text-sm">
        {/* Firewalls */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Lives remaining. Absorbs mine hits.">FIREWALL</span>
          <div className="flex gap-1.5">
            {Array.from({ length: maxFirewalls }).map((_, i) => (
              <span
                key={i}
                className={`inline-block w-4 h-4 border-2 ${
                  i < firewalls
                    ? 'border-[var(--crt-green)] bg-[var(--crt-green)] shadow-[0_0_6px_var(--crt-green-glow)]'
                    : 'border-[var(--crt-red)] bg-transparent opacity-50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Mines remaining */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Mines remaining (total mines minus flags placed)">MINES</span>
          <span className={`font-bold text-lg tabular-nums ${minesLeft <= 3 ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-red)] glow-red'}`}>
            {String(minesLeft).padStart(3, '0')}
          </span>
        </div>

        {/* Completion */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Scan progress — percentage of safe cells revealed">SCAN</span>
          <div className="w-28 h-3 bg-[#111] border border-[var(--crt-green-dim)] overflow-hidden">
            <div
              className="h-full bg-[var(--crt-green)] transition-all duration-300"
              style={{ width: `${completion}%`, boxShadow: '0 0 6px var(--crt-green-glow)' }}
            />
          </div>
          <span className="text-[var(--crt-green)] glow font-bold tabular-nums">{completion}%</span>
        </div>

        {/* Cache */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Cache — currency earned by completing nodes. Spend at the terminal.">CACHE</span>
          <span className="text-[var(--crt-amber)] glow-amber font-bold text-lg tabular-nums">
            ${cache}
          </span>
        </div>

        {/* Entropy */}
        <div className="flex items-center gap-2">
          <span className="text-[var(--crt-green-dim)] text-xs" title="Entropy — earned by revealing cells. Converted to bonus cache on node completion.">ENT</span>
          <span className="text-[var(--crt-cyan)] font-bold text-lg tabular-nums">
            {entropy}
          </span>
        </div>
      </div>

      {/* Exploits bar */}
      {Object.keys(exploits).length > 0 && (
        <div className="flex items-center gap-3 px-5 py-2 border-t border-[var(--crt-green-dark)] text-xs">
          <span className="text-[var(--crt-green-dim)]">EXPLOITS:</span>
          {(exploits.deep_scan || 0) > 0 && (
            <button
              onClick={activateDeepScan}
              className={`terminal-btn text-xs py-1 px-3 ${deepScanActive ? 'bg-[var(--crt-green)] text-black' : ''}`}
            >
              <span title="Reveals mine info in a 3x3 area. Click a cell after activating.">DEEP_SCAN [{exploits.deep_scan}]</span>
            </button>
          )}
          {(exploits.bit_shift || 0) > 0 && (
            <button
              onClick={useBitShift}
              className="terminal-btn text-xs py-1 px-3"
            >
              <span title="Reveals a random safe cell">BIT_SHIFT [{exploits.bit_shift}]</span>
            </button>
          )}
          {(exploits.defrag || 0) > 0 && (
            <button
              onClick={useDefrag}
              className="terminal-btn text-xs py-1 px-3"
            >
              <span title="Reveals all hidden zero-value cells">DEFRAG [{exploits.defrag}]</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
