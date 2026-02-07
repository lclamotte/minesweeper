import { useGameStore } from '../store/gameStore'
import { playClick } from '../audio/sounds'
import { SignalWave, NetworkMap } from './AsciiAnim'

export default function NodeComplete() {
  const nodeCompleteData = useGameStore(s => s.nodeCompleteData)
  const proceedToTerminal = useGameStore(s => s.proceedToTerminal)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  if (!nodeCompleteData) return null

  const currentNodeId = useGameStore(s => s.currentNodeId)

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
      <div className="max-w-xl w-full fade-in">
        <div className="border border-[var(--crt-green-dim)] p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <p className="text-[var(--crt-green-dim)] text-sm tracking-[0.3em]">NODE CLEARED</p>
            <p className="text-[var(--crt-green)] glow-strong text-2xl tracking-[0.5em] mt-3 font-bold">
              {nodeName}
            </p>
            <div className="flex justify-center mt-4">
              <NetworkMap activeNode={currentNodeId + 1} className="text-sm text-[var(--crt-green-dim)]" />
            </div>
            <div className="flex justify-center mt-3">
              <SignalWave width={28} speed={100} className="text-[0.7rem] text-[var(--crt-green-dark)]" />
            </div>
          </div>

          {/* Stats */}
          <div className="space-y-4 font-mono text-base">
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
              <span className="text-[var(--crt-amber)] glow-amber font-bold text-lg">+${cacheEarned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--crt-green-dim)]">ENTROPY HARVESTED</span>
              <span className="text-[var(--crt-cyan)] text-lg">+{entropyEarned}</span>
            </div>
            {perfectClear && (
              <div className="flex justify-between">
                <span className="text-[var(--crt-green-dim)]">PERFECT CLEAR BONUS</span>
                <span className="text-[var(--crt-green)] glow text-lg">+{firewallBonus} FIREWALL</span>
              </div>
            )}
          </div>

          {/* Action */}
          <div className="mt-10 text-center">
            <button onClick={handleProceed} className="terminal-btn text-base px-10 py-3">
              {hasNextNode ? '[ ACCESS TERMINAL ]' : '[ ROOT ACCESS ACHIEVED ]'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
