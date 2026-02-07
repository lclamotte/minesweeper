import { useGameStore } from '../store/gameStore'
import { playClick } from '../audio/sounds'

const ASCII_TITLE = `
 ██████╗  ██████╗  ██████╗ ████████╗
 ██╔══██╗██╔═══██╗██╔═══██╗╚══██╔══╝
 ██████╔╝██║   ██║██║   ██║   ██║
 ██╔══██╗██║   ██║██║   ██║   ██║
 ██║  ██║╚██████╔╝╚██████╔╝   ██║
 ╚═╝  ╚═╝ ╚═════╝  ╚═════╝    ╚═╝
 ███████╗██╗    ██╗███████╗███████╗██████╗
 ██╔════╝██║    ██║██╔════╝██╔════╝██╔══██╗
 ███████╗██║ █╗ ██║█████╗  █████╗  ██████╔╝
 ╚════██║██║███╗██║██╔══╝  ██╔══╝  ██╔═══╝
 ███████║╚███╔███╔╝███████╗███████╗██║
 ╚══════╝ ╚══╝╚══╝ ╚══════╝╚══════╝╚═╝`

export default function TitleScreen() {
  const startNewRun = useGameStore(s => s.startNewRun)
  const soundEnabled = useGameStore(s => s.soundEnabled)
  const toggleSound = useGameStore(s => s.toggleSound)

  const handleStart = () => {
    if (soundEnabled) playClick()
    startNewRun()
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-8 p-8">
      <pre className="text-[var(--crt-green)] glow-strong text-[10px] sm:text-xs leading-none select-none whitespace-pre">
        {ASCII_TITLE}
      </pre>

      <div className="text-center space-y-2">
        <p className="text-[var(--crt-green-dim)] text-xs tracking-[0.3em] uppercase">
          Logic-Puzzle Roguelike // v0.1
        </p>
        <p className="text-[var(--crt-amber)] text-xs tracking-widest glow-amber">
          &gt;&gt; ROOT ACCESS REQUIRED &lt;&lt;
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 mt-4">
        <button
          onClick={handleStart}
          className="terminal-btn text-sm tracking-[0.4em] px-10 py-3"
        >
          [ INFILTRATE ]
        </button>

        <button
          onClick={toggleSound}
          className="terminal-btn text-xs opacity-60 hover:opacity-100"
        >
          AUDIO: {soundEnabled ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="text-[var(--crt-green-dark)] text-[10px] mt-8 text-center leading-loose tracking-wider">
        <p>CLEAR THE GRID. AVOID THE MINES. REACH ROOT ACCESS.</p>
      </div>
    </div>
  )
}
