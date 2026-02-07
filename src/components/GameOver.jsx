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
      <div className="max-w-lg w-full text-center fade-in">
        <pre className="text-[var(--crt-red)] glow-red text-base leading-tight mb-6">{SKULL}</pre>

        <h1 className="text-3xl text-[var(--crt-red)] glow-red tracking-[0.5em] font-bold">
          SYSTEM CRASH
        </h1>
        <p className="text-[var(--crt-red)] text-sm mt-3 opacity-70 tracking-[0.3em]">
          ALL FIREWALLS BREACHED // CONNECTION LOST
        </p>

        <div className="border border-[var(--crt-red)] border-opacity-30 p-5 mt-8 space-y-3 text-base">
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

        <button onClick={handleRestart} className="terminal-btn-red terminal-btn text-base mt-10 px-10 py-3">
          [ REBOOT SYSTEM ]
        </button>
      </div>
    </div>
  )
}
