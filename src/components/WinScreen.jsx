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
      <div className="max-w-md w-full text-center fade-in">
        <pre className="text-[var(--crt-amber)] glow-amber text-xs leading-none mb-4">{TROPHY}</pre>

        <h1 className="text-2xl text-[var(--crt-amber)] glow-amber tracking-[0.5em] font-bold">
          ROOT ACCESS
        </h1>
        <p className="text-[var(--crt-amber)] text-xs mt-2 opacity-70 tracking-[0.3em]">
          GRANTED
        </p>

        <div className="border border-[var(--crt-amber)] border-opacity-30 p-4 mt-6 space-y-2 text-xs">
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

        <div className="mt-6 p-3 border border-[var(--crt-green-dark)]">
          <p className="text-[var(--crt-green)] text-xs glow">
            &gt; SYSTEM FULLY COMPROMISED
          </p>
          <p className="text-[var(--crt-green-dim)] text-[10px] mt-2">
            ALL NODES BREACHED. YOU HAVE ACHIEVED ROOT ACCESS.
          </p>
        </div>

        <button onClick={handleRestart} className="terminal-btn-amber terminal-btn mt-8 px-8 py-2">
          [ NEW INFILTRATION ]
        </button>
      </div>
    </div>
  )
}
