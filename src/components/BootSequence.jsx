import { useState, useEffect } from 'react'
import { useGameStore, GAME_PHASE } from '../store/gameStore'
import { playBoot } from '../audio/sounds'

const BOOT_LINES = [
  { text: 'BIOS v3.7.1 ... OK', delay: 0 },
  { text: 'MEMORY TEST: 65536K ... PASS', delay: 200 },
  { text: 'LOADING KERNEL MODULES ...', delay: 500 },
  { text: '  ├─ mine_detect.ko ... loaded', delay: 700 },
  { text: '  ├─ grid_render.ko ... loaded', delay: 850 },
  { text: '  ├─ firewall.ko ... loaded', delay: 1000 },
  { text: '  └─ entropy_gen.ko ... loaded', delay: 1150 },
  { text: 'INITIALIZING NEURAL INTERFACE ...', delay: 1400 },
  { text: 'CONNECTING TO DARKNET NODE ... ESTABLISHED', delay: 1800 },
  { text: '', delay: 2100 },
  { text: '╔══════════════════════════════════════════╗', delay: 2200 },
  { text: '║                                          ║', delay: 2250 },
  { text: '║          R O O T S W E E P               ║', delay: 2300 },
  { text: '║          ═════════════════                ║', delay: 2350 },
  { text: '║                                          ║', delay: 2400 },
  { text: '║    >> ROOT ACCESS REQUIRED <<             ║', delay: 2500 },
  { text: '║                                          ║', delay: 2550 },
  { text: '╚══════════════════════════════════════════╝', delay: 2600 },
  { text: '', delay: 2800 },
  { text: 'SYSTEM READY. PRESS ANY KEY TO INFILTRATE.', delay: 3000 },
]

export default function BootSequence() {
  const [visibleLines, setVisibleLines] = useState([])
  const [ready, setReady] = useState(false)
  const setPhase = useGameStore(s => s.setPhase)
  const soundEnabled = useGameStore(s => s.soundEnabled)

  useEffect(() => {
    if (soundEnabled) playBoot()

    const timeouts = BOOT_LINES.map((line, i) =>
      setTimeout(() => {
        setVisibleLines(prev => [...prev, line.text])
        if (i === BOOT_LINES.length - 1) {
          setReady(true)
        }
      }, line.delay)
    )

    return () => {
      timeouts.forEach(clearTimeout)
      setVisibleLines([])
      setReady(false)
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    const handler = () => setPhase(GAME_PHASE.TITLE)
    window.addEventListener('keydown', handler)
    window.addEventListener('click', handler)
    return () => {
      window.removeEventListener('keydown', handler)
      window.removeEventListener('click', handler)
    }
  }, [ready, setPhase])

  return (
    <div className="w-full h-full flex items-center justify-center p-8">
      <div className="max-w-2xl w-full font-mono text-base leading-relaxed">
        {visibleLines.map((line, i) => (
          <div
            key={i}
            className={`${line.includes('ROOTSWEEP') || line.includes('ROOT ACCESS') ? 'text-[var(--crt-green)] glow-strong' : 'text-[var(--crt-green-dim)]'}`}
            style={{ animation: 'boot-text 0.1s ease-out' }}
          >
            {line || '\u00A0'}
          </div>
        ))}
        {ready && (
          <div className="mt-4 text-[var(--crt-green)] glow cursor-blink animate-pulse text-lg">
            {'>'} _
          </div>
        )}
      </div>
    </div>
  )
}
