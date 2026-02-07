import { useGameStore } from '../store/gameStore'
import { getNode } from '../engine/nodes'
import { playClick } from '../audio/sounds'

const SKULL = `
    ╔═══════════╗
    ║  ██   ██  ║
    ║  ██   ██  ║
    ║     ▄     ║
    ║  ▀▀▀▀▀▀▀  ║
    ╚═══════════╝`

export default function GameOver() {
  const currentNodeId = useGameStore(s => s.currentNodeId)
  const totalCacheEarned = useGameStore(s => s.totalCacheEarned)
  const entropy = useGameStore(s => s.entropy)
  const startNewRun = useGameStore(s => s.startNewRun)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  const node = getNode(currentNodeId)

  const handleRestart = () => {
    if (soundEnabled) playClick()
    startNewRun()
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="max-w-md w-full text-center fade-in">
        <pre className="text-[var(--crt-red)] glow-red text-xs leading-none mb-4">{SKULL}</pre>

        <h1 className="text-2xl text-[var(--crt-red)] glow-red tracking-[0.5em] font-bold">
          SYSTEM CRASH
        </h1>
        <p className="text-[var(--crt-red)] text-xs mt-2 opacity-70 tracking-[0.3em]">
          ALL FIREWALLS BREACHED // CONNECTION LOST
        </p>

        <div className="border border-[var(--crt-red)] border-opacity-30 p-4 mt-6 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">LAST NODE</span>
            <span className="text-[var(--crt-green)]">{node.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">DEPTH REACHED</span>
            <span className="text-[var(--crt-green)]">NODE {currentNodeId}/7</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">TOTAL CACHE</span>
            <span className="text-[var(--crt-amber)]">${totalCacheEarned}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">ENTROPY</span>
            <span className="text-[var(--crt-cyan)]">{entropy}</span>
          </div>
        </div>

        <button onClick={handleRestart} className="terminal-btn-red terminal-btn mt-8 px-8 py-2">
          [ REBOOT SYSTEM ]
        </button>
      </div>
    </div>
  )
}
