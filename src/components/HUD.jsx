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

  const hasExploits = Object.keys(exploits).length > 0

  return (
    <div className="w-full shrink-0 border-b border-[var(--crt-green-dim)] bg-[#0c0c0c]">
      {/* Single compact row */}
      <div className="flex items-center justify-between px-4 py-2 gap-5 text-sm flex-wrap">
        {/* Left: Node + Timer */}
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
        </div>

        {/* Center: Stats */}
        <div className="flex items-center gap-5">
          {/* Firewalls */}
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

          {/* Mines */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">MINES</span>
            <span className={`font-bold text-base tabular-nums ${minesLeft <= 3 ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-red)] glow-red'}`}>
              {String(minesLeft).padStart(3, '0')}
            </span>
          </div>

          {/* Completion */}
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

          {/* Cache */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">CACHE</span>
            <span className="text-[var(--crt-amber)] glow-amber font-bold text-base tabular-nums">${cache}</span>
          </div>

          {/* Entropy */}
          <div className="flex items-center gap-2">
            <span className="text-[var(--crt-green-dim)]">ENT</span>
            <span className="text-[var(--crt-cyan)] font-bold text-base tabular-nums">{entropy}</span>
          </div>
        </div>

        {/* Right: Exploits + Settings */}
        <div className="flex items-center gap-2">
          {hasExploits && (
            <>
              {(exploits.deep_scan || 0) > 0 && (
                <button
                  onClick={activateDeepScan}
                  className={`terminal-btn text-xs py-1 px-2.5 ${deepScanActive ? 'bg-[var(--crt-green)] text-black' : ''}`}
                  title="Reveals mine info in a 3x3 area"
                >
                  SCAN[{exploits.deep_scan}]
                </button>
              )}
              {(exploits.bit_shift || 0) > 0 && (
                <button
                  onClick={useBitShift}
                  className="terminal-btn text-xs py-1 px-2.5"
                  title="Reveals a random safe cell"
                >
                  SHIFT[{exploits.bit_shift}]
                </button>
              )}
              {(exploits.defrag || 0) > 0 && (
                <button
                  onClick={useDefrag}
                  className="terminal-btn text-xs py-1 px-2.5"
                  title="Reveals all hidden zero-value cells"
                >
                  DEFRAG[{exploits.defrag}]
                </button>
              )}
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
