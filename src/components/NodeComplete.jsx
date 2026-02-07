import { useGameStore } from '../store/gameStore'
import { playClick } from '../audio/sounds'

export default function NodeComplete() {
  const nodeCompleteData = useGameStore(s => s.nodeCompleteData)
  const proceedToTerminal = useGameStore(s => s.proceedToTerminal)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  if (!nodeCompleteData) return null

  const {
    nodeName, elapsed, parTime, underPar,
    cacheEarned, entropyEarned, perfectClear, firewallBonus, hasNextNode,
  } = nodeCompleteData

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  const handleProceed = () => {
    if (soundEnabled) playClick()
    proceedToTerminal()
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full fade-in">
        <div className="border border-[var(--crt-green-dim)] p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <p className="text-[var(--crt-green-dim)] text-xs tracking-[0.3em]">NODE CLEARED</p>
            <p className="text-[var(--crt-green)] glow-strong text-xl tracking-[0.5em] mt-2 font-bold">
              {nodeName}
            </p>
            <div className="w-full h-px bg-[var(--crt-green-dark)] mt-4" />
          </div>

          {/* Stats */}
          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-[var(--crt-green-dim)]">TIME ELAPSED</span>
              <span className="text-[var(--crt-green)]">{formatTime(elapsed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--crt-green-dim)]">PAR TIME</span>
              <span className={underPar ? 'text-[var(--crt-amber)] glow-amber' : 'text-[var(--crt-green-dim)]'}>
                {formatTime(parTime)} {underPar ? '// UNDER PAR' : ''}
              </span>
            </div>
            <div className="w-full h-px bg-[var(--crt-green-dark)]" />
            <div className="flex justify-between">
              <span className="text-[var(--crt-green-dim)]">CACHE EARNED</span>
              <span className="text-[var(--crt-amber)] glow-amber font-bold">+${cacheEarned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--crt-green-dim)]">ENTROPY HARVESTED</span>
              <span className="text-[var(--crt-cyan)]">+{entropyEarned}</span>
            </div>
            {perfectClear && (
              <div className="flex justify-between">
                <span className="text-[var(--crt-green-dim)]">PERFECT CLEAR BONUS</span>
                <span className="text-[var(--crt-green)] glow">+{firewallBonus} FIREWALL</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mt-8 text-center">
            <button onClick={handleProceed} className="terminal-btn px-8 py-2">
              {hasNextNode ? '[ ACCESS TERMINAL ]' : '[ ROOT ACCESS ACHIEVED ]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
