import { useGameStore } from '../store/gameStore'
import { playClick } from '../audio/sounds'

const TROPHY = `
       ___________
      '._==_==_=_.'
      .-\\:      /-.
     | (|:.     |) |
      '-|:.     |-'
        \\::.    /
         '::. .'
           ) (
         _.' '._
        '-------'`

export default function WinScreen() {
  const totalCacheEarned = useGameStore(s => s.totalCacheEarned)
  const entropy = useGameStore(s => s.entropy)
  const startNewRun = useGameStore(s => s.startNewRun)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  const handleRestart = () => {
    if (soundEnabled) playClick()
    startNewRun()
  }

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="max-w-lg w-full text-center fade-in">
        <pre className="text-[var(--crt-amber)] glow-amber text-base leading-tight mb-6">{TROPHY}</pre>

        <h1 className="text-3xl text-[var(--crt-amber)] glow-amber tracking-[0.5em] font-bold">
          ROOT ACCESS
        </h1>
        <p className="text-[var(--crt-amber)] text-base mt-3 opacity-70 tracking-[0.3em]">
          GRANTED
        </p>

        <div className="border border-[var(--crt-amber)] border-opacity-30 p-5 mt-8 space-y-3 text-base">
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">NODES CLEARED</span>
            <span className="text-[var(--crt-green)] glow">7/7</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">TOTAL CACHE</span>
            <span className="text-[var(--crt-amber)] glow-amber">${totalCacheEarned}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--crt-green-dim)]">ENTROPY</span>
            <span className="text-[var(--crt-cyan)]">{entropy}</span>
          </div>
        </div>

        <div className="mt-8 p-4 border border-[var(--crt-green-dark)]">
          <p className="text-[var(--crt-green)] text-base glow">
            &gt; SYSTEM FULLY COMPROMISED
          </p>
          <p className="text-[var(--crt-green-dim)] text-sm mt-2">
            ALL NODES BREACHED. YOU HAVE ACHIEVED ROOT ACCESS.
          </p>
        </div>

        <button onClick={handleRestart} className="terminal-btn-amber terminal-btn text-base mt-10 px-10 py-3">
          [ NEW INFILTRATION ]
        </button>
      </div>
    </div>
  )
}
